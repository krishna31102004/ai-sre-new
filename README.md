# Glassbox SRE

Glassbox SRE is a read-only, evidence-first AI incident investigator for a
controlled microservice environment. It turns a real Prometheus alert into a
traceable incident brief: it correlates the alert with recent deploys and real
Git diffs, retrieves a relevant runbook, calculates impact from telemetry, and
posts the result to Slack. When Alertmanager sends a resolved notification, it
creates a blameless postmortem from the stored event log.

Production incidents are usually fragmented across alerts, dashboards, deploy
history, diffs, runbooks, and chat. The costly work is assembling a defensible
story quickly without pretending that an ungrounded model answer is evidence.
Glassbox SRE is a portfolio-scale implementation of that investigation layer,
built to make every conclusion inspectable.

> **Scope:** Glassbox SRE is advisory only. It never rolls back a deployment,
> changes a feature flag, restarts a service, or applies remediation. It is
> evaluated against the [OpenTelemetry Astronomy Shop demo][otel-demo], not a
> production system.

## What It Does

- Ingests genuine Prometheus Alertmanager webhooks with FastAPI.
- Queues work in Redis so alert acknowledgement is independent of investigation
  latency.
- Runs a LangGraph investigation with parallel commit-correlation, runbook, and
  impact-estimation branches.
- Uses OpenAI only for bounded reasoning tasks; deploy filtering, impact math,
  citations, and severity remain deterministic and inspectable.
- Posts a structured incident brief through a console notifier or Slack Bolt.
- Persists investigations, evidence, event timestamps, runbook embeddings, and
  postmortems in Postgres with pgvector.
- Benchmarks the investigation path against replayable, ground-truth scenarios.

## Architecture

```mermaid
flowchart LR
    Fault["flagd fault\n(OpenTelemetry demo)"] --> Metrics["OpenTelemetry collector\nand Prometheus"]
    Metrics --> AM["Alertmanager"]
    AM --> API["FastAPI\n/webhook/alert"]
    API --> Queue["Redis queue"]
    Queue --> Worker["Worker + LangGraph"]

    Worker --> Triage["Triage\n(OpenAI)"]
    Triage --> Commit["Commit correlation\ndeploy window + Git diff + OpenAI ranking"]
    Triage --> Runbook["Runbook retrieval\ntags + pgvector"]
    Triage --> Impact["Impact estimation\nPrometheus counters + dependency graph"]

    Commit --> Synthesis["Deterministic synthesis\nevidence-cited brief"]
    Runbook --> Synthesis
    Impact --> Synthesis
    Synthesis --> Notify["Notifier\nconsole or Slack Bolt"]
    Notify --> Slack["Slack incident thread"]

    Worker --> DB[("Postgres + pgvector\ninvestigations, events, findings")]
    Commit --> DB
    Runbook --> DB
    Synthesis --> DB
    AM -. "resolved alert" .-> Worker
    Worker --> PM["Grounded postmortem\nJSON + Markdown"]
    PM --> DB
```

The three investigator branches share the same typed alert state and converge
only after each has returned its own evidence. The current graph does not yet
have the planned gate or critic/evaluator node; that is intentionally recorded
as future work rather than presented as implemented capability.

## Benchmark Results

The evaluation corpus contains **15 hardened scenarios**: **1 live-captured**
from the real `adFailure` alert path and **14 synthetic replays** with fixed
telemetry snapshots. Every scenario has a known bad commit, four to six deploy
candidates, and at least one benign same-service or affected-service distractor.
The synthetic replays make runs fast and deterministic; they are not presented
as live production observations.

| Mode | Commit top-1 | Commit top-3 | Runbook hit | Impact class | p50 latency | p95 latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `replay-fast` deterministic heuristic | 13.3% | 66.7% | 100% | 100% | 27 ms | 56 ms |
| `model-eval` with `gpt-4.1-mini` | 86.7% | 100% | 100% | 100% | 6.53 s | 16.97 s |

The important result is not a claim that the model is perfect. The hardened
corpus makes service matching insufficient: the deterministic ranking reaches
only 13.3% top-1, while model-assisted diff reasoning reaches 86.7% (13/15).
The two model top-1 misses are retained in the artifacts and still appear in
the top three candidates. The model-eval run used 44,562 tokens across all
15 scenarios.

This is a deliberately narrower task than [IBM Research's ITBench][itbench],
where reported end-to-end SRE scenario resolution was about 11-14% across a
broader, real-world-style benchmark. Glassbox's 86.7% is **commit top-1 on this
repository's fixed 15-scenario corpus**, not a claim of comparable autonomous
incident resolution. The point of publishing both modes and every miss is to
make that distinction inspectable.

Root-cause precision/recall is intentionally not reported as a separate metric.
In the current design, the actionable root-cause output is the ranked suspect
commit with its evidence; introducing a second label would duplicate commit
ranking or require a distinct evaluator that does not yet exist.

Evaluation outputs are local and intentionally ignored by Git. Generate a new
run and compare it with a baseline before changing prompts, models, or ranking
logic:

```bash
python -m glassbox_sre.run_benchmark --mode replay-fast \
  --repo-root "$PWD" \
  --scenarios-dir scenarios/benchmark \
  --runbook-root runbooks \
  --artifact-root artifacts/evaluations

python -m glassbox_sre.run_benchmark --mode model-eval \
  --repo-root "$PWD" \
  --scenarios-dir scenarios/benchmark \
  --runbook-root runbooks \
  --artifact-root artifacts/evaluations

python -m glassbox_sre.compare_benchmarks \
  artifacts/evaluations/<before-run> \
  artifacts/evaluations/<after-run> \
  --output-dir artifacts/evaluation-comparisons/<comparison-name>
```

`replay-fast` requires no Docker, Postgres, or OpenAI key. `model-eval` makes
one OpenAI commit-ranking call per scenario and therefore requires
`OPENAI_API_KEY`.

## Quick Start

### Prerequisites

- macOS or Linux with `python3` **3.11+**, Git, and Docker Desktop / Docker
  Compose v2.
- An OpenAI API key for the live graph and model-eval benchmark.
- Optional Slack app credentials for real delivery. Without them, the same
  brief is printed by the console notifier.

Use `python3` for all commands outside the virtual environment. The project
uses standard-library `venv`, so no separate Python environment manager is
required.

```bash
git clone --recurse-submodules git@github.com:krishna31102004/ai-sre-new.git
cd ai-sre-new

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade "pip<26"
python -m pip install -e ".[dev]"

cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env` before running the live worker. The bundled
defaults point at the Docker services:

```dotenv
POSTGRES_URL=postgresql+psycopg://glassbox_sre:glassbox_sre@localhost:15432/glassbox_sre
REDIS_URL=redis://localhost:6379/0
```

The root editable install deliberately exposes all three internal packages:
`glassbox_sre`, `glassbox_sre_api`, and `glassbox_sre_worker`.

```bash
python - <<'PY'
import glassbox_sre
import glassbox_sre_api
import glassbox_sre_worker

print("internal packages import successfully")
PY

pytest
```

`pytest` is the fast default suite and does not require Docker or an API key.
Tests marked `@pytest.mark.live` are opt-in because they require live
infrastructure or external credentials.

## Run The Full Demo

The concise, interview-ready walkthrough is [docs/DEMO.md](docs/DEMO.md).
At a high level:

```bash
# Terminal 1: core state
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

# Start the pinned Astronomy Shop demo, Prometheus, Alertmanager, Grafana, and Jaeger.
# The command is kept in infra/README.md because it uses the upstream submodule env files.
```

Then start the API and worker in separate terminals:

```bash
source .venv/bin/activate
uvicorn glassbox_sre_api.main:app --host 0.0.0.0 --port 8000
```

```bash
source .venv/bin/activate
python -m glassbox_sre_worker.main
```

Flip the `adFailure` flag through the demo feature API. Prometheus observes
frontend 500s, Alertmanager posts to the API, and the worker investigates. The
alert uses a measured five-minute lookback, so firing and resolution each take
roughly five to six minutes under normal load. See the exact reproducible
commands and expected output in [docs/DEMO.md](docs/DEMO.md).

## Repository Map

```text
apps/api/                  FastAPI Alertmanager webhook ingestion
apps/worker/               Redis worker and LangGraph investigation
packages/core/             Shared schemas, storage, graph support, evaluation
infra/                     Docker, Prometheus, Alertmanager, OTel demo overlay
infra/otel-demo/...        Pinned external Astronomy Shop git submodule
runbooks/                  Versioned operational Markdown corpus
scenarios/                 Seeded incident and benchmark ground truth
docs/                      Demo and architecture-facing documentation
```

## Evidence And Data Boundaries

Each brief carries evidence from at least one of these sources:

- Alertmanager labels and timestamps.
- Prometheus counters and computed integer request deltas.
- Deployment history and real Git diffs in this repository.
- Tagged, pgvector-ranked runbook sections.
- Persisted investigation-event timestamps.

The LLM can classify alert context and rank pre-filtered diffs. It does not
invent counts, rewrite evidence links, or execute remediation. Generated
postmortems are deterministic from stored event data after an earlier
LLM-generated draft produced unsupported claims.

## Limitations And Next Steps

- The system is demonstrated only against the simulated OTel Astronomy Shop,
  not a production workload.
- The benchmark corpus is deliberately small and mostly synthetic replay; its
  results measure this repository's scenario design, not general SRE accuracy.
- The live alert loop depends on Docker resources and a five-minute alert
  lookback, so it is not designed as a lightweight CI test.
- A critic/evaluator node, retry handling for transient Postgres failures,
  richer LangSmith metadata, and Slack slash commands are planned but not yet
  implemented.

## Development Notes

- Never modify `infra/otel-demo/opentelemetry-demo`; it is a pinned submodule.
- Keep secrets only in `.env`. `.env.example` is the public configuration
  contract.
- Generated `artifacts/` are local evaluation/postmortem outputs, not source
  material. Keep benchmark comparisons reproducible by preserving their paths
  outside commits or exporting them with experiment metadata.
- Read [PROJECT.md](PROJECT.md), [ROADMAP.md](ROADMAP.md), and
  [DECISIONS.md](DECISIONS.md) before changing behavior.

## License

No license has been selected yet. Do not treat this repository as reusable
open-source software until a license is added.

[otel-demo]: https://github.com/open-telemetry/opentelemetry-demo
[itbench]: https://arxiv.org/abs/2502.05352
