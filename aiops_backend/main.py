import os
import re
import json
import sqlite3
import datetime
import uuid
from typing import List, Union, Optional
from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import google.generativeai as genai

# Setup database
DATABASE_URL = "sqlite:///./calyx.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()

# SQLAlchemy Models
class RuleDB(Base):
    __tablename__ = "rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String)  # "regex", "threshold"
    pattern = Column(String)
    threshold_count = Column(Integer, default=1)
    threshold_window_seconds = Column(Integer, default=60)
    severity = Column(String, default="INFO")  # INFO, WARNING, CRITICAL
    is_active = Column(Boolean, default=True)

class AlertDB(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String)
    severity = Column(String)
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    log_snippet = Column(Text, nullable=True)
    status = Column(String, default="active")  # active, acknowledged, resolved

class LogEntryDB(Base):
    __tablename__ = "log_entries"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime)
    severity = Column(String)
    message = Column(Text)
    service = Column(String, default="system")
    raw = Column(Text)

class AISettingsDB(Base):
    __tablename__ = "ai_settings"
    id = Column(Integer, primary_key=True, index=True)
    correlation_threshold = Column(Float, default=0.85)
    time_window_minutes = Column(Integer, default=15)
    severity_match = Column(Boolean, default=True)
    enabled = Column(Boolean, default=True)

Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class RuleCreate(BaseModel):
    name: str
    type: str
    pattern: str
    threshold_count: Optional[int] = 1
    threshold_window_seconds: Optional[int] = 60
    severity: Optional[str] = "INFO"

class RuleResponse(BaseModel):
    id: int
    name: str
    type: str
    pattern: str
    threshold_count: int
    threshold_window_seconds: int
    severity: str
    is_active: bool
    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: str
    rule_name: str
    severity: str
    message: str
    timestamp: datetime.datetime
    log_snippet: Optional[str] = None
    status: str
    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    status: str

class AnalyzeRequest(BaseModel):
    logs: str
    prompt: Optional[str] = None

class AISettingsUpdate(BaseModel):
    correlation_threshold: float
    time_window_minutes: int
    severity_match: bool
    enabled: bool

class SignInRequest(BaseModel):
    username: str
    password: str

class SignInResponse(BaseModel):
    accessToken: str
    id: str
    name: str
    email: str
    tenantId: str
    role: str

# Initialize FastAPI app
app = FastAPI(title="Calyx AIOps Backend Engine")

# Enable CORS for Next.js frontend running on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Common log pattern parsing regexes
TIMESTAMP_PATTERNS = [
    (re.compile(r"(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)"), "%Y-%m-%d %H:%M:%S"),
    (re.compile(r"(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})"), "%b %d %H:%M:%S"),
]
SEVERITY_PATTERN = re.compile(r"\b(DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL|FATAL)\b", re.IGNORECASE)

def parse_log_line(line: str) -> dict:
    """Helper to parse a single line of log text into timestamp, severity, message, service"""
    line = line.strip()
    if not line:
        return None
    
    # Try parsing JSON first
    try:
        data = json.loads(line)
        msg = data.get("message") or data.get("msg") or str(data)
        sev = str(data.get("severity") or data.get("level") or "INFO").upper()
        ts_str = data.get("timestamp") or data.get("time") or data.get("ts")
        
        ts = datetime.datetime.utcnow()
        if ts_str:
            for regex, fmt in TIMESTAMP_PATTERNS:
                m = regex.search(str(ts_str))
                if m:
                    try:
                        parsed_dt = datetime.datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))
                        ts = parsed_dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
                        break
                    except ValueError:
                        pass
        
        return {
            "timestamp": ts,
            "severity": sev,
            "message": msg,
            "service": data.get("service") or "json-logger",
            "raw": line
        }
    except json.JSONDecodeError:
        pass

    # Standard text parsing
    ts = datetime.datetime.utcnow()
    for regex, fmt in TIMESTAMP_PATTERNS:
        match = regex.search(line)
        if match:
            try:
                # Handle Syslog/Standard formats
                ts_str = match.group(1)
                if fmt == "%b %d %H:%M:%S":
                    current_year = datetime.datetime.utcnow().year
                    parsed_ts = datetime.datetime.strptime(f"{current_year} {ts_str}", f"%Y {fmt}")
                    ts = parsed_ts
                else:
                    # Clean up iso format
                    ts_str_clean = ts_str.replace("T", " ").split(".")[0].replace("Z", "")
                    ts = datetime.datetime.strptime(ts_str_clean[:19], "%Y-%m-%d %H:%M:%S")
                break
            except Exception:
                pass

    # Extract Severity
    sev_match = SEVERITY_PATTERN.search(line)
    severity = sev_match.group(1).upper() if sev_match else "INFO"
    if severity == "WARN":
        severity = "WARNING"

    # Extract Service name or classify
    service = "system"
    service_match = re.search(r"([a-zA-Z0-9_\-\.]+)(?:\[\d+\])?:", line)
    if service_match:
        service = service_match.group(1)

    # Message is the log line
    message = line
    
    return {
        "timestamp": ts,
        "severity": severity,
        "message": message,
        "service": service,
        "raw": line
    }
def fetch_keep_alerts() -> list:
    return []

def update_keep_alert_status(alert_id: str, status: str) -> Optional[dict]:
    return None


# API Endpoints

@app.get("/health")
def health_check():
    return {"status": "ok", "engine": "Calyx AIOps Engine"}

@app.post("/signin", response_model=SignInResponse)
def sign_in(payload: SignInRequest):
    admin_user = os.getenv("CALYX_ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("CALYX_ADMIN_PASSWORD", "admin")
    
    if payload.username == admin_user and payload.password == admin_pass:
        return {
            "accessToken": "calyx-standalone-access-token-123456",
            "id": "calyx-admin-id",
            "name": "Calyx Administrator",
            "email": "admin@calyx.local",
            "tenantId": "calyx",
            "role": "admin"
        }
    raise HTTPException(status_code=401, detail="Invalid username or password")

# 1. Rules endpoints
@app.get("/api/rules", response_model=List[RuleResponse])
def get_rules():
    db = SessionLocal()
    try:
        return db.query(RuleDB).all()
    finally:
        db.close()

@app.post("/api/rules", response_model=RuleResponse)
def create_rule(rule: RuleCreate):
    db = SessionLocal()
    try:
        existing = db.query(RuleDB).filter(RuleDB.name == rule.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Rule name already exists")
        db_rule = RuleDB(**rule.dict())
        db.add(db_rule)
        db.commit()
        db.refresh(db_rule)
        return db_rule
    finally:
        db.close()

@app.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: int):
    db = SessionLocal()
    try:
        db_rule = db.query(RuleDB).filter(RuleDB.id == rule_id).first()
        if not db_rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        db.delete(db_rule)
        db.commit()
        return {"status": "success", "message": f"Rule {rule_id} deleted"}
    finally:
        db.close()

# 2. Alerts endpoints
@app.get("/api/alerts", response_model=List[AlertResponse])
def get_alerts():
    db = SessionLocal()
    try:
        local_alerts = db.query(AlertDB).order_by(AlertDB.timestamp.desc()).all()
        results = []
        for alert in local_alerts:
            results.append({
                "id": str(alert.id),
                "rule_name": alert.rule_name,
                "severity": alert.severity,
                "message": alert.message,
                "timestamp": alert.timestamp,
                "log_snippet": alert.log_snippet,
                "status": alert.status
            })
        
        keep_alerts = fetch_keep_alerts()
        results.extend(keep_alerts)
        results.sort(key=lambda x: x["timestamp"], reverse=True)
        return results
    finally:
        db.close()

@app.put("/api/alerts/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: str, payload: AlertUpdate):
    db = SessionLocal()
    try:
        if alert_id.isdigit():
            alert = db.query(AlertDB).filter(AlertDB.id == int(alert_id)).first()
            if not alert:
                raise HTTPException(status_code=404, detail="Alert not found")
            alert.status = payload.status
            db.commit()
            db.refresh(alert)
            return alert
        else:
            updated_alert = update_keep_alert_status(alert_id, payload.status)
            if updated_alert:
                return updated_alert
            raise HTTPException(status_code=404, detail="Alert not found in Keep database")
    finally:
        db.close()

@app.delete("/api/alerts")
def clear_all_alerts():
    db = SessionLocal()
    try:
        db.query(AlertDB).delete()
        db.commit()
        return {"status": "success", "message": "All alerts cleared"}
    finally:
        db.close()

# 3. Log query endpoint
@app.get("/api/logs")
def get_logs(limit: int = 100):
    db = SessionLocal()
    try:
        logs = db.query(LogEntryDB).order_by(LogEntryDB.timestamp.desc()).limit(limit).all()
        return logs
    finally:
        db.close()

@app.delete("/api/logs")
def clear_all_logs():
    db = SessionLocal()
    try:
        db.query(LogEntryDB).delete()
        db.commit()
        return {"status": "success", "message": "All ingested logs cleared"}
    finally:
        db.close()

# 4. Upload & Parse & Rule Engine
@app.post("/api/upload")
async def upload_log_file(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode("utf-8")
    lines = text.splitlines()

    db = SessionLocal()
    try:
        # Load active rules
        active_rules = db.query(RuleDB).filter(RuleDB.is_active == True).all()

        parsed_entries = []
        alerts_triggered = 0

        # Step 1: Parse lines
        for line in lines:
            parsed = parse_log_line(line)
            if parsed:
                log_entry = LogEntryDB(
                    timestamp=parsed["timestamp"],
                    severity=parsed["severity"],
                    message=parsed["message"],
                    service=parsed["service"],
                    raw=parsed["raw"]
                )
                db.add(log_entry)
                parsed_entries.append(parsed)

        db.commit()

        # Step 2: Run Custom Rule Engine on new logs
        if parsed_entries:
            # Sort by timestamp for threshold check
            parsed_entries.sort(key=lambda x: x["timestamp"])

            for rule in active_rules:
                if rule.type == "regex":
                    try:
                        pattern_re = re.compile(rule.pattern, re.IGNORECASE)
                    except re.error:
                        continue
                    for entry in parsed_entries:
                        if pattern_re.search(entry["message"]):
                            new_alert = AlertDB(
                                rule_name=rule.name,
                                severity=rule.severity,
                                message=f"Pattern '{rule.pattern}' matched log message: {entry['message'][:120]}...",
                                timestamp=entry["timestamp"],
                                log_snippet=entry["raw"],
                                status="active"
                            )
                            db.add(new_alert)
                            alerts_triggered += 1

                elif rule.type == "threshold":
                    try:
                        pattern_re = re.compile(rule.pattern, re.IGNORECASE)
                    except re.error:
                        continue
                    matching_entries = [e for e in parsed_entries if pattern_re.search(e["message"])]
                    
                    # Sliding window check
                    window_sec = rule.threshold_window_seconds
                    limit_count = rule.threshold_count

                    i = 0
                    while i < len(matching_entries):
                        current_entry = matching_entries[i]
                        window_start = current_entry["timestamp"]
                        window_end = window_start + datetime.timedelta(seconds=window_sec)
                        
                        # Count matching items in this window
                        j = i
                        count_in_window = 0
                        snippet_items = []
                        while j < len(matching_entries) and matching_entries[j]["timestamp"] <= window_end:
                            count_in_window += 1
                            snippet_items.append(matching_entries[j]["raw"])
                            j += 1
                        
                        if count_in_window >= limit_count:
                            # Trigger alert
                            snippet_text = "\n".join(snippet_items[:10])
                            new_alert = AlertDB(
                                rule_name=rule.name,
                                severity=rule.severity,
                                message=f"Threshold exceeded! Found {count_in_window} logs matching '{rule.pattern}' within a {window_sec}s window (limit: {limit_count}).",
                                timestamp=window_start,
                                log_snippet=snippet_text,
                                status="active"
                            )
                            db.add(new_alert)
                            alerts_triggered += 1
                            i = j  # Jump past this window to avoid duplicate alerts for the same block
                        else:
                            i += 1

            db.commit()

        return {
            "status": "success",
            "lines_processed": len(lines),
            "lines_ingested": len(parsed_entries),
            "alerts_triggered": alerts_triggered
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Log processing failed: {str(e)}")
    finally:
        db.close()

# 5. Gemini AI Log Analysis endpoint
@app.post("/api/analyze")
async def analyze_logs(payload: AnalyzeRequest, authorization: Optional[str] = Header(None)):
    # Retrieve key from Authorization header or direct x-gemini-key header
    api_key = authorization
    if api_key and api_key.startswith("Bearer "):
        api_key = api_key.replace("Bearer ", "")

    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required. Please set it in the Settings panel.")

    custom_prompt = payload.prompt or (
        "Identify the primary error, outline the probable root cause, "
        "and suggest step-by-step remediation commands/troubleshooting instructions."
    )

    prompt = (
        "You are a professional Calyx system engineer and senior site reliability engineer. "
        "Analyze the following log segment for critical events, system health issues, or errors.\n\n"
        f"LOG SEGMENT:\n{payload.logs}\n\n"
        f"INSTRUCTION: {custom_prompt}\n\n"
        "Respond in a clean Markdown format with structured sections: "
        "### 🔍 Issue Summary, ### 💡 Root Cause Analysis, ### 🛠️ Recommended Remediation."
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return {
            "status": "success",
            "analysis": response.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# 6. AI Correlation endpoints
@app.get("/api/ai/correlation/settings")
def get_ai_correlation_settings():
    db = SessionLocal()
    try:
        settings = db.query(AISettingsDB).first()
        if not settings:
            settings = AISettingsDB(
                correlation_threshold=0.85,
                time_window_minutes=15,
                severity_match=True,
                enabled=True
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return {
            "correlation_threshold": settings.correlation_threshold,
            "time_window_minutes": settings.time_window_minutes,
            "severity_match": settings.severity_match,
            "enabled": settings.enabled
        }
    finally:
        db.close()

@app.post("/api/ai/correlation/settings")
def save_ai_correlation_settings(payload: AISettingsUpdate):
    db = SessionLocal()
    try:
        settings = db.query(AISettingsDB).first()
        if not settings:
            settings = AISettingsDB()
            db.add(settings)
        settings.correlation_threshold = payload.correlation_threshold
        settings.time_window_minutes = payload.time_window_minutes
        settings.severity_match = payload.severity_match
        settings.enabled = payload.enabled
        db.commit()
        return {"status": "success", "message": "AI settings updated successfully"}
    finally:
        db.close()

@app.post("/api/ai/correlation/run")
async def run_ai_correlation(authorization: Optional[str] = Header(None)):
    api_key = authorization
    if api_key and api_key.startswith("Bearer "):
        api_key = api_key.replace("Bearer ", "")

    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is required. Please set it in the Settings panel.")

    db = SessionLocal()
    try:
        # Fetch recent local alerts
        local_alerts = db.query(AlertDB).order_by(AlertDB.timestamp.desc()).limit(100).all()
        alerts_list = []
        for alert in local_alerts:
            alerts_list.append({
                "id": str(alert.id),
                "source": "Calyx AIOps Engine",
                "rule_name": alert.rule_name,
                "severity": alert.severity,
                "message": alert.message,
                "timestamp": alert.timestamp.isoformat()
            })
            
        # Fetch recent Keep alerts if available
        keep_alerts = fetch_keep_alerts()
        for alert in keep_alerts:
            alerts_list.append({
                "id": str(alert["id"]),
                "source": f"Live: {alert['rule_name']}",
                "rule_name": alert["rule_name"],
                "severity": alert["severity"],
                "message": alert["message"],
                "timestamp": alert["timestamp"].isoformat()
            })
            
        if not alerts_list:
            return {"status": "success", "incidents": []}

        # Get settings
        settings = db.query(AISettingsDB).first()
        threshold = settings.correlation_threshold if settings else 0.85
        window = settings.time_window_minutes if settings else 15
        
        alerts_json = json.dumps(alerts_list, indent=2)
        prompt = (
            "You are an expert Calyx correlation engine. Analyze the following list of active alerts "
            "and correlate them into logical 'incidents' or 'clusters' based on their messages, services, and timestamps. "
            f"Only group alerts that occur within {window} minutes of each other and have a correlation strength greater than {threshold * 100}%.\n\n"
            f"ALERTS DATA:\n{alerts_json}\n\n"
            "Return a JSON object containing a list of correlated incidents. "
            "Each incident in the list must have the following format exactly:\n"
            "{\n"
            "  \"incident_name\": \"A short descriptive name of the clustered event (e.g. database pool exhaustion)\",\n"
            "  \"correlated_alerts_ids\": [\"list of strings of the alert IDs that are part of this incident\"],\n"
            "  \"root_cause\": \"Detailed description of why these alerts are correlated and what the root cause is\",\n"
            "  \"confidence_score\": 0.95,\n"
            "  \"remediation\": \"Recommended remediation steps to fix the issue\"\n"
            "}\n\n"
            "If some alerts are unrelated noise and do not cluster with any others, do not include them in any incident. "
            "Respond ONLY with the raw JSON string containing the 'incidents' array, without any markdown formatting block."
        )
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif response_text.startswith("```"):
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        try:
            incidents_data = json.loads(response_text)
            return {"status": "success", "incidents": incidents_data.get("incidents", [])}
        except json.JSONDecodeError:
            return {
                "status": "partial_success",
                "raw_analysis": response_text,
                "incidents": []
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI correlation engine failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
