---
runbook_id: otel-demo.checkout-payment-failure
title: Checkout payment failure placeholder
service: checkout
upstream_service: payment
alertname: CheckoutPaymentErrors
symptoms:
  - checkout_errors
  - payment_failure
fault_flag: paymentFailure
severity_hint: ticket
environment: otel-demo-local
---

# Checkout payment failure placeholder

## Summary

Use this runbook for future checkout or payment-service failure scenarios. It is a
retrieval distractor for the current frontend/ad incident and should not match
`OTelDemoAdServiceErrors`.

## Signals

- User-facing service: `checkout`
- Upstream service: `payment`
- Symptom: checkout requests fail during payment authorization

## Safe Next Steps

Check checkout deploys, payment-service health, and payment-related traces. Keep
the agent read-only.
