---
runbook_id: otel-demo.product-catalog-errors
title: Product catalog errors placeholder
service: product-catalog
upstream_service: frontend
alertname: ProductCatalogErrors
symptoms:
  - catalog_errors
  - product_lookup_failure
fault_flag: productCatalogFailure
severity_hint: ticket
environment: otel-demo-local
---

# Product catalog errors placeholder

## Summary

Use this runbook for future product catalog lookup failures. It is a retrieval
distractor for frontend/ad incidents.

## Signals

- Service: `product-catalog`
- Symptom: product detail or list pages fail to load catalog data

## Safe Next Steps

Inspect product-catalog metrics, recent deploys, and traces from frontend to
product-catalog. Keep the agent read-only.
