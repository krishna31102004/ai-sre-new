# Glassbox SRE Benchmark Summary: 20261114T225535Z-2b243d01

- Mode: `model-eval`
- Scenario count: 15
- Failed runs: 1
- Bad commit top-1 accuracy: 0.933
- Bad commit top-3 accuracy: 0.933
- Runbook hit rate: 0.933
- Runbook section hit rate: 0.933
- Impact classification accuracy: 0.933
- Latency p50 ms: 4085.89
- Latency p95 ms: 5244.63
- Input tokens: 35988
- Output tokens: 6298
- Total tokens: 42286

## Per Scenario

| Scenario | Commit@1 | Commit@3 | Runbook | Impact | Error |
| --- | --- | --- | --- | --- | --- |
| cart-checkout-failure | pass | pass | pass | pass |  |
| cart-price-staleness | pass | pass | pass | pass |  |
| checkout-payment-decline-spike | pass | pass | pass | pass |  |
| checkout-payment-timeout | pass | pass | pass | pass |  |
| frontend-ad-failure-visible-500s | pass | pass | pass | pass |  |
| frontend-product-catalog-latency | pass | pass | pass | pass |  |
| frontend-product-catalog-unavailable | fail | fail | fail | fail | ValidationError: 6 validation errors for ModelEvalResult
ranked_commit_shas.0
  Input should be a valid string [type=string_type, input_value={'commit_sha': '4908b7367...oyed before the alert.'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.13/v/string_type
ranked_commit_shas.1
  Input should be a valid string [type=string_type, input_value={'commit_sha': '700abd2fe...failures or HTTP 500s.'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.13/v/string_type
ranked_commit_shas.2
  Input should be a valid string [type=string_type, input_value={'commit_sha': '582281ad6...ected lookup failures.'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.13/v/string_type
ranked_commit_shas.3
  Input should be a valid string [type=string_type, input_value={'commit_sha': 'bcc8aa322...ted error-rate impact.'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.13/v/string_type
ranked_commit_shas.4
  Input should be a valid string [type=string_type, input_value={'commit_sha': '8aaf682f6...escribed by the alert.'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.13/v/string_type
reasoning
  Field required [type=missing, input_value={'ranked_commit_shas': [{...cribed by the alert.'}]}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.13/v/missing |
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
- Reasoning tokens: 2130
