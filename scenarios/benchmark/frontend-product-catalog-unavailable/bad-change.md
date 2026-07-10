# Frontend Product Catalog Unavailable Scenario

Synthetic benchmark source note for frontend errors rooted in product catalog failures.

- Service: `product-catalog`
- Expected incident relationship: root-cause candidate for frontend product listing errors
- Change summary: route catalog lookups through a stricter availability check that fails closed.
- Fault flag modeled: `productCatalogFailure=on`
- Observable symptom: frontend product page requests return errors when catalog lookups fail.

This is repo-owned benchmark evidence. It is not part of the OpenTelemetry demo submodule.
