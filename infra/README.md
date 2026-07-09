# Infrastructure

Placeholder for Docker Compose files, Prometheus rules, Alertmanager config, and OpenTelemetry demo wiring.

## Local Core Services

Start Postgres with pgvector and Redis:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
```

Check health:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

Stop services:

```bash
docker compose -f infra/docker/docker-compose.yml down
```

## OpenTelemetry Demo With Alerts

The OpenTelemetry Astronomy Shop demo is tracked as an external git submodule at
`infra/otel-demo/opentelemetry-demo`.

Initialize or update the submodule after a fresh clone:

```bash
git submodule update --init --recursive
```

Start the demo with its observability stack and the Glassbox SRE alert overlay:

```bash
docker compose \
  --env-file infra/otel-demo/.env.demo \
  --env-file infra/otel-demo/opentelemetry-demo/.env.override \
  --env-file infra/otel-demo/.env.glassbox \
  -f infra/otel-demo/opentelemetry-demo/compose.yaml \
  -f infra/otel-demo/compose.glassbox.yml \
  up -d
```

Useful local URLs:

- Astronomy Shop: http://localhost:18080
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Jaeger: http://localhost:16686
- Feature flags: http://localhost:18080/feature

## Phase 0 End-To-End Test

Start the API in one terminal:

```bash
source .venv/bin/activate
uvicorn glassbox_sre_api.main:app --host 127.0.0.1 --port 8000
```

Start the worker in another terminal:

```bash
source .venv/bin/activate
python -m glassbox_sre_worker.main
```

Flip the real OTel demo fault flag:

```bash
python3 - <<'PY'
import json
import urllib.request

read_url = "http://localhost:18080/feature/api/read"
write_url = "http://localhost:18080/feature/api/write"

with urllib.request.urlopen(read_url) as response:
    data = json.load(response)

data["flags"]["adFailure"]["defaultVariant"] = "on"
body = json.dumps({"data": data}).encode()
request = urllib.request.Request(
    write_url,
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)

with urllib.request.urlopen(request) as response:
    print(response.status)
PY
```

Prometheus should fire `OTelDemoAdServiceErrors`, Alertmanager should POST to
`http://host.docker.internal:8000/webhook/alert`, and the worker should print a
stub incident brief for the `ad` service. Reset the flag by changing the
`defaultVariant` above back to `off`.
