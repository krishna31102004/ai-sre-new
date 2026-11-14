# Glassbox SRE Demo

This is a live demonstration of the read-only investigation path. It uses the
pinned OpenTelemetry Astronomy Shop demo and normally takes under 10 minutes:
roughly five to six minutes for the firing window, then a few seconds for the
investigation and notification. Resolution takes another five to six minutes
after the flag is switched off.

Do not run this on a machine without enough Docker memory for the Astronomy
Shop demo. The benchmark command at the end is the fast alternative when a
live stack is impractical.

## 1. Prepare The Checkout

```bash
cd /path/to/ai-sre-new
git submodule update --init --recursive
source .venv/bin/activate
```

Confirm `.env` has an `OPENAI_API_KEY`. Slack is optional: leave
`SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` blank to print the brief locally, or
provide both values to deliver into the configured Slack channel.

Build the browser dashboard once before starting the API (Node.js 20+):

```bash
cd apps/frontend
npm install
npm run build
cd ../..
```

## 2. Start Infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

docker compose \
  --env-file infra/otel-demo/opentelemetry-demo/.env \
  --env-file infra/otel-demo/opentelemetry-demo/.env.override \
  --env-file infra/otel-demo/glassbox.env \
  -f infra/otel-demo/opentelemetry-demo/compose.yaml \
  -f infra/otel-demo/compose.glassbox.yml \
  up -d
```

Wait for the demo services to settle, then verify the web UIs:

- Astronomy Shop: http://localhost:18080
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Grafana: http://localhost:3000

## 3. Start The Services

In terminal 1:

```bash
cd /path/to/ai-sre-new
source .venv/bin/activate
uvicorn glassbox_sre_api.main:app --host 0.0.0.0 --port 8000
```

In terminal 2:

```bash
cd /path/to/ai-sre-new
source .venv/bin/activate
python -m glassbox_sre_worker.main
```

The API must bind to `0.0.0.0`: Alertmanager runs in Docker and reaches the
host through `host.docker.internal`.

## 4. Browser-Only Incident Walkthrough

After the stack, API, and worker are running, all incident interactions happen
in the browser. Open http://localhost:8000/status.

1. Confirm the API, Worker, Postgres, and Redis indicators are green. The
   worker heartbeat is updated while it is polling; a long-running investigation
   can briefly show stale until the worker returns to its next poll cycle.
2. In **Fault controls**, find `adFailure` and click **Turn on**. The state must
   refresh to `on`; the dashboard reads the current value from flagd rather than
   assuming it changed.
3. Open **Investigations**. After Prometheus observes real frontend 500s and
   Alertmanager delivers the webhook, a new row appears automatically. The
   `OTelDemoAdServiceErrors` alert uses a measured five-minute lookback, so this
   normally takes five to six minutes.
4. Open the new row. Verify the rendered brief, evidence-cited suspect commit,
   matched runbook section, integer impact count, Slack link when configured,
   and LangSmith trace link when tracing is configured.
5. Return to **System status** and click **Turn off** for `adFailure`. Once the
   five-minute lookback drains, the investigation row becomes `resolved` and
   Slack receives the threaded resolution update when Slack is configured.

The dashboard is advisory only: the fault buttons are deliberately limited to
the three supported demo flags and do not perform remediation.

## 5. Terminal Alternative: Trigger A Real Fault

Use this only when the browser dashboard is unavailable. It reads the demo
feature configuration, turns `adFailure` on, and writes the complete config
back through the official feature endpoint.

This reads the demo feature configuration, turns `adFailure` on, and writes the
complete config back through the official feature endpoint.

```bash
python3 - <<'PY'
import json
import urllib.request

read_url = "http://localhost:18080/feature/api/read"
write_url = "http://localhost:18080/feature/api/write"

with urllib.request.urlopen(read_url) as response:
    data = json.load(response)

data["flags"]["adFailure"]["defaultVariant"] = "on"
request = urllib.request.Request(
    write_url,
    data=json.dumps({"data": data}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request) as response:
    print("flag write:", response.status)
PY
```

Confirm real frontend 500s are accumulating in Prometheus with:

```promql
max_over_time(http_server_duration_milliseconds_count{service_name="frontend",http_status_code="500"}[5m])
- min_over_time(http_server_duration_milliseconds_count{service_name="frontend",http_status_code="500"}[5m])
```

After about five to six minutes, `OTelDemoAdServiceErrors` moves from pending to
firing. The worker logs an evidence-cited brief containing the alert service,
suspect commit and confidence, runbook section, and computed integer impact.
With Slack configured, the same content appears in the target incident channel.

## 6. Terminal Alternative: Resolve The Incident

Run the same command with `"off"` in place of `"on"`:

```bash
python3 - <<'PY'
import json
import urllib.request

read_url = "http://localhost:18080/feature/api/read"
write_url = "http://localhost:18080/feature/api/write"

with urllib.request.urlopen(read_url) as response:
    data = json.load(response)

data["flags"]["adFailure"]["defaultVariant"] = "off"
request = urllib.request.Request(
    write_url,
    data=json.dumps({"data": data}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request) as response:
    print("flag write:", response.status)
PY
```

Keep both the API and worker running. Once the five-minute lookback drains,
Alertmanager sends a resolved webhook. The worker posts a threaded Slack
resolution message when Slack is configured and writes a JSON/Markdown
postmortem from persisted event timestamps under `artifacts/postmortems/`.

## 7. Run The Fast Benchmark

This requires neither Docker nor an OpenAI key.

```bash
source .venv/bin/activate
python -m glassbox_sre.run_benchmark --mode replay-fast \
  --repo-root "$PWD" \
  --scenarios-dir scenarios/benchmark \
  --runbook-root runbooks \
  --artifact-root artifacts/evaluations
```

Open the generated `summary.md` path printed by the command. To compare two
runs:

```bash
python -m glassbox_sre.compare_benchmarks \
  artifacts/evaluations/<before-run> \
  artifacts/evaluations/<after-run> \
  --output-dir artifacts/evaluation-comparisons/<comparison-name>
```

To show one scenario in isolation during a live demo, add `--scenario` and
`--verbose`. The deterministic mode is instant and does not call OpenAI; the
model-eval mode makes one real LLM call and prints its reasoning alongside the
ranked candidates, runbook scores, and computed impact.

```bash
# Deterministic baseline (instant, no OpenAI call)
python -m glassbox_sre.run_benchmark --mode replay-fast --scenario frontend-ad-failure-visible-500s --verbose

# Benchmark diff ranking with gpt-6-luna medium (one OpenAI call)
python -m glassbox_sre.run_benchmark --mode model-eval --scenario frontend-ad-failure-visible-500s --verbose
```

Both commands write the usual JSON and Markdown artifacts under
`artifacts/evaluations/`, with `scenario_count: 1` in the generated summary.

## Recorded Luna output

Worker triage uses gpt-6-luna at low reasoning effort; benchmark diff ranking
uses medium effort with strict JSON schema. On this 15-scenario benchmark,
Luna scored 15/15 in 4 of 4 runs (mean p50 4.32 s, p95 6.08 s).

The following values are copied from
`artifacts/evaluations/20261114T225456Z-0906492c/`.
The token line combines the recorded input/output/total values and the
186 reasoning tokens in its summary. This excerpt formats stored values
with current token labels; it is not a fresh execution transcript.

```text
Scenario: frontend-ad-failure-visible-500s
Ground truth commit: 41080eb518884c6aeede13111f8214a7c87db3fb
First ranked commit: 41080eb518884c6aeede13111f8214a7c87db3fb
Commit top-1: PASS
Commit top-3: PASS
Runbook hit: PASS
Impact classification: PASS
Latency: 7167.98 ms
Tokens: input=3344, output=484, reasoning=186, total=3828
```

The current CLI labels candidate scores `pre-rank score=`. These scores come
from deterministic candidate evidence; they are not
model confidence. The benchmark makes one LLM call per scenario, not the full
worker investigation. Triage is separate; this parsed output and usage are
copied from `artifacts/evaluations/triage-luna-low-smoke.txt`:

```json
{
  "alert_status": "firing",
  "alert_names": [
    "OTelDemoAdServiceErrors"
  ],
  "affected_services": [
    "frontend"
  ],
  "severity": "ticket",
  "incident_type": "HTTP 500 errors",
  "summary": "The frontend is returning visible HTTP 500 responses while ad service failures are active."
}
```

```text
input_tokens: 250
output_tokens: 64
total_tokens: 314
reasoning: 0
```

## Troubleshooting

- If the fault flag is on but no ad errors appear, restart `flagd`, wait until it
  is healthy, then restart `ad`. The long-lived ad process can retain a failed
  `flagd` DNS lookup or stale flag subscription.
- If Alertmanager cannot reach the API, verify the API is running on
  `0.0.0.0:8000`, not loopback only.
- If Docker is under memory pressure, use the fast benchmark instead of
  repeatedly restarting the full demo. The live demo is intentionally not a
  lightweight test fixture.
