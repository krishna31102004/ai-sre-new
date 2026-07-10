# Cart Checkout Failure Scenario

- Service: `cart`
- Expected incident relationship: root-cause candidate for cart-backed checkout failures
- Change summary: require cart price validation during checkout without handling stale cart rows.
- Fault flag modeled: `cartFailure=on`
- Observable symptom: checkout requests fail when cart validation rejects otherwise valid carts.
