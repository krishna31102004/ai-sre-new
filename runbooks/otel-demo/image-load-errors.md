---
runbook_id: otel-demo.image-load-errors
title: Product image load errors
service: frontend
upstream_service: image
alertname: ImageLoadErrors
symptoms:
  - image_errors
  - imageSlowLoad
  - imageFailure
fault_flag: imageSlowLoad
severity_hint: ticket
environment: otel-demo-local
---

# Product image load errors

## Summary

Use this runbook when product image latency or image-related frontend errors rise.

## Signals

- User-facing service: `frontend`
- Symptom: image transformation latency or CDN error responses

## Safe Next Steps

Inspect frontend image URL rewrites, CDN variant parameters, and image transform
latency.
