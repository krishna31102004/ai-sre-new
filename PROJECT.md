# Glassbox SRE Project Memory

## Summary

Glassbox SRE is a read-only, glass-box autonomous AI incident response agent: an "AI SRE" that ingests real alerts from a controlled microservice demo environment, investigates likely causes through parallel evidence-gathering paths, emits confidence-scored incident briefs locally first and through Slack later, and drafts blameless postmortems from captured evidence. It is being built as a high-quality summer 2027 SWE internship portfolio project, with the goal of demonstrating production-shaped systems design, agent orchestration, observability, evaluation rigor, and clear scope control rather than a toy LLM wrapper.

## Source Documents

Every future session should read these files first, in this order:

1. `PROJECT.md` - permanent project source of truth.
2. `ROADMAP.md` - phased build plan and current task checklist.
3. `DECISIONS.md` - architectural and scope decision log.

The original planning inputs are:

- `research-report.md` - detailed architecture, stack, scope, and positioning recommendation.
- `outline.md` - plain-language interpretation of the report.

The outline accurately matches the report's intent. The main nuance to preserve is that the report treats the evaluation harness as the portfolio differentiator and highest-value addition, even though it is built after the MVP because it depends on having an agent to run.

## System Architecture

The system runs against the OpenTelemetry Astronomy Shop demo app as an external Docker Compose dependency, not vendored or forked into this repository. The demo is a realistic polyglot microservice environment with Prometheus, Grafana, Jaeger, load generation, and `flagd` fault injection. Synthetic incidents are created by flipping `flagd` feature flags and by maintaining seeded commit and deploy metadata in this project that maps known bad changes to known incident scenarios.

### Repository Shape

The repository uses a service-oriented layout rather than a single flat package:

- `apps/api` - FastAPI ingestion service for Alertmanager webhooks and future Slack interaction endpoints.
- `apps/worker` - async investigation worker containing the LangGraph investigation graph and queue consumer.
- `packages/core` - shared Python package for Pydantic schemas, configuration, database models, typed contracts, and utilities used by both services.
- `infra` - Docker Compose files, Prometheus and Alertmanager configuration, and OpenTelemetry demo wiring.

### Ingestion Layer

A FastAPI service exposes an alert webhook endpoint, expected to be `/webhook/alert`. Prometheus Alertmanager sends alert payloads to this endpoint when alerting rules fire against the OpenTelemetry demo telemetry. The endpoint validates the Alertmanager JSON payload, including status, alert labels, annotations, and timestamps, returns quickly, and enqueues an investigation job into Redis so alert ingestion is decoupled from slower investigation work.

### Orchestrator

LangGraph owns the investigation workflow as a typed state machine. The central state object, likely named `InvestigationState`, carries alert metadata, gathered evidence, tool results, hypotheses, confidence scores, validation states, timings, and links to traces or stored records. The graph begins with triage, moves through a gate node that determines whether enough context exists to investigate responsibly, fans out to parallel investigator nodes, synthesizes the results, runs a critic/evaluator step, posts a Slack brief, and later triggers postmortem generation on resolution.

Expected graph shape:

1. `triage` - parse alert payload, classify service, severity, incident type, and immediate metadata.
2. `gate` - decide whether there is enough context to continue, gather more context if needed, or stop with an explicit inconclusive state.
3. Parallel investigator nodes - run independent evidence-gathering checks.
4. `synthesize` - merge evidence into ranked hypotheses with confidence scores and validation states.
5. `critic` or `evaluator` - check whether the brief is sufficiently grounded, internally consistent, and evidence-cited before posting.
6. `brief` - post the Slack incident brief and persist the result.
7. `postmortem` - after a resolution signal, generate a structured blameless postmortem from captured event logs and evidence.

### Parallel Investigator Nodes

The commit/deploy correlator compares the alert start time with deploy history, narrows to commits in the suspect deploy window, applies deterministic filters such as service ownership and touched paths, inspects relevant diffs, and uses the LLM to rank likely culprit commits with reasoning, confidence, and evidence links. It should use timing and metadata to shrink the search space before any LLM ranking.

The runbook retriever performs hybrid retrieval over curated markdown runbooks. It should combine deterministic tags such as service and alert type with embedding-based ranking through pgvector, because the corpus will be small and structured enough that tag filtering plus re-ranking is more defensible than naive vector search alone.

The impact estimator queries Prometheus for real telemetry changes caused by injected faults, including error rate, latency, request volume, and affected endpoints. It uses the service dependency graph to estimate blast radius and derives affected user estimates from baseline request volume and observed error rates. The LLM may narrate impact, but it must not invent impact numbers.

The similar-incident matcher searches prior synthetic postmortems and incident records for related patterns. It helps provide historical context and expected remediation suggestions, but its findings must be treated as supporting evidence rather than proof.

### Synthesis

The synthesis node combines investigator output into ranked hypotheses. Each hypothesis must include a validation state, confidence score, supporting evidence, contradicting evidence if present, and a clear explanation of why the hypothesis is more or less likely than alternatives. Valid states should include at least `validated`, `invalidated`, and `inconclusive`.

### Slack Integration

The first walking skeleton uses a stubbed local notifier that writes the formatted incident brief to the console and/or a local file. This proves alert ingestion, queueing, graph execution, formatting, and persistence before adding Slack credentials and event-handling complexity.

Later, Slack integration should use a real Slack Bolt app in Python, not a one-way incoming webhook. The bot should post Block Kit incident briefs, update threads as more information arrives, support slash commands such as `/incident status` and `/incident postmortem`, and verify Slack request signatures. The Slack interaction path should acknowledge requests quickly and do slower work asynchronously through the queue.

### Postmortem Generation

Postmortem generation happens after a resolution signal, such as a fault flag being turned off or recovery being detected. The postmortem should be generated from captured evidence and the investigation event log, not from model memory. It should use a Pydantic schema with fields such as summary, timeline, impact, root cause, contributing factors, resolution, action items, and lessons learned. The output should be blameless, evidence-grounded, and stored both as structured JSON and readable Markdown.

### State And Storage

Postgres stores durable investigation records, findings, hypotheses, evidence links, postmortems, deploy history, and vector embeddings through pgvector. Redis provides the async work queue and short-lived hot state. LangSmith records graph execution, node transitions, tool calls, LLM calls, latency, token use, and reasoning or decision metadata needed for debugging and demos.

### Evaluation Harness

The evaluation harness is a first-class deliverable, not an afterthought. It should run 20-40 scripted synthetic incidents with known ground truth, then score root-cause identification, bad-commit top-1/top-3 accuracy, runbook retrieval hit rate, impact classification accuracy, and end-to-end latency. Evaluation should be replayable and honest, using known fault flags, seeded bad commits, expected runbooks, and captured world snapshots where possible.

## Locked Tech Stack

- LangGraph - stateful, branching, partially parallel agent orchestration with checkpointing and replayable traces.
- FastAPI - Python-native web API layer for Alertmanager webhooks and service endpoints.
- Redis - async queue and hot-state layer so alert ingestion stays fast while investigations run in the background.
- Postgres with pgvector - durable relational state plus vector retrieval for runbooks and similar incidents in one database.
- OpenTelemetry demo app plus `flagd` - realistic synthetic production environment with real telemetry and controllable fault injection.
- Slack Bolt - production-shaped Slack integration with Block Kit, slash commands, threads, interactivity, and request signature verification.
- Pydantic - typed state, tool I/O contracts, validated structured LLM outputs, and postmortem schemas.
- LangSmith - trace and debug view for LangGraph execution, tool calls, LLM calls, latency, token use, and demoable agent reasoning.
- OpenAI API - initial LLM provider behind LangGraph, chosen for cost and availability while keeping the architecture model-agnostic.
- Per-node model selection - lightweight nodes such as triage may use cheaper models, while diff ranking, synthesis, critic review, and postmortem generation may use stronger reasoning models; exact model choices are decided node by node during implementation.
- Optional Go component - a small synthetic telemetry or traffic generator if it remains clearly justified and does not distract from the Python agent core.

## Scope Boundary

This project is read-only and advisory. It detects, investigates, correlates, briefs, evaluates, and drafts postmortems, but it does not automatically roll back deploys, restart services, scale infrastructure, edit config, or mutate the demo environment as a remediation step.

This boundary is intentional. AI incident response can produce plausible but wrong conclusions, and infrastructure mutations have real blast-radius risk. A read-only agent still demonstrates the hard parts: alert ingestion, agentic control flow, parallel investigation, evidence grounding, impact estimation, Slack-native workflow, postmortem generation, tracing, and evaluation. A future remediation interface may be designed as a structured recommendation with human approval and dry-run mode, but it must not execute real actions autonomously.

## Agentic Design Principles

1. Gate node: the agent must be able to refuse to conclude or gather more context when evidence is thin.
2. Parallel hypotheses with validation states: independent investigator paths should produce hypotheses marked validated, invalidated, or inconclusive with confidence scores.
3. Critic/evaluator step: a separate review node should evaluate the synthesized brief before it is posted, because self-graded agents tend to be overly positive.
4. Evidence citation on every claim: every conclusion must point to the metric, log, trace, runbook, commit, diff, or event that supports it.

These principles make the system agentic rather than a fixed prompt chain: it has conditional control flow, dynamic tool use, evidence-based stopping behavior, explicit uncertainty, and self-critique.

## Key Terminology

- AI SRE - an AI-assisted site reliability engineering agent that helps investigate incidents and communicate findings.
- Advisory/read-only agent - an agent that recommends and reports but does not mutate production systems.
- Glass-box agent - an agent whose claims are visible, evidence-cited, and debuggable.
- Black-box agent - an agent that gives conclusions without showing evidence or reasoning structure.
- OpenTelemetry Astronomy Shop demo - an open-source microservice demo app with built-in telemetry, useful as a synthetic production environment.
- OpenTelemetry or OTel - a standard for collecting traces, metrics, and logs from applications.
- `flagd` - a feature flag service used by the OpenTelemetry demo to turn fault scenarios on and off.
- Prometheus - a metrics database and alerting source used to query service health and performance.
- Alertmanager - the Prometheus component that routes fired alerts to receivers such as webhooks.
- Grafana - a dashboarding tool for visualizing metrics.
- Jaeger - a distributed tracing UI used to inspect request traces across services.
- LangGraph - a framework for building stateful, graph-based agent workflows with branching, persistence, and tool execution.
- LangSmith - an observability and tracing platform for LangGraph/LangChain applications.
- FastAPI - a Python web framework for building API services.
- Redis - an in-memory data store commonly used for queues, caching, and short-lived state.
- Postgres - a relational database for durable application state.
- pgvector - a Postgres extension for storing and searching vector embeddings.
- RAG - retrieval-augmented generation, where the model answers using retrieved documents or evidence.
- Runbook - an operational guide that explains how to diagnose or handle a known class of incident.
- Slack Bolt - Slack's app framework for bots, commands, events, and interactive messages.
- Block Kit - Slack's structured UI system for rich messages.
- Pydantic - a Python library for typed data validation and schema definitions.
- Hypothesis validation state - the status of a possible root cause after investigation: validated, invalidated, or inconclusive.
- Impact estimation - deriving affected services, endpoints, users, and severity from telemetry and dependency data.
- Seeded Git history - intentionally authored commit and deploy history used to create known root causes for synthetic incidents.
- Evaluation harness - repeatable benchmark infrastructure that runs known incidents and scores the agent's answers.
