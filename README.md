# Glassbox SRE

Read-only, glass-box AI SRE incident investigation agent.

Start with the project memory files before making changes:

1. `PROJECT.md`
2. `ROADMAP.md`
3. `DECISIONS.md`

## Local Python Setup

Use `python3` consistently for local commands and scripts.

```bash
cd /Users/kb4086/dev/ai-new
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade "pip<26"
python -m pip install -e ".[dev]"
cp .env.example .env
```

The project uses the standard-library `venv` module so the setup works anywhere Python 3.11+ is available without requiring a separate package manager. One root editable install covers all internal packages: `glassbox_sre`, `glassbox_sre_api`, and `glassbox_sre_worker`.

Confirm the install:

```bash
python - <<'PY'
import glassbox_sre
import glassbox_sre_api
import glassbox_sre_worker

print(glassbox_sre.__file__)
print(glassbox_sre_api.__file__)
print(glassbox_sre_worker.__file__)
PY
```

## Phase 0 Manual Loop

Start Redis and Postgres:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
```

Start the API:

```bash
cd /Users/kb4086/dev/ai-new
source .venv/bin/activate
uvicorn glassbox_sre_api.main:app --reload --port 8000
```

In another terminal, start the worker:

```bash
cd /Users/kb4086/dev/ai-new
source .venv/bin/activate
python -m glassbox_sre_worker.main
```

Send a fake Alertmanager payload:

```bash
curl -X POST http://localhost:8000/webhook/alert \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "labels": {
          "alertname": "HighErrorRate",
          "service": "checkout"
        },
        "annotations": {
          "summary": "Checkout error rate is above threshold."
        },
        "startsAt": "2026-07-09T12:00:00Z"
      }
    ]
  }'
```

The API should return `{"status":"queued","alerts":1}` and the worker should print a `[stub incident brief]` within a few seconds.
