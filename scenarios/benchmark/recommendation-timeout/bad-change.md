# Recommendation Timeout Scenario

- Service: `recommendation`
- Expected incident relationship: root-cause candidate for frontend recommendation errors
- Change summary: lower the recommendation service client timeout below normal p95 latency.
- Fault flag modeled: `recommendationFailure=on`
- Observable symptom: frontend recommendation widgets return errors under normal load.
