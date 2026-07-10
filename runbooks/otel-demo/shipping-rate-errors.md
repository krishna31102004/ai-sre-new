---
runbook_id: otel-demo.shipping-rate-errors
title: Shipping rate errors
service: shipping
upstream_service: checkout
alertname: ShippingRateErrors
symptoms:
  - shipping_errors
  - checkout_errors
  - shippingFailure
fault_flag: shippingFailure
severity_hint: page
environment: otel-demo-local
---

# Shipping rate errors

## Summary

Use this runbook when checkout shipping estimates fail or become slow.

## Signals

- User-facing service: `checkout`
- Upstream service: `shipping`
- Symptom: invalid or timed-out shipping estimate

## Safe Next Steps

Inspect shipping deploys, region-rate lookups, and checkout-to-shipping traces.
