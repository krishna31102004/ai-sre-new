# Glassbox SRE

Glassbox SRE is a read-only, evidence-first AI incident investigator for a
controlled microservice environment. It turns a real Prometheus alert into a
traceable incident brief: it correlates the alert with recent deploys and real
Git diffs, retrieves a relevant runbook, calculates impact from telemetry, and
posts the result to Slack. When Alertmanager sends a resolved notification, it
creates a blameless postmortem from the stored event log.

## Live Demo

Portfolio demo URL: `[https://<vercel-demo-url>](https://ai-sre-new.vercel.app/)`

The Vercel demo is a static frontend build running with `VITE_DEMO_MODE=true`,
so anyone can explore the dashboard with realistic investigation data and no
local backend. For the real system with live Alertmanager, Redis, Postgres,
LangGraph, Slack, and OpenAI integration, follow the local setup and demo
instructions below.

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

On this 15-scenario benchmark, **gpt-6-luna scored 100% commit top-1
(15/15 in 4 of 4 runs)** with medium reasoning and strict JSON schema.

| Mode | Commit top-1 | Commit top-3 | Runbook hit | Impact class | p50 latency | p95 latency | Tokens/run | Estimated USD/run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `replay-fast` deterministic heuristic | 13.3% | 66.7% | 100% | 100% | 27 ms | 56 ms | 0 | $0 |
| `model-eval` `gpt-4.1-mini` (baseline) | 86.7% (13/15) | 100% | 100% | 100% | 6.53 s | 16.97 s | 44,562 | $0.02514 |
| `model-eval` `gpt-6-luna` (current, four-run mean) | 100% (15/15 in 4 of 4 runs) | 100% | 100% | 100% | 4.32 s | 6.08 s | 44,672.5 | $0.00670985 |

Luna used about 44.7k tokens per run, including a mean of 2,224 reasoning
tokens (already included in output tokens). Costs use $0.10 per million input
and $0.50 per million output tokens for Luna, without cached-input discounts.
Latency columns for Luna are means of per-run percentiles, not pooled percentiles.
Luna correctly ranked `recommendation-timeout` and
`frontend-product-catalog-latency`, the two scenarios missed by the mini baseline.

Luna scored 15/15 in 4 of 4 runs. The mini baseline ranged from 86.7% to
93.3% top-1 on the same corpus. This observed zero-variation Luna result does
not guarantee repeatability on future runs or different incidents.

### What this benchmark does and does not show

- (a) 14 of 15 scenarios are synthetic replays; 1 is live-captured.
- (b) Deploy history is seeded.
- (c) The benchmark has one LLM call per scenario: commit diff ranking.
- (d) Runbook retrieval in the benchmark is local lexical, while the live pipeline uses pgvector.
- (e) The displayed score is a deterministic pre-rank score, not model confidence.
- (f) Results measure this fixed corpus, not general incident-response accuracy. The inspected scenario commits add short Markdown change notes, not application source-code changes. Their bad-change notes describe the expected fault and symptom, and the distractor notes explicitly say they are benign or harmless and have no expected error or latency impact.
- (g) The worker triage step now uses gpt-6-luna at low reasoning effort and is not part of the benchmark.

Root-cause precision/recall is intentionally not reported as a separate metric.
In the current design, the actionable root-cause output is the ranked suspect
commit with its evidence; introducing a second label would duplicate commit
ranking or require a distinct evaluator that does not yet exist.

Published clean-run artifacts and their comparison are preserved under
`artifacts/evaluations/`. Compare new runs with a baseline before changing
prompts, models, or ranking logic:

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

### Model configuration

The `.env.example` entries are:

```dotenv
GLASSBOX_LLM_MODEL=gpt-6-luna
GLASSBOX_REASONING_EFFORT=medium
GLASSBOX_TRIAGE_MODEL=gpt-6-luna
GLASSBOX_TRIAGE_REASONING_EFFORT=low
```

`GLASSBOX_LLM_MODEL` and `GLASSBOX_REASONING_EFFORT` configure commit diff
ranking. `GLASSBOX_TRIAGE_MODEL` and `GLASSBOX_TRIAGE_REASONING_EFFORT`
configure worker triage separately. Benchmark flags `--model` and
`--reasoning-effort` override the ranking environment settings for that run:

```bash
python -m glassbox_sre.run_benchmark --mode model-eval \
  --model gpt-6-luna --reasoning-effort medium
```

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

### Dashboard Build

The FastAPI service serves the built React dashboard at `http://localhost:8000`.
Build it once after installing Node.js 20+:

```bash
cd apps/frontend
npm install
npm run build
```

Then start the API from the repository root as shown below. During frontend
development, `npm run dev` provides Vite hot reloading on its own local port.

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

## Limitations And Future Work

Glassbox SRE is intentionally **read-only and advisory**. It does not roll
back deploys, restart services, change flags, or otherwise remediate an
incident, because a plausible but wrong automated action has a much larger
blast radius than a clearly evidenced recommendation.

- Investigations are scoped to one incoming alert. The system does not yet
  correlate or deduplicate related alerts into a broader incident.
- The benchmark has one live-captured scenario and 14 synthetic replays. It is
  a controlled regression corpus, not a claim of general production SRE
  accuracy.
- Root-cause precision and recall are deliberately not separate metrics. The
  actionable root-cause output is an evidence-ranked suspect commit; a second
  label would duplicate commit ranking or require an independent evaluator.
- The optional Go traffic generator was consciously not pursued. The pinned
  Astronomy Shop load generator already provides the traffic needed for this
  project's controlled fault scenarios.
- The pinned demo metric set does not expose the latency histogram needed for
  a defensible p95 calculation. The impact estimator reports latency only when
  a real query supplies it; it never manufactures a percentile.
- The live alert loop depends on Docker resources and a five-minute alert
  lookback, so it is not designed as a lightweight CI test.

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
