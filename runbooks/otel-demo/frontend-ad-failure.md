---
runbook_id: otel-demo.frontend-ad-failure
title: Frontend ad failure causing HTTP 500s
service: frontend
upstream_service: ad
alertname: OTelDemoAdServiceErrors
symptoms:
  - http_500
  - adFailure
  - frontend_errors
fault_flag: adFailure
severity_hint: page
environment: otel-demo-local
---

# Frontend ad failure causing HTTP 500s

## Summary

Use this runbook when the OpenTelemetry demo frontend is returning HTTP 500s and
the `adFailure` fault flag is active or suspected. In the pinned demo stack, ad
service failures are visible to users as frontend errors, so the frontend alert is
the user-facing symptom even when the upstream contributor is the ad service.

## Signals

- Prometheus alert: `OTelDemoAdServiceErrors`
- User-facing service: `frontend`
- Symptom: sustained HTTP 500 responses from the frontend
- Known fault flag: `adFailure`
- Upstream service to inspect: `ad`

## Diagnostic Queries

- `sum(increase(http_server_duration_milliseconds_count{service_name="frontend", http_status_code="500"}[5m]))`
- `sum(increase(http_server_duration_milliseconds_count{service_name="frontend"}[5m]))`
- `sum by (service_name, rpc_grpc_status_code) (increase(rpc_server_duration_milliseconds_count{service_name="ad"}[5m]))`

## Safe Next Steps

Keep the agent read-only. Confirm the alert, inspect frontend error volume, check
whether `adFailure` is active, and compare recent frontend/ad-related deploys with
the alert start time. Do not restart services or flip fault flags as remediation
from the agent.

## Evidence To Collect

- Alertmanager payload including `startsAt`, `alertname`, and `service`
- Prometheus frontend 500 count and total request count over the same window
- Recent frontend deploy records and changed paths
- Diff evidence for commits touching frontend or ad failure behavior

## Known Demo Faults

`adFailure=on` is the supported synthetic incident for this runbook. It produces
fresh frontend HTTP 500s under load and should resolve after the flag is turned
off and the alert lookback window ages out.
