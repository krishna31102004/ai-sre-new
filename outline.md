## The core recommendation

Build a **read-only, glass-box "AI SRE" agent**. It watches for production alerts, investigates them like a senior engineer would, and posts its findings to Slack, then later writes a postmortem. No auto-remediation. It just detects, investigates, and reports, nothing that touches production.

The orchestration is done in **LangGraph** (a stateful graph framework for agents), and the whole thing runs against a **fake but realistic production environment**: the OpenTelemetry Astronomy Shop demo, which is an open source, 15+ microservice demo app that already comes with Prometheus, Grafana, Jaeger, and a fault injector called `flagd`. This is the key unlock, since you don't have a real company's infra to point this at, so instead you use an existing, well built demo app and inject fake failures into it that look and behave like real ones.

## Why this specific idea, and the honest risk built into it

The report is upfront that this exact category of project (AI incident response agent) is extremely hot right now, meaning tons of companies are building this commercially (incident.io, Rootly, Datadog Bits AI, PagerDuty AIOps, etc), and tons of other candidates are probably building toy versions of it too. So the report's whole thesis is: the agent itself is not the differentiator, since everyone can build "an agent that looks at logs and posts to Slack." **The differentiator is the evaluation harness.**

Meaning, you don't just build the agent and demo it once. You build a benchmark of 20 to 40 fake incidents where you already know the true root cause (since you scripted them), run the agent against all of them, and measure how often it actually gets the right answer, how fast, precision and recall on root cause identification. Then you report those numbers honestly in your README, even if they're mediocre. The report backs this up by citing a real benchmark (IBM's ITBench) where even frontier models only resolve about 11 to 14 percent of real SRE scenarios. So if your agent gets say 60 percent on your own scoped benchmark, that's actually a great, credible number, and reporting it honestly (rather than just showing one clean happy-path demo) is what separates a serious systems thinker from someone who built a chatbot wrapper.

## The actual architecture, step by step

1. **Ingestion**: FastAPI endpoint receives a webhook from Prometheus Alertmanager whenever an alert fires. It responds immediately (has to, Slack/webhook conventions expect fast acks) and pushes the real work onto a Redis queue, so the heavy investigation happens asynchronously.

2. **Orchestrator (LangGraph)**: A state machine graph with nodes like: triage (classify the alert) then a gate node (do we actually have enough info to proceed, or do we need to gather more first, this mimics avoiding a junior engineer jumping to conclusions) then it fans out into multiple investigator nodes running in parallel.

3. **The parallel investigators**:
   - **Commit/deploy correlator**: looks at when the alert fired, cross references against a seeded fake git history of commits and deploys, narrows down to what was deployed right before the incident, then has the LLM reason over the actual diffs to rank likely culprits with a confidence score.
   - **Runbook retriever**: a RAG (retrieval augmented generation) system over a small set of markdown runbooks you write yourself, stored with vector embeddings in pgvector (Postgres extension).
   - **Impact estimator**: queries Prometheus directly for real error rate and latency changes caused by the injected fault, and uses the service dependency graph to figure out blast radius (which services and estimated how many users were affected).
   - **Similar incident matcher**: checks past synthetic postmortems for similar patterns.

4. **Synthesis and brief**: once enough evidence is gathered, the graph synthesizes everything into a ranked hypothesis with a confidence score and evidence citations (this "cite the evidence for every claim" idea is called "glass box vs black box," and it's repeatedly called out as the single biggest thing that makes this look like a real agent instead of an LLM wrapper), then posts a formatted brief to Slack using a real Slack Bolt bot (not just a basic webhook, so you get rich formatting, threads, and slash commands).

5. **Postmortem generation**: once the incident is marked resolved, another node assembles a structured postmortem using a fixed Pydantic schema (summary, timeline, impact, root cause, action items), but critically, the timeline and facts come from your own captured event log during the investigation, not the LLM's memory. This is called out as the key anti-hallucination, anti-"generic ChatGPT output" trick.

## What makes it "genuinely agentic" rather than "prompt chaining with extra steps"

The report is very specific here, four things:
- A gate node that can refuse to conclude if evidence is thin (real agents know when they don't know enough yet)
- Parallel hypotheses that get explicitly marked validated, invalidated, or inconclusive, with evidence
- A separate "critic" step that reviews the brief before it's posted, since agents grading their own work tend to be overly positive
- Every conclusion must cite the exact piece of evidence it's based on

## Tech stack, locked in by the report

LangGraph + Claude for orchestration and reasoning, FastAPI + Redis for the backend and queue, Postgres with pgvector for both structured data and the RAG vector store, Prometheus/Alertmanager/Grafana plus the OpenTelemetry demo app plus flagd for the simulated environment, Slack Bolt for the Slack integration, Pydantic for structured outputs everywhere, and LangSmith (or Langfuse) for tracing the agent's reasoning so you can show a step by step replay in an interview. One small Go microservice is suggested purely for a synthetic traffic generator, to add language range to your resume without derailing the main Python-based build.

## The build timeline

Roughly 8 weeks part time: week 1 is a bare bones vertical slice (one alert triggers one hardcoded Slack message, just to prove the pipes connect), weeks 2 to 3 build up to a real MVP (commit correlation, runbook RAG, impact estimation all working, posting a real evidence backed brief), week 4 adds the postmortem generator, weeks 5 to 6 build the evaluation harness (called the single highest value addition), and weeks 7 to 8 are polish, documentation, a demo video, and open sourcing it cleanly.

## Positioning

The resume bullet and interview talking points should lead with the systems design (event driven architecture, parallel orchestration, RAG, dependency graph impact analysis) and the evaluation rigor, not "I used an LLM." The report also flags that most 2025 to 2026 agentic portfolio projects fail to stand out because they have no evaluation, are black boxes, only demo one happy path, and confuse "more agents" with "more impressive." This project is designed to invert every one of those four failure modes.

