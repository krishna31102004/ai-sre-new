# AI SRE Decision Log

This file is the running log for architectural and scope decisions. Add a dated entry whenever the project makes a meaningful decision, especially if it changes or narrows the original report.

## Decisions

- 2026-07-09: Build a read-only/advisory AI SRE rather than an auto-remediation agent, because evidence-grounded investigation is impressive while autonomous infrastructure mutation is risky and unnecessary for the portfolio goal.
- 2026-07-09: Use the OpenTelemetry Astronomy Shop demo as the synthetic production environment, because it provides realistic microservices, telemetry, dashboards, load generation, and `flagd` fault injection.
- 2026-07-09: Use `flagd` fault flags to create controlled synthetic incidents, because reproducible known failures are required for demos and evaluation.
- 2026-07-09: Use LangGraph for orchestration, because incident investigation is a stateful, branching, partially parallel workflow with checkpointing and replay needs.
- 2026-07-09: Use a FastAPI webhook for alert ingestion, because Prometheus Alertmanager can call it directly and Python fits the agent ecosystem.
- 2026-07-09: Use Redis for async investigation queueing, because webhook ingestion must return quickly while investigations run in the background.
- 2026-07-09: Use Postgres as the durable state store, because investigations, findings, hypotheses, evidence, deploy history, and postmortems are relational data.
- 2026-07-09: Use pgvector inside Postgres for runbook and similar-incident retrieval, because the project does not need a separate vector database at this scale.
- 2026-07-09: Use hybrid runbook retrieval with deterministic tags plus vector ranking, because the runbook corpus is small and structured enough for tags to improve precision.
- 2026-07-09: Use Slack Bolt instead of a basic incoming webhook, because slash commands, interactive actions, threads, Block Kit, and request verification make the integration production-shaped.
- 2026-07-09: Use Pydantic for typed state, tool contracts, and structured LLM outputs, because validation is central to making the agent reliable and debuggable.
- 2026-07-09: Use LangSmith for agent tracing, because replayable graph traces are important for debugging, evaluation, and interview demos.
- 2026-07-09: Keep the reasoning model behind LangGraph model-agnostic while initially targeting a Claude Sonnet-class model, because this preserves flexibility while using a strong reasoning model.
- 2026-07-09: Implement commit correlation as deterministic deploy-window narrowing followed by LLM diff ranking, because pure timing correlation is too broad and pure LLM-over-all-commits is unreliable.
- 2026-07-09: Require evidence citations on every incident-brief claim, because the project must be glass-box and defensible rather than a black-box chatbot.
- 2026-07-09: Include a gate node that can stop or gather more context before conclusion, because avoiding thin-evidence conclusions is a core agentic design principle.
- 2026-07-09: Represent hypotheses with validation states and confidence scores, because incident investigation needs explicit uncertainty and invalidation, not just a single answer.
- 2026-07-09: Add a critic/evaluator step before posting final briefs, because agents tend to overrate their own conclusions.
- 2026-07-09: Treat the evaluation harness as a first-class deliverable, because measured accuracy on scripted incidents is the main differentiator from toy agent projects.
- 2026-07-09: Generate postmortems only from captured investigation evidence and event logs, because the LLM should format grounded facts rather than invent timelines.
- 2026-07-09: Defer any Go component until after the core Python MVP unless it clearly improves synthetic traffic or telemetry realism, because language diversity should not derail the main system.
- 2026-07-09: Name the project Glassbox SRE with Python package naming based on `glassbox_sre`, because the name emphasizes evidence-cited, debuggable incident investigation.
- 2026-07-09: Use a service-oriented repository layout with `apps/api`, `apps/worker`, `packages/core`, and `infra`, because the ingestion service, async investigation worker, shared contracts, and infrastructure config have distinct ownership boundaries.
- 2026-07-09: Start with a local stub notifier before wiring Slack Bolt, because the walking skeleton should prove alert ingestion, queueing, graph execution, and brief formatting before adding Slack credential and event complexity.
- 2026-07-09: Use the OpenAI API as the initial LLM provider instead of Anthropic, because LangGraph keeps the system model-agnostic and OpenAI is cheaper for this use case.
- 2026-07-09: Choose models per graph node rather than fixing one global model, because cheap classification steps and stronger reasoning steps have different cost and quality needs.
- 2026-07-09: Read the OpenAI API key from environment variables loaded through `.env` during development, because secrets must stay out of version control and deployment config should be explicit.
- 2026-07-09: Treat the OpenTelemetry demo app as an external Docker Compose dependency rather than vendoring or forking it, because the repo should own the AI SRE system and only wire against the demo environment.
- 2026-07-09: Use the standard-library `venv` module for the local Python environment, because it is universally available and avoids introducing another package manager before the project needs one.
- 2026-07-09: Use `python3` consistently in scripts and documentation, because this machine does not expose a `python` command on PATH outside the virtual environment.
- 2026-07-09: Run local Postgres from the `pgvector/pgvector:pg16` image, because it enables the vector extension while preserving normal Postgres behavior for relational state.
- 2026-07-09: Use a Redis list plus JSON-serialized Pydantic payloads for the Phase 0 alert queue, with `RPUSH` on ingestion and simple `LPOP` polling in the worker, because it is the smallest reliable queue abstraction needed to prove async ingestion without adding Celery or another worker framework.
- 2026-07-09: Store queued alert messages as `AlertmanagerWebhook.model_dump_json(by_alias=True)`, because the same shared Pydantic schema can validate both API input and worker input.
- 2026-07-09: Keep one root editable install for all internal packages instead of separate installs for `apps/api`, `apps/worker`, and `packages/core`, because a single setup command is less error-prone across repeated fresh clones.
- 2026-07-09: Explicitly map `glassbox_sre`, `glassbox_sre_api`, and `glassbox_sre_worker` in `pyproject.toml`, because implicit multi-root package discovery installed the distribution but did not expose the import packages reliably.
- 2026-07-09: Pin local setup to `pip<26` for now, because pip 26.1.2 hung during basic commands in this environment while pip 25.3 completed installs normally.
