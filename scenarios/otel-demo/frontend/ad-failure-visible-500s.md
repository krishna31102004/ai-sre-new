# Frontend Ad Failure Visible 500s Scenario

Synthetic deploy note for the known Phase 1 ground-truth bad change.

- Service: `frontend`
- Expected incident relationship: root-cause candidate for `OTelDemoAdServiceErrors`
- Change summary: make ad recommendation failures propagate as visible frontend HTTP 500 responses.
- Fault flag: `adFailure=on`
- Observable symptom: sustained `frontend` 500 responses in Prometheus.

This file intentionally models the bad deploy metadata for the first commit-correlation
demo. It lives in the Glassbox SRE repo, not in the OpenTelemetry demo submodule.
