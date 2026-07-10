# Recommendation Cache Leak Scenario

- Service: `recommendation`
- Expected incident relationship: root-cause candidate for recommendation/ad latency
- Change summary: keep per-user recommendation candidates in an unbounded in-memory cache.
- Fault flag modeled: `recommendationCacheLeak=on`
- Observable symptom: recommendation calls slow down and intermittently fail.
