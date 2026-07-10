# Image CDN Errors Scenario

- Service: `frontend`
- Expected incident relationship: root-cause candidate for product image 5xx responses
- Change summary: rewrite image CDN URLs with an invalid variant parameter.
- Fault flag modeled: `imageFailure=on`
- Observable symptom: product page image requests fail and frontend 500s rise.
