# Checkout Payment Timeout Scenario

Synthetic benchmark source note for a checkout failure rooted in the payment service.

- Service: `payment`
- Expected incident relationship: root-cause candidate for checkout payment errors
- Change summary: lower the upstream payment authorization timeout without adding retry budget.
- Fault flag modeled: `paymentFailure=on`
- Observable symptom: checkout requests fail while payment authorization calls return errors.

This is repo-owned benchmark evidence. It is not part of the OpenTelemetry demo submodule.
