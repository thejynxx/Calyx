"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RiSparkling2Line,
  RiSettings3Line,
  RiCloseCircleLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiTimeLine,
  RiTrophyLine,
  RiPlayLine,
  RiRefreshLine,
} from "react-icons/ri";

interface Incident {
  incident_name: string;
  correlated_alerts_ids: string[];
  root_cause: string;
  confidence_score: number;
  remediation: string;
}

interface Alert {
  id: string;
  rule_name: string;
  severity: string;
  message: string;
  timestamp: string;
  status: string;
  log_snippet?: string;
}

export default function AICorrelationPage() {
  // Settings State
  const [threshold, setThreshold] = useState<number>(0.85);
  const [windowMin, setWindowMin] = useState<number>(15);
  const [severityMatch, setSeverityMatch] = useState<boolean>(true);
  const [enabled, setEnabled] = useState<boolean>(true);
  
  // UI State
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [settingsStatus, setSettingsStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [scanStatus, setScanStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  
  // Data State
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expandedIncident, setExpandedIncident] = useState<number | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Fetch Settings and Alerts
  const fetchData = async () => {
    try {
      // 1. Fetch AI settings
      const settingsRes = await fetch("http://localhost:8080/api/ai/correlation/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setThreshold(settingsData.correlation_threshold);
        setWindowMin(settingsData.time_window_minutes);
        setSeverityMatch(settingsData.severity_match);
        setEnabled(settingsData.enabled);
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }

      // 2. Fetch Alerts
      const alertsRes = await fetch("http://localhost:8080/api/alerts");
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (e) {
      setBackendOnline(false);
      // Fallback alerts for demonstration
      setAlerts([
        {
          id: "1",
          rule_name: "PostgreSQL Connection Failures",
          severity: "CRITICAL",
          message: "connection refused at pg_connect(): postgresql://postgres:***@db:5432/main",
          timestamp: new Date().toISOString(),
          status: "active"
        },
        {
          id: "2",
          rule_name: "API Gateway HTTP 504",
          severity: "WARNING",
          message: "Slow request gateway: GET /api/v1/users (timed out after 5000ms)",
          timestamp: new Date(Date.now() - 30000).toISOString(),
          status: "active"
        },
        {
          id: "3",
          rule_name: "Auth Service failure",
          severity: "CRITICAL",
          message: "Internal auth endpoint failed: LDAP Server down",
          timestamp: new Date(Date.now() - 60000).toISOString(),
          status: "active"
        }
      ]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatus(null);
    try {
      const res = await fetch("http://localhost:8080/api/ai/correlation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correlation_threshold: threshold,
          time_window_minutes: windowMin,
          severity_match: severityMatch,
          enabled: enabled,
        })
      });
      if (res.ok) {
        setSettingsStatus({ type: "success", msg: "AI settings saved successfully to backend." });
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      setSettingsStatus({ type: "error", msg: "Could not save settings. Offline mode used." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Run AI Correlation Scanner
  const runScanner = async () => {
    setIsScanning(true);
    setScanStatus(null);
    setIncidents([]);
    setExpandedIncident(null);

    const apiKey = localStorage.getItem("aiops-gemini-key") || "";
    if (!apiKey) {
      setScanStatus({
        type: "error",
        msg: "Gemini API Key is missing. Please set it in the Settings panel first."
      });
      setIsScanning(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/ai/correlation/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Scanner request failed.");
      }

      const data = await res.json();
      if (data.status === "success" || data.status === "partial_success") {
        setIncidents(data.incidents || []);
        if (data.incidents && data.incidents.length > 0) {
          setExpandedIncident(0); // auto-expand first incident
          setScanStatus({
            type: "success",
            msg: `AI Scanner completed! Found ${data.incidents.length} correlated incident group(s).`
          });
        } else {
          setScanStatus({
            type: "success",
            msg: "AI Scanner completed. No correlated incidents identified in the current alert set."
          });
        }
      }
    } catch (e: any) {
      // Fallback mockup correlation scan if backend offline or error
      setScanStatus({
        type: "error",
        msg: e.message || "Failed to query the AI scanner endpoint."
      });
      
      // Mock correlation for demo purposes
      if (alerts.length > 0) {
        setTimeout(() => {
          setIncidents([
            {
              incident_name: "Database Refusal and Gateway Timeout Cascade",
              correlated_alerts_ids: ["1", "2"],
              root_cause: "The PostgreSQL connection pool was exhausted, preventing the database from responding to connection requests. This directly cascaded to the API Gateway failing to get user details, resulting in HTTP 504 timeouts.",
              confidence_score: 0.94,
              remediation: "Scale postgresql max connection parameters or restart db containers. Add connection pool circuit breakers to gateway."
            }
          ]);
          setExpandedIncident(0);
        }, 1500);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-900 dark:text-gray-100 font-sans">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent flex items-center space-x-2">
          <RiSparkling2Line className="h-8 w-8 text-orange-500 animate-pulse" />
          <span>Calyx AI Correlation Center</span>
        </h1>
        <p className="text-gray-500 mt-1">
          Automatically cluster disjointed alarm feeds into unified incidents using configured thresholds and Gemini AI models.
        </p>
      </div>

      {backendOnline === false && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start space-x-3">
          <RiAlertLine className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800">Calyx Backend Offline</h3>
            <p className="text-amber-700 text-sm">
              The custom backend engine is offline. AI scanner will operate in client-side fallback demonstration mode.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Settings Panel (Left 1/3) */}
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-gray-100 dark:border-stone-850 pb-3">
            <RiSettings3Line className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">Correlation Configuration</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 text-sm">
            {settingsStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start space-x-2 border ${
                  settingsStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                    : "bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                }`}
              >
                {settingsStatus.type === "success" ? (
                  <RiCheckboxCircleLine className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <RiCloseCircleLine className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <span>{settingsStatus.msg}</span>
              </div>
            )}

            {/* Threshold Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Similarity Threshold
                </label>
                <span className="font-mono text-sm text-orange-500 font-bold">
                  {(threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.99"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-orange-500 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                The minimum confidence value required for AI to join alerts into the same incident.
              </p>
            </div>

            {/* Time Window Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Time Window Limit
                </label>
                <span className="font-mono text-sm text-orange-500 font-bold flex items-center space-x-0.5">
                  <RiTimeLine className="h-3.5 w-3.5" />
                  <span>{windowMin}m</span>
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={windowMin}
                onChange={(e) => setWindowMin(parseInt(e.target.value))}
                className="w-full accent-orange-500 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                The maximum time gap allowed between alerts to be considered for correlation clustering.
              </p>
            </div>

            {/* Checkbox settings */}
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-stone-850">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-gray-700 dark:text-gray-300">Match Severity Peaks</p>
                  <p className="text-[10px] text-gray-400">Heuristically match critical alarms together.</p>
                </div>
                <input
                  type="checkbox"
                  checked={severityMatch}
                  onChange={(e) => setSeverityMatch(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-gray-700 dark:text-gray-300">Automatic Execution</p>
                  <p className="text-[10px] text-gray-400">Run clustering correlations on background ingestion.</p>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 h-4 w-4 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <RiRefreshLine className={`h-4 w-4 ${isSavingSettings ? "animate-spin" : ""}`} />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Scanner Panel (Right 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Trigger Card */}
          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Alert Stream Analysis</h2>
              <p className="text-xs text-gray-500 mt-1">
                The scanner will compile all {alerts.length} recent alerts (including local rule alerts and live monitoring feeds) and cluster them via LLM pattern correlation.
              </p>
            </div>
            
            <button
              onClick={runScanner}
              disabled={isScanning || alerts.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <RiPlayLine className="h-5 w-5" />
              <span>{isScanning ? "Clustering..." : "Run AI Correlation"}</span>
            </button>
          </div>

          {/* Status logs */}
          {scanStatus && (
            <div
              className={`p-4 rounded-xl shadow-sm flex items-start space-x-3 text-sm border ${
                scanStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20"
                  : "bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/20"
              }`}
            >
              {scanStatus.type === "success" ? (
                <RiCheckboxCircleLine className="h-5 w-5 text-emerald-500 mt-0.5" />
              ) : (
                <RiAlertLine className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">
                  {scanStatus.type === "success" ? "Analysis Finished" : "Analysis Alert"}
                </p>
                <p className="mt-0.5">{scanStatus.msg}</p>
              </div>
            </div>
          )}

          {/* Incidents Clusters List */}
          {isScanning ? (
            <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-12 rounded-2xl text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
              <RiSparkling2Line className="h-12 w-12 text-orange-500 animate-spin" />
              <div>
                <p className="font-bold text-lg text-gray-700 dark:text-gray-300">AI Clustering in Progress</p>
                <p className="text-xs text-gray-500 mt-1">Comparing timestamps, event patterns, and service metadata to correlate triggers...</p>
              </div>
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 p-16 rounded-2xl text-center text-gray-500 shadow-sm">
              <RiSparkling2Line className="h-12 w-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
              <p className="font-bold text-gray-700 dark:text-gray-300">No Incident Clusters Generated</p>
              <p className="text-xs mt-1">
                Click "Run AI Correlation" above to scan the live alert stream for relationships.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident, idx) => {
                const isExpanded = expandedIncident === idx;
                const scorePercentage = (incident.confidence_score * 100).toFixed(0);
                
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-2xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* Header bar */}
                    <button
                      onClick={() => setExpandedIncident(isExpanded ? null : idx)}
                      className="w-full p-5 flex items-center justify-between text-left font-bold hover:bg-stone-50/50 dark:hover:bg-stone-850/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-xl">
                          <RiTrophyLine className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <h3 className="text-base text-gray-850 dark:text-gray-200 truncate">
                            {incident.incident_name}
                          </h3>
                          <p className="text-xs text-gray-400 font-semibold mt-0.5">
                            {incident.correlated_alerts_ids.length} Correlated Alert(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-500 rounded-full text-xs font-extrabold font-mono">
                          <span>Confidence:</span>
                          <span>{scorePercentage}%</span>
                        </div>
                        {isExpanded ? (
                          <RiArrowDownSLine className="h-5 w-5 text-gray-400" />
                        ) : (
                          <RiArrowRightSLine className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="p-5 border-t border-gray-100 dark:border-stone-850 bg-stone-50/20 dark:bg-stone-950/10 space-y-4 text-sm leading-relaxed">
                        {/* Cause section */}
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-1">
                            💡 Root Cause Analysis
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300">{incident.root_cause}</p>
                        </div>

                        {/* Remediation */}
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-1">
                            🛠️ Recommended Remediation
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 bg-stone-100/50 dark:bg-stone-900/60 p-3 rounded-lg border border-stone-200/50 dark:border-stone-800 font-mono text-xs leading-normal">
                            {incident.remediation}
                          </p>
                        </div>

                        {/* Alerts grouped */}
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">
                            🚨 Clustered Alert Events
                          </h4>
                          <div className="space-y-2">
                            {alerts
                              .filter((a) => incident.correlated_alerts_ids.includes(a.id))
                              .map((alert) => (
                                <div
                                  key={alert.id}
                                  className="p-3 bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-850 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-xs">{alert.rule_name}</span>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          alert.severity === "CRITICAL"
                                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                            : alert.severity === "WARNING"
                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                        }`}
                                      >
                                        {alert.severity}
                                      </span>
                                    </div>
                                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all select-all">
                                      {alert.message}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3 self-end md:self-auto">
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                    <Link
                                      href={`/aiops/analyzer?logs=${encodeURIComponent(alert.log_snippet || alert.message)}`}
                                      className="text-[10px] font-extrabold px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                                    >
                                      Analyze
                                    </Link>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
