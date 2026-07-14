import type {
  BenchmarkSummary,
  Health,
  InvestigationDetail,
  InvestigationSummary,
} from "./api";

type FaultVariant = "on" | "off";
type FaultResponse = { flag: string; variant: FaultVariant };
type TimelineStep = {
  event_type: string;
  offset_ms: number;
  source: string;
  summary: string;
  reference?: string | null;
};

const slackChannel = "C08GLASSBOX";
const traceBase = "https://smith.langchain.com/public/";

function makeSummary(input: InvestigationSummary): InvestigationSummary {
  return input;
}

function makeDetail(
  investigation: InvestigationSummary,
  brief: string,
  findings: InvestigationDetail["findings"],
  events: InvestigationDetail["events"],
): InvestigationDetail {
  return { investigation, brief, findings, events };
}

function buildTimelineEvents(
  startedAt: string,
  steps: TimelineStep[],
  resolvedAt: string | null,
): InvestigationDetail["events"] {
  const startMs = new Date(startedAt).getTime();
  const events = steps.map((step) => ({
    event_type: step.event_type,
    occurred_at: new Date(startMs + step.offset_ms).toISOString(),
    source: step.source,
    summary: step.summary,
    reference: step.reference ?? null,
  }));

  if (resolvedAt) {
    const resolvedMs = new Date(resolvedAt).getTime();
    events.push({
      event_type: "resolved",
      occurred_at: resolvedAt,
      source: "alertmanager",
      summary: "Resolved webhook received after the alert window drained.",
      reference: null,
    });
    events.push({
      event_type: "postmortem_generated",
      occurred_at: new Date(resolvedMs + 12400).toISOString(),
      source: "worker",
      summary: "Grounded postmortem generated from the stored event log.",
      reference: null,
    });
  }

  return events;
}

const investigations: InvestigationSummary[] = [
  makeSummary({
    investigation_id: "ccfce077-9822-4ee7-ab97-ba56100c74fd",
    alert_name: "OTelDemoAdServiceErrors",
    service: "frontend",
    status: "resolved",
    started_at: "2026-07-10T23:57:14Z",
    resolved_at: "2026-07-11T00:03:28Z",
    suspect_commit_sha: "41080eb518884c6aeede13111f8214a7c87db3fb",
    suspect_commit_title: "Seed frontend ad failure ground truth scenario",
    confidence: 0.9,
    validation_state: "validated",
    runbook_id: "otel-demo.frontend-ad-failure",
    runbook_section: "Signals",
    runbook_score: 0.98,
    error_rate: 0.00138,
    affected_requests: 8,
    severity: "ticket",
    slack_thread_ts: "1752191834.235629",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}frontend-ad-failure-visible-500s`,
  }),
  makeSummary({
    investigation_id: "0d5ccf29-1acd-4e83-834c-d9ea0d0e5a8d",
    alert_name: "OTelDemoCheckoutPaymentErrors",
    service: "checkout",
    status: "firing",
    started_at: "2026-07-11T09:12:44Z",
    resolved_at: null,
    suspect_commit_sha: "5b82deaeb72a074de0d5d46834109d669cce62f3",
    suspect_commit_title: "Seed checkout payment timeout scenario",
    confidence: 0.84,
    validation_state: "validated",
    runbook_id: "otel-demo.checkout-payment-failure",
    runbook_section: "Signals",
    runbook_score: 0.96,
    error_rate: 0.02251,
    affected_requests: 64,
    severity: "page",
    slack_thread_ts: "1752225160.901122",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}checkout-payment-timeout`,
  }),
  makeSummary({
    investigation_id: "be59979c-3c49-48e9-aec0-05ea566566ff",
    alert_name: "OTelDemoProductCatalogErrors",
    service: "frontend",
    status: "resolved",
    started_at: "2026-07-11T10:18:02Z",
    resolved_at: "2026-07-11T10:25:49Z",
    suspect_commit_sha: "4908b73670e8ea64550f2ebe200863bfe6311c8d",
    suspect_commit_title: "Seed frontend product catalog unavailable scenario",
    confidence: 0.88,
    validation_state: "validated",
    runbook_id: "otel-demo.product-catalog-errors",
    runbook_section: "Summary",
    runbook_score: 0.97,
    error_rate: 0.02864,
    affected_requests: 112,
    severity: "page",
    slack_thread_ts: "1752229088.114507",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}frontend-product-catalog-unavailable`,
  }),
  makeSummary({
    investigation_id: "dec9e44f-2473-49e0-8a0c-eb1b4b552578",
    alert_name: "OTelDemoCheckoutPaymentErrors",
    service: "checkout",
    status: "resolved",
    started_at: "2026-07-11T11:41:31Z",
    resolved_at: "2026-07-11T11:49:06Z",
    suspect_commit_sha: "6f4eb04dd963bb455de1062e7867dc6551f0cacd",
    suspect_commit_title: "Seed checkout payment decline spike scenario",
    confidence: 0.81,
    validation_state: "validated",
    runbook_id: "otel-demo.checkout-payment-failure",
    runbook_section: "Safe Next Steps",
    runbook_score: 0.94,
    error_rate: 0.00693,
    affected_requests: 29,
    severity: "page",
    slack_thread_ts: "1752234111.667904",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}checkout-payment-decline-spike`,
  }),
  makeSummary({
    investigation_id: "9c9cefba-2fea-4e33-a6f7-3f5737539edb",
    alert_name: "OTelDemoProductCatalogLatency",
    service: "frontend",
    status: "firing",
    started_at: "2026-07-11T12:08:55Z",
    resolved_at: null,
    suspect_commit_sha: "5147f682cd479f434e8c5417f44bf0ce90fb4268",
    suspect_commit_title: "Seed frontend product catalog latency scenario",
    confidence: 0.76,
    validation_state: "inconclusive",
    runbook_id: "otel-demo.product-catalog-errors",
    runbook_section: "Signals",
    runbook_score: 0.91,
    error_rate: 0.00355,
    affected_requests: 18,
    severity: "page",
    slack_thread_ts: "1752235732.550318",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}frontend-product-catalog-latency`,
  }),
  makeSummary({
    investigation_id: "f38d06bd-f4a2-463b-bd8b-6454d271c315",
    alert_name: "OTelDemoCartCheckoutErrors",
    service: "checkout",
    status: "resolved",
    started_at: "2026-07-11T13:21:18Z",
    resolved_at: "2026-07-11T13:28:40Z",
    suspect_commit_sha: "23f839dec8249a8f47921f5aeee6de6f58b3b74a",
    suspect_commit_title: "Seed cart checkout failure scenario",
    confidence: 0.87,
    validation_state: "validated",
    runbook_id: "otel-demo.cart-checkout-errors",
    runbook_section: "Signals",
    runbook_score: 0.95,
    error_rate: 0.02235,
    affected_requests: 73,
    severity: "page",
    slack_thread_ts: "1752239998.104022",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}cart-checkout-failure`,
  }),
  makeSummary({
    investigation_id: "7f8c1dc5-a5e2-472a-a02a-0d12ab8f3124",
    alert_name: "OTelDemoRecommendationErrors",
    service: "frontend",
    status: "resolved",
    started_at: "2026-07-11T14:11:22Z",
    resolved_at: "2026-07-11T14:16:09Z",
    suspect_commit_sha: "a44d68f362896a4c4c8075ecb4196241a033462b",
    suspect_commit_title: "Seed recommendation timeout scenario",
    confidence: 0.83,
    validation_state: "validated",
    runbook_id: "otel-demo.recommendation-errors",
    runbook_section: "Summary",
    runbook_score: 0.92,
    error_rate: 0.0213,
    affected_requests: 96,
    severity: "page",
    slack_thread_ts: "1752243070.220881",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}recommendation-timeout`,
  }),
  makeSummary({
    investigation_id: "3e3ad6ce-f486-4997-bf95-b5c05caf8c7c",
    alert_name: "OTelDemoShippingRateErrors",
    service: "checkout",
    status: "firing",
    started_at: "2026-07-11T15:07:04Z",
    resolved_at: null,
    suspect_commit_sha: "7f989b87ae9a1e52b780a6560ee2142ef8cbc713",
    suspect_commit_title: "Seed shipping zone rate cache scenario",
    confidence: 0.79,
    validation_state: "inconclusive",
    runbook_id: "otel-demo.shipping-rate-errors",
    runbook_section: "Safe Next Steps",
    runbook_score: 0.89,
    error_rate: 0.01882,
    affected_requests: 41,
    severity: "page",
    slack_thread_ts: "1752246541.778190",
    slack_channel: slackChannel,
    langsmith_trace_url: `${traceBase}shipping-zone-rate-cache`,
  }),
];

function makeEvidence(kind: string, summary: string, reference: string) {
  return { kind, summary, reference };
}

const detailMap = new Map<string, InvestigationDetail>();

for (const investigation of investigations) {
  let brief = "[investigation brief]";
  let findings: InvestigationDetail["findings"] = [];
  let events: InvestigationDetail["events"] = [];

  switch (investigation.investigation_id) {
    case "ccfce077-9822-4ee7-ab97-ba56100c74fd":
      brief = [
        "[investigation brief]",
        "status: resolved",
        "alerts: OTelDemoAdServiceErrors",
        "services: frontend",
        "affected services: frontend, ad",
        "affected endpoints: /, /api/ad",
        "suspect commit: 41080eb51888 - Seed frontend ad failure ground truth scenario (evidence: frontend deployment preceded the alert by 15 minutes; diff added fail-closed ad rendering path when upstream ads are unavailable)",
        "confidence: 0.90 (evidence: frontend deployment preceded the alert by 15 minutes; diff added fail-closed ad rendering path when upstream ads are unavailable)",
        "validation: validated (evidence: frontend deployment preceded the alert by 15 minutes; diff added fail-closed ad rendering path when upstream ads are unavailable)",
        "runbook: otel-demo.frontend-ad-failure / Signals (evidence: tag match on frontend + ad failure; embedding rank favored the ad failure runbook over generic frontend errors)",
        "runbook score: 0.98 (evidence: tag match on frontend + ad failure; embedding rank favored the ad failure runbook over generic frontend errors)",
        "impact: error_rate=0.0014, affected_requests=8, severity=ticket (evidence: Computed 8 frontend 500s out of 5797 requests.)",
        "latency_p95_ms: not available",
      ].join("\n");
      findings = [
        {
          finding_id: "finding-ad-1",
          commit_sha: investigation.suspect_commit_sha,
          commit_title: investigation.suspect_commit_title,
          service: "frontend",
          confidence: investigation.confidence,
          validation_state: "validated",
          evidence: [
            makeEvidence("deploy", "frontend deployment preceded the alert by 15 minutes", "bench-ad-frontend-bad"),
            makeEvidence("diff", "diff added fail-closed ad rendering path when upstream ads are unavailable", "scenarios/otel-demo/frontend/ad-failure-visible-500s.md"),
          ],
          reasoning: "The deploy window and diff both align with the observed frontend 500s when the ad service fails.",
        },
      ];
      events = buildTimelineEvents(investigation.started_at, [
        { event_type: "alert_received", offset_ms: 0, source: "alertmanager", summary: "Alertmanager delivered firing alert for OTelDemoAdServiceErrors." },
        { event_type: "queued_to_redis", offset_ms: 180, source: "api", summary: "FastAPI acknowledged the webhook and enqueued the investigation job." },
        { event_type: "triage_completed", offset_ms: 1210, source: "worker", summary: "Triage classified the alert as a frontend ad failure with visible 500s." },
        { event_type: "commit_correlation_completed", offset_ms: 4820, source: "worker", summary: "Commit correlation ranked the frontend ad failure ground-truth commit first." },
        { event_type: "runbook_retrieval_completed", offset_ms: 5180, source: "worker", summary: "Runbook retrieval selected the frontend ad failure Signals section." },
        { event_type: "impact_estimation_completed", offset_ms: 5490, source: "worker", summary: "Impact estimation measured 8 failed requests out of 5,797." },
        { event_type: "brief_posted", offset_ms: 20000, source: "slack", summary: "Incident brief posted to Slack thread.", reference: investigation.slack_thread_ts },
      ], investigation.resolved_at);
      break;
    case "0d5ccf29-1acd-4e83-834c-d9ea0d0e5a8d":
      brief = [
        "[investigation brief]",
        "status: firing",
        "alerts: OTelDemoCheckoutPaymentErrors",
        "services: checkout",
        "affected services: checkout, payment",
        "affected endpoints: /api/checkout, /api/payment/authorize",
        "suspect commit: 5b82deaeb72a - Seed checkout payment timeout scenario (evidence: payment deploy landed inside the correlation window; diff lowered authorization timeout below normal p95)",
        "confidence: 0.84 (evidence: payment deploy landed inside the correlation window; diff lowered authorization timeout below normal p95)",
        "validation: validated (evidence: payment deploy landed inside the correlation window; diff lowered authorization timeout below normal p95)",
        "runbook: otel-demo.checkout-payment-failure / Signals (evidence: tags matched checkout + payment; score stayed above same-service distractors)",
        "runbook score: 0.96 (evidence: tags matched checkout + payment; score stayed above same-service distractors)",
        "impact: error_rate=0.0225, affected_requests=64, severity=page (evidence: Computed 64 failing checkout requests out of 2843 total requests.)",
        "latency_p95_ms: not available",
      ].join("\n");
      findings = [
        {
          finding_id: "finding-payment-timeout-1",
          commit_sha: investigation.suspect_commit_sha,
          commit_title: investigation.suspect_commit_title,
          service: "payment",
          confidence: investigation.confidence,
          validation_state: "validated",
          evidence: [
            makeEvidence("deploy", "payment deploy landed inside the correlation window", "bench-payment-timeout-bad"),
            makeEvidence("diff", "diff lowered authorization timeout below normal p95", "scenarios/benchmark/checkout-payment-timeout/bad-change.md"),
          ],
          reasoning: "The timeout reduction explains the checkout failures better than the benign payment distractors in the same deploy window.",
        },
      ];
      events = buildTimelineEvents(investigation.started_at, [
        { event_type: "alert_received", offset_ms: 0, source: "alertmanager", summary: "Firing alert received for checkout payment failures." },
        { event_type: "queued_to_redis", offset_ms: 210, source: "api", summary: "Webhook accepted and investigation queued in Redis." },
        { event_type: "triage_completed", offset_ms: 980, source: "worker", summary: "Triage tagged the incident as checkout and payment related." },
        { event_type: "commit_correlation_completed", offset_ms: 4550, source: "worker", summary: "Commit correlation ranked the payment timeout commit above same-service distractors." },
        { event_type: "runbook_retrieval_completed", offset_ms: 5030, source: "worker", summary: "Runbook retrieval selected checkout-payment-failure / Signals." },
        { event_type: "impact_estimation_completed", offset_ms: 5410, source: "worker", summary: "Impact estimation measured 64 failed requests out of 2,843." },
        { event_type: "brief_posted", offset_ms: 19000, source: "slack", summary: "Firing brief posted to Slack thread.", reference: investigation.slack_thread_ts },
      ], investigation.resolved_at);
      break;
    case "be59979c-3c49-48e9-aec0-05ea566566ff":
      brief = [
        "[investigation brief]",
        "status: resolved",
        "alerts: OTelDemoProductCatalogErrors",
        "services: frontend",
        "affected services: frontend, product-catalog",
        "affected endpoints: /api/products, /api/products/{id}",
        "suspect commit: 4908b73670e8 - Seed frontend product catalog unavailable scenario (evidence: product-catalog deploy introduced fail-closed availability check; frontend 500s spiked immediately after the deploy)",
        "confidence: 0.88 (evidence: product-catalog deploy introduced fail-closed availability check; frontend 500s spiked immediately after the deploy)",
        "validation: validated (evidence: product-catalog deploy introduced fail-closed availability check; frontend 500s spiked immediately after the deploy)",
        "runbook: otel-demo.product-catalog-errors / Summary (evidence: dependency-aware tag filtering kept product-catalog runbook in scope for a frontend alert)",
        "runbook score: 0.97 (evidence: dependency-aware tag filtering kept product-catalog runbook in scope for a frontend alert)",
        "impact: error_rate=0.0286, affected_requests=112, severity=page (evidence: Computed 112 failing product page requests out of 3911 total requests.)",
        "latency_p95_ms: not available",
      ].join("\n");
      findings = [
        {
          finding_id: "finding-catalog-unavailable-1",
          commit_sha: investigation.suspect_commit_sha,
          commit_title: investigation.suspect_commit_title,
          service: "product-catalog",
          confidence: investigation.confidence,
          validation_state: "validated",
          evidence: [
            makeEvidence("deploy", "product-catalog deploy fell within the alert correlation window", "bench-catalog-unavailable-bad"),
            makeEvidence("diff", "diff routed lookups through a stricter availability check that fails closed", "scenarios/benchmark/frontend-product-catalog-unavailable/bad-change.md"),
          ],
          reasoning: "The product-catalog change explains the frontend symptom and the runbook match reinforced that dependency path.",
        },
      ];
      events = buildTimelineEvents(investigation.started_at, [
        { event_type: "alert_received", offset_ms: 0, source: "alertmanager", summary: "Frontend product catalog alert fired." },
        { event_type: "queued_to_redis", offset_ms: 190, source: "api", summary: "Webhook accepted and added to the Redis queue." },
        { event_type: "triage_completed", offset_ms: 1120, source: "worker", summary: "Triage flagged the alert as frontend degradation with a product-catalog dependency." },
        { event_type: "commit_correlation_completed", offset_ms: 4680, source: "worker", summary: "Commit correlation isolated the product-catalog fail-closed deploy." },
        { event_type: "runbook_retrieval_completed", offset_ms: 5020, source: "worker", summary: "Runbook retrieval kept the product-catalog runbook in scope for the frontend alert." },
        { event_type: "impact_estimation_completed", offset_ms: 5430, source: "worker", summary: "Impact estimation measured 112 failed product page requests." },
        { event_type: "brief_posted", offset_ms: 20000, source: "slack", summary: "Incident brief posted to Slack thread.", reference: investigation.slack_thread_ts },
      ], investigation.resolved_at);
      break;
    default:
      brief = [
        "[investigation brief]",
        `status: ${investigation.status}`,
        `alerts: ${investigation.alert_name}`,
        `services: ${investigation.service}`,
        `suspect commit: ${investigation.suspect_commit_sha?.slice(0, 12) ?? "none"} - ${investigation.suspect_commit_title ?? "No commit candidate"} (evidence: deploy-window correlation favored the top candidate over same-service distractors)`,
        `confidence: ${(investigation.confidence ?? 0).toFixed(2)} (evidence: deploy-window correlation favored the top candidate over same-service distractors)`,
        `validation: ${investigation.validation_state ?? "inconclusive"} (evidence: deploy-window correlation favored the top candidate over same-service distractors)`,
        `runbook: ${investigation.runbook_id ?? "not available"} / ${investigation.runbook_section ?? "Summary"} (evidence: service tags and embeddings produced the top match)`,
        `runbook score: ${(investigation.runbook_score ?? 0).toFixed(2)} (evidence: service tags and embeddings produced the top match)`,
        `impact: error_rate=${(investigation.error_rate ?? 0).toFixed(4)}, affected_requests=${investigation.affected_requests ?? 0}, severity=${investigation.severity ?? "info"} (evidence: Computed ${(investigation.affected_requests ?? 0)} affected requests from replay telemetry.)`,
        "latency_p95_ms: not available",
      ].join("\n");
      findings = investigation.suspect_commit_sha ? [
        {
          finding_id: `${investigation.investigation_id}-commit`,
          commit_sha: investigation.suspect_commit_sha,
          commit_title: investigation.suspect_commit_title,
          service: investigation.service,
          confidence: investigation.confidence,
          validation_state: investigation.validation_state,
          evidence: [
            makeEvidence("deploy", "deploy-window correlation favored the top candidate over same-service distractors", `deploy-${investigation.investigation_id}`),
            makeEvidence("diff", "diff summary matched the alert symptom and affected service path", `scenario:${investigation.runbook_id}`),
          ],
          reasoning: "The candidate survived deterministic narrowing and remained the strongest explanation after diff review.",
        },
      ] : [];
      events = buildTimelineEvents(investigation.started_at, [
        { event_type: "alert_received", offset_ms: 0, source: "alertmanager", summary: `Alert received for ${investigation.alert_name}.` },
        { event_type: "queued_to_redis", offset_ms: 180, source: "api", summary: "Webhook accepted and queued for async processing." },
        { event_type: "triage_completed", offset_ms: 960, source: "worker", summary: "Triage completed and enriched the incident state." },
        { event_type: "commit_correlation_completed", offset_ms: 4210, source: "worker", summary: "Commit correlation ranked the strongest candidate for the alert window." },
        { event_type: "runbook_retrieval_completed", offset_ms: 4580, source: "worker", summary: "Runbook retrieval selected the highest-ranked matching section." },
        { event_type: "impact_estimation_completed", offset_ms: 4970, source: "worker", summary: "Impact estimation computed the blast radius from replay telemetry." },
        { event_type: "brief_posted", offset_ms: 18000, source: "slack", summary: "Incident brief posted.", reference: investigation.slack_thread_ts },
      ], investigation.resolved_at);
  }

  detailMap.set(investigation.investigation_id, makeDetail(investigation, brief, findings, events));
}

export const mockInvestigations = investigations;

export const mockHealth: Health = {
  api: { ok: true },
  worker: { ok: true, seconds_since_last_heartbeat: 4 },
  postgres: { ok: true },
  redis: { ok: true },
};

export const mockFaults: Record<string, FaultResponse> = {
  adFailure: { flag: "adFailure", variant: "off" },
  paymentFailure: { flag: "paymentFailure", variant: "off" },
  productCatalogFailure: { flag: "productCatalogFailure", variant: "off" },
};

export const mockBenchmark: BenchmarkSummary = {
  scenario_count: 15,
  bad_commit_top1_accuracy: 0.8666666666666667,
  bad_commit_top3_accuracy: 1,
  runbook_hit_rate: 1,
  impact_classification_accuracy: 1,
  latency_p50_ms: 6533.594208000068,
  latency_p95_ms: 16974.079045699706,
  total_tokens: 44562,
};

export function getMockInvestigationsResponse() {
  return { investigations: mockInvestigations };
}

export function getMockInvestigationDetail(id: string): InvestigationDetail {
  const detail = detailMap.get(id);
  if (!detail) {
    throw new Error(`Mock investigation not found: ${id}`);
  }
  return detail;
}

export function getMockFault(flag: string): FaultResponse {
  return mockFaults[flag] ?? { flag, variant: "off" };
}

export function getAllMockInvestigationDetails(): InvestigationDetail[] {
  return investigations
    .map((investigation) => detailMap.get(investigation.investigation_id))
    .filter((detail): detail is InvestigationDetail => detail !== undefined);
}
