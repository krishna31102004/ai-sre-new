# Checkout Payment Decline Spike Scenario

Synthetic benchmark source note for payment declines caused by request metadata handling.

- Service: `payment`
- Expected incident relationship: root-cause candidate for checkout payment errors
- Change summary: drop optional fraud metadata before payment authorization, increasing declines.
- Fault flag modeled: `paymentFailure=on`
- Observable symptom: checkout failures cluster around payment authorization responses.

This is repo-owned benchmark evidence. It is not part of the OpenTelemetry demo submodule.
