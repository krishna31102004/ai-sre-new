# Kafka Checkout Queue Lag Scenario

- Service: `checkout`
- Expected incident relationship: root-cause candidate for checkout event queue lag
- Change summary: increase checkout event payload size without increasing producer batch limits.
- Fault flag modeled: `kafkaQueueLag=on`
- Observable symptom: checkout succeeds slowly while downstream queue lag grows.
