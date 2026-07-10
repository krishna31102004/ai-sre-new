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

## 4. Trigger A Real Fault

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

## 5. Resolve The Incident

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

## 6. Run The Fast Benchmark

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

## Troubleshooting

- If the fault flag is on but no ad errors appear, restart `flagd`, wait until it
  is healthy, then restart `ad`. The long-lived ad process can retain a failed
  `flagd` DNS lookup or stale flag subscription.
- If Alertmanager cannot reach the API, verify the API is running on
  `0.0.0.0:8000`, not loopback only.
- If Docker is under memory pressure, use the fast benchmark instead of
  repeatedly restarting the full demo. The live demo is intentionally not a
  lightweight test fixture.
