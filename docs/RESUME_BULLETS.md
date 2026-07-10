# Glassbox SRE Resume Bullets

- Built Glassbox SRE, a read-only LangGraph incident-investigation system that correlates Prometheus alerts with deploy history, Git diffs, pgvector runbooks, and telemetry-derived impact; achieved 86.7% suspect-commit top-1 accuracy on a hardened 15-scenario benchmark.

- Designed and shipped an evidence-first AI SRE pipeline using FastAPI, Redis, Postgres/pgvector, LangGraph, OpenAI, and Slack Bolt; real fault injection flows through Alertmanager to Slack briefs and grounded postmortems, with 100% runbook and impact-classification accuracy in replay evaluation.

- Architected Glassbox SRE as a glass-box, advisory-only incident response system: asynchronous alert ingestion, parallel commit/runbook/impact investigation, deterministic evidence synthesis, Slack lifecycle updates, and event-grounded postmortems. Built a replayable benchmark with same-service deploy distractors, measuring 13.3% deterministic versus 86.7% model-assisted commit top-1 accuracy across 15 scenarios.
