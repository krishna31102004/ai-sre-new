# GPT-6 Luna benchmark comparison

Run 1 has one schema validation failure; its token and cost totals omit the failed response. Runs 2 and 3 used strict JSON schema after the failure, so the three runs are not a controlled stability measurement. Runbook retrieval in this benchmark is local lexical retrieval, not pgvector. Confidence below is deterministic candidate confidence, not model confidence.

## Summary

| Mode | Top-1 | Top-3 | Runbook | Impact | p50 s | p95 s | Tokens | Estimated cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| replay-fast | 13.3% | 66.7% | 100.0% | 100.0% | 0.03 | 0.06 | 0 | $0.00000 |
| gpt-4.1-mini | 86.7% | 100.0% | 100.0% | 100.0% | 6.53 | 16.97 | 44,562 | $0.02514 |
| gpt-6-luna run 1 | 93.3% | 93.3% | 93.3% | 93.3% | 4.09 | 5.24 | 42,286 | ≥$0.00675 |
| gpt-6-luna run 2 | 100.0% | 100.0% | 100.0% | 100.0% | 4.21 | 5.55 | 44,592 | $0.00667 |
| gpt-6-luna run 3 | 100.0% | 100.0% | 100.0% | 100.0% | 3.86 | 6.14 | 44,517 | $0.00663 |

Costs apply uncached standard token prices; actual billing can differ with cached input. Reasoning tokens are included in output tokens.

## Scenarios

| Scenario | Source | Truth | Replay first | Mini first | Luna run 1 first (deterministic confidence) |
| --- | --- | --- | --- | --- | --- |
| cart-checkout-failure | synthetic-replay | 23f839de | bbeffa5a ✗ | 23f839de ✓ | 23f839de ✓ (0.55) |
| cart-price-staleness | synthetic-replay | cc0efffc | d56b8b31 ✗ | cc0efffc ✓ | cc0efffc ✓ (0.55) |
| checkout-payment-decline-spike | synthetic-replay | 6f4eb04d | 6b19fe93 ✗ | 6f4eb04d ✓ | 6f4eb04d ✓ (0.55) |
| checkout-payment-timeout | synthetic-replay | 5b82deae | 6b19fe93 ✗ | 5b82deae ✓ | 5b82deae ✓ (0.55) |
| frontend-ad-failure-visible-500s | live-captured | 41080eb5 | d56b8b31 ✗ | 41080eb5 ✓ | 41080eb5 ✓ (0.90) |
| frontend-product-catalog-latency | synthetic-replay | 5147f682 | d56b8b31 ✗ | d56b8b31 ✗ | 5147f682 ✓ (n/a) |
| frontend-product-catalog-unavailable | synthetic-replay | 4908b736 | bcc8aa32 ✗ | 4908b736 ✓ | No result (error) (n/a) |
| image-cdn-errors | synthetic-replay | 243aa8d7 | d56b8b31 ✗ | 243aa8d7 ✓ | 243aa8d7 ✓ (0.90) |
| image-slow-load | synthetic-replay | f81b7e7e | bcc8aa32 ✗ | f81b7e7e ✓ | f81b7e7e ✓ (0.90) |
| kafka-checkout-queue-lag | synthetic-replay | a5608ff5 | a5608ff5 ✓ | a5608ff5 ✓ | a5608ff5 ✓ (0.90) |
| kafka-email-consumer-errors | synthetic-replay | 6bb59b78 | 6bb59b78 ✓ | 6bb59b78 ✓ | 6bb59b78 ✓ (0.90) |
| recommendation-cache-leak | synthetic-replay | bdee60d6 | 1f88fac4 ✗ | bdee60d6 ✓ | bdee60d6 ✓ (n/a) |
| recommendation-timeout | synthetic-replay | a44d68f3 | d56b8b31 ✗ | d56b8b31 ✗ | a44d68f3 ✓ (n/a) |
| shipping-rate-timeout | synthetic-replay | a821fc67 | 8527cb5a ✗ | a821fc67 ✓ | a821fc67 ✓ (0.55) |
| shipping-zone-rate-cache | synthetic-replay | 7f989b87 | 85d3251f ✗ | 7f989b87 ✓ | 7f989b87 ✓ (0.55) |

## Disagreements

- frontend-product-catalog-latency: mini d56b8b31 ✗; Luna 5147f682 ✓.
- frontend-product-catalog-unavailable: mini 4908b736 ✓; Luna No result (error).
- recommendation-timeout: mini d56b8b31 ✗; Luna a44d68f3 ✓.

Recommendation-timeout Luna run 1 explanation:

> {'a44d68f362896a4c4c8075ecb4196241a033462b': "Best match: its change note describes lowering the recommendation client timeout below normal p95 latency, directly matching the alert's recommendation-call timeouts. It was deployed before the alert.", 'd56b8b31b4944ee3eda1b7173d431115d808ce6e': 'Frontend service and timing match, but the change is explicitly a benign accessibility-label update with no expected error or latency impact.', '12ec93f8bb2ad212745bc651c45d4413f67554b7': 'Recommendation service matches the symptom domain, but the change is explicitly benign copy-only metadata with no expected latency or error impact.', '582281ad6dd8939a824736256958c9f1895ab7d4': 'Unrelated product-catalog alt-text change, described as harmless and not expected to affect recommendation calls.'}

Run IDs: 20260710T091438Z-d63e7dae, 20260710T091445Z-2fc57259, 20261114T225535Z-2b243d01, 20261114T225714Z-6fa4dfa8, 20261114T225823Z-3dba8984
