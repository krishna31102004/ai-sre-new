# Kafka Email Consumer Errors Scenario

- Service: `email`
- Expected incident relationship: root-cause candidate for notification consumer failures
- Change summary: require a new notification template field before the producer sends it.
- Fault flag modeled: `kafkaConsumerFailure=on`
- Observable symptom: email consumer errors rise after checkout events are produced.
