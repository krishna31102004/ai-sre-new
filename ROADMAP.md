# Glassbox SRE Roadmap

This roadmap is organized by dependency order and demoable capability, not by calendar dates. Each phase should end in a specific state that can be shown, tested, or evaluated.

## Phase 0: Environment Setup And Walking Skeleton

Done means a real `flagd` fault in the OpenTelemetry demo can trigger a Prometheus alert, Alertmanager can call the FastAPI webhook, the investigation job can be queued, a minimal LangGraph workflow can run, and a local stub notifier can emit a formatted incident message to the console and/or a file.

- [ ] Create the initial service-oriented repository structure with `apps/api`, `apps/worker`, `packages/core`, and `infra`.
- [ ] Add project configuration for Python formatting, linting, testing, and environment management.
- [ ] Stand up the OpenTelemetry Astronomy Shop demo locally.
- [ ] Confirm the demo emits metrics, traces, and logs through Prometheus, Grafana, and Jaeger.
- [ ] Confirm `flagd` fault flags can be flipped manually.
- [ ] Identify one simple fault scenario for the first vertical slice.
- [ ] Add Prometheus alerting rule for the first chosen fault.
- [ ] Configure Alertmanager webhook receiver for the local FastAPI service.
- [ ] Build FastAPI `/webhook/alert` endpoint.
- [ ] Validate Alertmanager payloads with Pydantic models.
- [ ] Return quickly from the webhook and enqueue work into Redis.
- [ ] Build minimal Redis-backed investigation worker.
- [ ] Build minimal LangGraph workflow with a triage node and a brief node.
- [ ] Build local notifier abstraction.
- [ ] Emit a formatted incident brief through the local stub notifier.
- [ ] Write local notifier output to console and/or a development file.
- [ ] Add basic structured logging.
- [ ] Add basic LangSmith tracing for the minimal graph.
- [ ] Document local setup commands.

## Phase 1: Core Investigation With Commit Correlation

Done means an alert can trigger an investigation that identifies a likely suspect commit or deploy from seeded metadata, includes confidence and evidence, and emits that result through the local notifier.

- [ ] Keep the OpenTelemetry demo external through Docker Compose rather than vendoring or forking it into this repo.
- [ ] Design the deploy history schema.
- [ ] Create a small initial deploy history dataset.
- [ ] Author seeded commits mapped to the first fault scenario.
- [ ] Store deploy records in Postgres.
- [ ] Add durable investigation records to Postgres.
- [ ] Implement alert-to-service mapping logic.
- [ ] Implement deploy-window lookup around alert `startsAt`.
- [ ] Implement candidate commit retrieval with `git log`.
- [ ] Add service/path heuristics for narrowing candidate commits.
- [ ] Add diff extraction for candidate commits.
- [ ] Define Pydantic schema for commit-correlation findings.
- [ ] Implement LLM-based candidate diff ranking.
- [ ] Require confidence score and evidence for each ranked commit.
- [ ] Represent hypotheses with validation states.
- [ ] Add graph fan-out structure even if only one investigator is fully implemented.
- [ ] Update the incident brief to include suspect commit, confidence, and evidence links.
- [ ] Add tests for deploy-window filtering.
- [ ] Add tests for hypothesis schema validation.
- [ ] Run the first end-to-end commit-correlation demo.

## Phase 2: Runbook RAG And Impact Estimation

Done means the MVP is complete: a real injected fault triggers an autonomous investigation that correlates a likely bad commit, retrieves a relevant runbook, estimates impact from telemetry, and emits a single evidence-cited incident brief through the local notifier without human intervention.

- [ ] Write the initial runbook corpus for supported fault scenarios.
- [ ] Define runbook metadata tags such as service, alert type, and symptom.
- [ ] Add runbook ingestion pipeline.
- [ ] Chunk runbooks by section.
- [ ] Generate embeddings for runbook chunks.
- [ ] Store runbook chunks and embeddings in Postgres with pgvector.
- [ ] Add pgvector index strategy.
- [ ] Implement deterministic tag filtering for runbooks.
- [ ] Implement embedding-based ranking within filtered candidates.
- [ ] Define Pydantic schema for runbook retrieval findings.
- [ ] Add tests for runbook tag filtering.
- [ ] Add tests for expected runbook retrieval on known alerts.
- [ ] Implement Prometheus client.
- [ ] Define metric queries for error rate, latency, and request volume.
- [ ] Build service dependency graph representation.
- [ ] Estimate affected services from dependency topology.
- [ ] Estimate affected endpoints from telemetry labels where available.
- [ ] Estimate affected users from request volume and error rate.
- [ ] Define severity classification logic.
- [ ] Ensure the LLM only narrates computed impact numbers.
- [ ] Add parallel execution for commit, runbook, impact, and similar-incident investigators.
- [ ] Add synthesis node for ranked evidence-backed hypotheses.
- [ ] Add evidence citations to every incident-brief claim.
- [ ] Run MVP end-to-end against at least one known `flagd` incident.

## Phase 3: Real Slack Integration And Postmortem Generation

Done means the local notifier can be replaced by a real Slack Bolt notifier and an incident resolution signal can trigger a structured, blameless postmortem generated from captured evidence and event logs, saved as JSON and Markdown.

- [ ] Configure Slack Bolt app in development mode.
- [ ] Implement Slack notifier behind the same notifier interface as the local stub.
- [ ] Post Block Kit incident briefs to Slack.
- [ ] Add Slack thread updates for investigation progress.
- [ ] Verify Slack request signature handling for interactive or command routes.
- [ ] Define incident event log schema.
- [ ] Persist graph node events, tool results, Slack posts, and timestamps.
- [ ] Define resolution signal source for local demos.
- [ ] Detect recovery from Prometheus metrics or fault flag state.
- [ ] Define Pydantic postmortem schema.
- [ ] Create Markdown postmortem template.
- [ ] Assemble timeline from hard event timestamps.
- [ ] Ground summary, impact, root cause, and action items in stored evidence.
- [ ] Generate structured postmortem through validated LLM output.
- [ ] Store postmortem JSON in Postgres.
- [ ] Store postmortem Markdown in the repo or configured output directory.
- [ ] Add Slack command or button to request postmortem generation.
- [ ] Add tests for postmortem schema validation.
- [ ] Add tests that generated postmortem timelines use stored events.
- [ ] Demo alert-to-brief-to-resolution-to-postmortem flow.

## Phase 4: Evaluation Harness

Done means the project can run a repeatable benchmark of synthetic incidents with ground truth and report honest metrics for root-cause accuracy, commit ranking, runbook retrieval, impact classification, and latency.

- [ ] Define benchmark scenario schema.
- [ ] Create ground-truth labels for fault flag, bad commit, expected runbook, impact class, and expected root cause.
- [ ] Script at least 5 initial synthetic scenarios.
- [ ] Expand toward 20-40 total scenarios as supported functionality grows.
- [ ] Add scenario runner that can trigger or replay incidents headlessly.
- [ ] Capture world snapshots where live telemetry would make results non-deterministic.
- [ ] Run the LangGraph investigation in evaluation mode.
- [ ] Score root-cause identification precision and recall.
- [ ] Score bad-commit top-1 and top-3 accuracy.
- [ ] Score runbook retrieval hit rate.
- [ ] Score impact classification accuracy.
- [ ] Measure end-to-end latency p50 and p95.
- [ ] Save evaluation outputs as structured artifacts.
- [ ] Add regression comparison between evaluation runs.
- [ ] Add generator/evaluator critic node if not already present.
- [ ] Make critic output measurable in evaluation logs.
- [ ] Document benchmark methodology and limitations.
- [ ] Publish initial honest benchmark table in the README.

## Phase 5: Polish, Tracing, Documentation, And Open Source Readiness

Done means the repo is cloneable, understandable, demoable, and resume defensible: one-command or clearly documented setup, polished Slack output, useful traces, architecture docs, honest benchmark results, and clean project boundaries.

- [ ] Refine Slack Block Kit incident brief layout.
- [ ] Add `/incident status` command.
- [ ] Add `/incident postmortem` command.
- [ ] Improve LangSmith trace naming and metadata.
- [ ] Ensure every graph node and tool call is traceable.
- [ ] Add architecture diagram.
- [ ] Write README with project purpose, architecture, setup, demo flow, benchmark results, and limitations.
- [ ] Include ITBench context without overclaiming production readiness.
- [ ] Document read-only scope and remediation boundary.
- [ ] Design structured `propose_remediation` output without wiring mutating actions.
- [ ] Add final test suite instructions.
- [ ] Add example incident brief screenshots or saved outputs.
- [ ] Add example postmortem output.
- [ ] Record a short demo script or checklist.
- [ ] Check secrets handling and `.env.example`.
- [ ] Check license choice.
- [ ] Check contributor-oriented setup instructions if open sourcing.
- [ ] Review repository for unnecessary generated files or local secrets.
- [ ] Create final resume bullet with real measured numbers.

## Optional Phase 6: Go Synthetic Traffic Component

Done means a small Go service improves the realism of traffic or telemetry generation without becoming a second main project.

- [ ] Decide whether the built-in demo load generator is insufficient.
- [ ] Define the narrow job of the Go component.
- [ ] Implement configurable traffic patterns.
- [ ] Expose metrics useful to the impact estimator.
- [ ] Integrate with local Docker Compose.
- [ ] Document why Go is used here and Python remains the orchestrator language.
- [ ] Add tests or smoke checks for generated metrics.
