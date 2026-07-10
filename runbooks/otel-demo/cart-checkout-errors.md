---
runbook_id: otel-demo.cart-checkout-errors
title: Cart-backed checkout errors
service: cart
upstream_service: checkout
alertname: CartCheckoutErrors
symptoms:
  - cart_errors
  - checkout_errors
  - cartFailure
fault_flag: cartFailure
severity_hint: page
environment: otel-demo-local
---

# Cart-backed checkout errors

## Summary

Use this runbook when checkout failures are tied to cart validation or stale cart
state.

## Signals

- User-facing service: `checkout`
- Upstream service: `cart`
- Symptom: checkout fails during cart validation

## Safe Next Steps

Inspect cart deploys, cart validation metrics, and checkout traces. Keep the
agent read-only.
