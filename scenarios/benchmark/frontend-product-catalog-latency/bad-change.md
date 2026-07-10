# Frontend Product Catalog Latency Scenario

Synthetic benchmark source note for frontend degradation rooted in product catalog latency.

- Service: `product-catalog`
- Expected incident relationship: root-cause candidate for frontend product listing latency/errors
- Change summary: add a synchronous inventory enrichment call to catalog listing responses.
- Fault flag modeled: `productCatalogFailure=on`
- Observable symptom: frontend product requests accumulate slow responses and intermittent 500s.

This is repo-owned benchmark evidence. It is not part of the OpenTelemetry demo submodule.
