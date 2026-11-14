# Glassbox SRE Resume Bullets

- Built Glassbox SRE, a read-only LangGraph incident-investigation system that correlates Prometheus alerts with deploy history, Git diffs, pgvector runbooks, and telemetry-derived impact; achieved 100% suspect-commit top-1 on this 15-scenario benchmark (15/15 in 4 of 4 runs) with gpt-6-luna.

- Designed and shipped an evidence-first AI SRE pipeline using FastAPI, Redis, Postgres/pgvector, LangGraph, OpenAI, and Slack Bolt; real fault injection flows through Alertmanager to Slack briefs and grounded postmortems, with 100% runbook and impact-classification accuracy on this 15-scenario benchmark.

- Architected Glassbox SRE as a glass-box, advisory-only incident response system: asynchronous alert ingestion, parallel commit/runbook/impact investigation, deterministic evidence synthesis, Slack lifecycle updates, and event-grounded postmortems. Built a replayable benchmark with same-service deploy distractors, measuring 13.3% deterministic versus 100% model-assisted commit top-1 on this 15-scenario benchmark (15/15 in 4 of 4 runs).

- Evaluated gpt-6-luna commit diff ranking at about $0.007 per full benchmark run, scoring 15/15 in 4 of 4 runs on a fixed 15-scenario corpus.

## Interview truth notes

- (a) 14 of 15 scenarios are synthetic replays; 1 is live-captured.
- (b) Deploy history is seeded.
- (c) The benchmark has one LLM call per scenario: commit diff ranking.
- (d) Runbook retrieval in the benchmark is local lexical, while the live pipeline uses pgvector.
- (e) The displayed score is a deterministic pre-rank score, not model confidence.
- (f) Results measure this fixed corpus, not general incident-response accuracy. The inspected scenario commits add short Markdown change notes, not application source-code changes. Their bad-change notes describe the expected fault and symptom, and the distractor notes explicitly say they are benign or harmless and have no expected error or latency impact.
- (g) The worker triage step now uses gpt-6-luna at low reasoning effort and is not part of the benchmark.
- If asked about an early failure: an early run hit a JSON schema bug, I switched to strict JSON schema and reran.
