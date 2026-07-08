# 🌀 Calyx: Standalone AIOps & Log Analyzer

A lightweight, AI-driven log management, event correlation, and alert rule builder.

## Key Features

- 🔍 **Single Pane AIOps Dashboard** - View rules, active alerts, and database statistics in a modern unified workspace.
- 🛠️ **Custom Rule Builder** - Define regex-based pattern matching or threshold-based sliding window rules directly in the UI.
- 🤖 **AI Correlation Center** - Group multiple alerts, identify root causes, and correlate alert sequences using Gemini or OpenAI.
- 📁 **Log Dataset Analyzer** - Drag-and-drop log uploader with JSON/Syslog parser, severity filters, and direct AI Insights.
- 🔐 **Credentials Login Authentication** - Secure NextAuth-backed login portal running database authentication directly connected to the FastAPI backend.
- ⚡ **Offline Fallback Mode** - Runs gracefully in pure browser memory (`localStorage`) if the custom backend is offline, allowing safe preview testing.

---

## Supported AI Backends

Calyx queries AI models directly using API keys you store privately in local browser settings.

| AI Provider | Link |
| :--- | :--- |
| **Gemini** | [Google AI Studio](https://aistudio.google.com/) |
| **OpenAI** | [OpenAI Platform](https://platform.openai.com/) |
| **Anthropic** | [Anthropic](https://www.anthropic.com/) |
| **DeepSeek** | [DeepSeek](https://deepseek.com/) |
| **Ollama** | [Ollama](https://ollama.com/) |
| **Grok** | [x.ai](https://x.ai/) |

---

## Rebranded Connectors & Integrations

Calyx Platform includes native integrations to collect alerts, automate ticketing, and trigger notifications across 80+ tools.

### Observability & Monitoring
* **APM & Metrics:** Datadog, Prometheus, New Relic, Dynatrace, AppDynamics, Grafana, VictoriaMetrics.
* **Logs & Traces:** Grafana Loki, Elasticsearch, OpenSearch, Graylog, Kibana, ClickHouse.
* **Error Tracking:** Sentry, Rollbar, Axiom, Parseable.

### Communication & Notification Channels
* Slack, Microsoft Teams, Google Chat, Discord, Telegram, Twilio, SMTP.

### Ticketing & Incident Management
* Jira, ServiceNow, GitHub Issues, GitLab Issues, Trello, PagerDuty, OpsGenie, Incident.io.

### Infrastructure & Container Orchestration
* Kubernetes, ArgoCD, Flux CD, AKS, GKE, GKE, Bash, Python, Webhooks.

---

## Declarative Calyx Workflows (YAML)

Calyx supports running automated alert correlation, routing, and incident remediation workflows. You can define them as declarative YAML files in your repository.

Here is an example workflow that creates a Jira ticket and routes a Slack message for critical alerts:

```yaml
workflow:
  id: sentry-critical-tickets
  description: Auto-create ticket and notify teams for Sentry critical alerts
  triggers:
    - type: alert
      filters:
        - key: source
          value: sentry
        - key: severity
          value: critical
        # Regex service matching
        - key: service
          value: r"(payments|checkout)"
  actions:
    - name: notify-slack-payments-channel
      if: "'{{ alert.service }}' == 'payments'"
      provider:
        type: slack
        config: "{{ providers.payments-slack }}"
        with:
          message: "Calyx Alert: {{ alert.name }} - {{ alert.description }}"
    - name: create-jira-ticket
      if: "'{{ alert.service }}' == 'checkout' and not '{{ alert.ticket_id }}'"
      provider:
        type: jira
        config: "{{ providers.engineering-jira }}"
        with:
          board_name: "Engineering Support"
          issuetype: "Bug"
          summary: "[Calyx Auto] Sentry Alert: {{ alert.name }}"
          description: "Root Cause Investigation: {{ alert.description }}"
          enrich_alert:
            - key: ticket_id
              value: results.issue.key
            - key: ticket_url
              value: results.ticket_url
```

---

## Getting Started

Calyx is structured into a Python FastAPI backend and a Next.js (React) frontend.

### 1. Run the Python Backend
The backend parses ingested logs, tracks alert rules, and processes sign-in authentication.

```bash
cd aiops_backend
pip install -r requirements.txt
uvicorn main:app --port 8080 --reload
```

### 2. Run the Next.js Frontend
Start the local Next.js client pointing to the backend.

```bash
cd calyx/calyx-ui
npm install
npm run dev
```
Open `http://localhost:3000` to sign in. 
* Default Username: `admin`
* Default Password: `admin`

---

## Deployment

Calyx is cloud-native and serverless-friendly, making it extremely easy to publish:

### Deploying the Frontend (Vercel)
Connect your GitHub repository to Vercel and deploy.
* **Env Variables Required:**
  * `API_URL`: Point to your live FastAPI backend endpoint.
  * `NEXTAUTH_SECRET`: Generate a secure random key (`openssl rand -hex 32`).

### Deploying the Backend (Render/Railway/Fly.io)
Deploy the `aiops_backend` folder as a standard Python Web Service.
* **Env Variables (Optional):**
  * `CALYX_ADMIN_USERNAME`: Customize sign-in username.
  * `CALYX_ADMIN_PASSWORD`: Customize sign-in password.

---

## License
Licensed under the MIT License.
