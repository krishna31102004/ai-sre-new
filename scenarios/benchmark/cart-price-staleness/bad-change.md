# Cart Price Staleness Scenario

- Service: `cart`
- Expected incident relationship: root-cause candidate for cart validation errors
- Change summary: cache cart item prices too aggressively across product updates.
- Fault flag modeled: `cartFailure=on`
- Observable symptom: cart validation errors and intermittent checkout failures.
