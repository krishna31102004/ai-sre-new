# Shipping Zone Rate Cache Benchmark Scenario

- Service: `shipping`
- Expected incident relationship: root-cause candidate for checkout shipping estimate errors
- Change summary: cache zone-rate lookups using an incomplete region key.
- Fault flag modeled: `shippingFailure=on`
- Observable symptom: checkout shipping estimates fail or return invalid rates.
