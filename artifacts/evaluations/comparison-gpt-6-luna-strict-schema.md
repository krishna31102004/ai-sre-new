# GPT-6 Luna strict-schema comparison

## A. Four clean runs

All use gpt-6-luna, medium reasoning, strict JSON schema. Reasoning tokens are included in output tokens; cost uses uncached standard rates.

| Run | Top-1 | Top-3 | Runbook | Impact | p50 s | p95 s | Input | Output | Reasoning | Cost USD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20261114T225714Z-6fa4dfa8 | 100.0% | 100.0% | 100.0% | 100.0% | 4.21 | 5.55 | 39066 | 5526 | 2186 | $0.00666960 |
| 20261114T225823Z-3dba8984 | 100.0% | 100.0% | 100.0% | 100.0% | 3.86 | 6.14 | 39066 | 5451 | 2164 | $0.00663210 |
| 20261114T231504Z-bbc3101a | 100.0% | 100.0% | 100.0% | 100.0% | 4.55 | 6.21 | 39066 | 5876 | 2435 | $0.00684460 |
| 20261114T231624Z-eed88045 | 100.0% | 100.0% | 100.0% | 100.0% | 4.67 | 6.40 | 39066 | 5573 | 2111 | $0.00669310 |

Top-1 mean 100.0%; min 100.0%; max 100.0%.

## B. Baselines and Luna mean

| Mode | Top-1 | Top-3 | Runbook | Impact | p50 s | p95 s | Total tokens | Cost USD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| replay-fast | 13.3% | 66.7% | 100% | 100% | 0.03 | 0.06 | 0 | $0 |
| gpt-4.1-mini published | 86.7% | 100% | 100% | 100% | 6.53 | 16.97 | 44,562 | $0.02514 |
| Luna mean (top-1 range 100.0%–100.0%) | 100.0% | 100.0% | 100.0% | 100.0% | 4.32 | 6.08 | 44,672.5 | $0.00670985 |

Luna latency columns are means of per-run percentiles, not pooled percentiles.

## C. Per scenario

L1–L4 follow the run order above. Pre-rank score is shared deterministic evidence; n/a means no deterministic finding, even when the model ordered the candidate.

| Scenario | Source | Truth | Replay first | Mini first | L1 first | L2 first | L3 first | L4 first | pre-rank score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cart-checkout-failure | synthetic-replay | 23f839de | bbeffa5a wrong | 23f839de right | 23f839de right | 23f839de right | 23f839de right | 23f839de right | 0.55 |
| cart-price-staleness | synthetic-replay | cc0efffc | d56b8b31 wrong | cc0efffc right | cc0efffc right | cc0efffc right | cc0efffc right | cc0efffc right | 0.55 |
| checkout-payment-decline-spike | synthetic-replay | 6f4eb04d | 6b19fe93 wrong | 6f4eb04d right | 6f4eb04d right | 6f4eb04d right | 6f4eb04d right | 6f4eb04d right | 0.55 |
| checkout-payment-timeout | synthetic-replay | 5b82deae | 6b19fe93 wrong | 5b82deae right | 5b82deae right | 5b82deae right | 5b82deae right | 5b82deae right | 0.55 |
| frontend-ad-failure-visible-500s | live-captured | 41080eb5 | d56b8b31 wrong | 41080eb5 right | 41080eb5 right | 41080eb5 right | 41080eb5 right | 41080eb5 right | 0.9 |
| frontend-product-catalog-latency | synthetic-replay | 5147f682 | d56b8b31 wrong | d56b8b31 wrong | 5147f682 right | 5147f682 right | 5147f682 right | 5147f682 right | n/a |
| frontend-product-catalog-unavailable | synthetic-replay | 4908b736 | bcc8aa32 wrong | 4908b736 right | 4908b736 right | 4908b736 right | 4908b736 right | 4908b736 right | n/a |
| image-cdn-errors | synthetic-replay | 243aa8d7 | d56b8b31 wrong | 243aa8d7 right | 243aa8d7 right | 243aa8d7 right | 243aa8d7 right | 243aa8d7 right | 0.9 |
| image-slow-load | synthetic-replay | f81b7e7e | bcc8aa32 wrong | f81b7e7e right | f81b7e7e right | f81b7e7e right | f81b7e7e right | f81b7e7e right | 0.9 |
| kafka-checkout-queue-lag | synthetic-replay | a5608ff5 | a5608ff5 right | a5608ff5 right | a5608ff5 right | a5608ff5 right | a5608ff5 right | a5608ff5 right | 0.9 |
| kafka-email-consumer-errors | synthetic-replay | 6bb59b78 | 6bb59b78 right | 6bb59b78 right | 6bb59b78 right | 6bb59b78 right | 6bb59b78 right | 6bb59b78 right | 0.9 |
| recommendation-cache-leak | synthetic-replay | bdee60d6 | 1f88fac4 wrong | bdee60d6 right | bdee60d6 right | bdee60d6 right | bdee60d6 right | bdee60d6 right | n/a |
| recommendation-timeout | synthetic-replay | a44d68f3 | d56b8b31 wrong | d56b8b31 wrong | a44d68f3 right | a44d68f3 right | a44d68f3 right | a44d68f3 right | n/a |
| shipping-rate-timeout | synthetic-replay | a821fc67 | 8527cb5a wrong | a821fc67 right | a821fc67 right | a821fc67 right | a821fc67 right | a821fc67 right | 0.55 |
| shipping-zone-rate-cache | synthetic-replay | 7f989b87 | 85d3251f wrong | 7f989b87 right | 7f989b87 right | 7f989b87 right | 7f989b87 right | 7f989b87 right | 0.55 |

## D. Disagreements

- frontend-product-catalog-latency: mini d56b8b31 wrong; L1 5147f682 right; L2 5147f682 right; L3 5147f682 right; L4 5147f682 right.
- recommendation-timeout: mini d56b8b31 wrong; L1 a44d68f3 right; L2 a44d68f3 right; L3 a44d68f3 right; L4 a44d68f3 right.

Recommendation-timeout winning explanation (L4, excerpt under 40 words):

> The recommendation-timeout candidate is the strongest match: its note models lowering the recommendation client timeout below normal p95 latency and predicts frontend recommendation errors, matching the alert; it was deployed before the alert.

## E. Verdict

Luna beat the published 86.7% top-1 baseline across all four clean runs. The observed gap is larger than the top-1 range within this stability set. These runs measure this fixed seeded corpus, not general incident-response accuracy. Fourteen scenarios are synthetic replays and one is live-captured.

## Caveats

- Runbook retrieval is local lexical, not pgvector.
- The benchmark has one LLM call per scenario: commit diff ranking.
- Pre-rank score is deterministic and is not model confidence.
- Luna run 1 (20261114T225535Z-2b243d01) is superseded and excluded.
- Existing baseline artifacts do not record their model ID; the mini run is identified by the published matching metrics.

## New spending

Two new runs plus triage smoke: 89,895 tokens; estimated $0.01359470. Smoke: 250 input, 64 output, 0 reasoning; $0.000057. All new benchmark responses parsed; failed-response token handling is covered by a mocked regression test.
