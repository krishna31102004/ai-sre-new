# Image Slow Load Scenario

- Service: `frontend`
- Expected incident relationship: root-cause candidate for slow product image rendering
- Change summary: switch product images to a transformation endpoint that is not cached.
- Fault flag modeled: `imageSlowLoad=on`
- Observable symptom: frontend latency rises while HTTP error volume stays low.
