---
runbook_id: otel-demo.recommendation-errors
title: Recommendation service errors
service: recommendation
upstream_service: frontend
alertname: RecommendationErrors
symptoms:
  - recommendation_errors
  - recommendationFailure
  - recommendationCacheLeak
fault_flag: recommendationFailure
severity_hint: ticket
environment: otel-demo-local
---

# Recommendation service errors

## Summary

Use this runbook when frontend recommendations slow down, fail, or leak cache
state.

## Signals

- User-facing service: `frontend`
- Upstream service: `recommendation`
- Symptom: recommendation widget errors or latency

## Safe Next Steps

Inspect recommendation deploys, cache growth, timeout changes, and frontend
fallback behavior.
