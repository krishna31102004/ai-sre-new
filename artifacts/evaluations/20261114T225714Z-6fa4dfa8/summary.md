# Glassbox SRE Benchmark Summary: 20261114T225714Z-6fa4dfa8

- Mode: `model-eval`
- Scenario count: 15
- Failed runs: 0
- Bad commit top-1 accuracy: 1.000
- Bad commit top-3 accuracy: 1.000
- Runbook hit rate: 1.000
- Runbook section hit rate: 1.000
- Impact classification accuracy: 1.000
- Latency p50 ms: 4208.83
- Latency p95 ms: 5547.20
- Input tokens: 39066
- Output tokens: 5526
- Total tokens: 44592

## Per Scenario

| Scenario | Commit@1 | Commit@3 | Runbook | Impact | Error |
| --- | --- | --- | --- | --- | --- |
| cart-checkout-failure | pass | pass | pass | pass |  |
| cart-price-staleness | pass | pass | pass | pass |  |
| checkout-payment-decline-spike | pass | pass | pass | pass |  |
| checkout-payment-timeout | pass | pass | pass | pass |  |
| frontend-ad-failure-visible-500s | pass | pass | pass | pass |  |
| frontend-product-catalog-latency | pass | pass | pass | pass |  |
| frontend-product-catalog-unavailable | pass | pass | pass | pass |  |
| image-cdn-errors | pass | pass | pass | pass |  |
| image-slow-load | pass | pass | pass | pass |  |
| kafka-checkout-queue-lag | pass | pass | pass | pass |  |
| kafka-email-consumer-errors | pass | pass | pass | pass |  |
| recommendation-cache-leak | pass | pass | pass | pass |  |
| recommendation-timeout | pass | pass | pass | pass |  |
| shipping-rate-timeout | pass | pass | pass | pass |  |
| shipping-zone-rate-cache | pass | pass | pass | pass |  |

- Model: gpt-6-luna
- Reasoning effort: medium
- Reasoning tokens: 2186
