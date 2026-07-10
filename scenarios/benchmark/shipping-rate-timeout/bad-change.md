# Shipping Rate Timeout Scenario

- Service: `shipping`
- Expected incident relationship: root-cause candidate for shipping estimate latency and errors
- Change summary: add a synchronous carrier quote lookup without timeout isolation.
- Fault flag modeled: `shippingFailure=on`
- Observable symptom: checkout latency and shipping estimate failures increase.
