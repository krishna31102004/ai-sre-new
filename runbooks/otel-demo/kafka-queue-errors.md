---
runbook_id: otel-demo.kafka-queue-errors
title: Kafka queue and consumer errors
service: checkout
upstream_service: kafka
alertname: KafkaQueueErrors
symptoms:
  - kafka_queue_lag
  - kafka_consumer_errors
  - kafkaQueueLag
  - kafkaConsumerFailure
fault_flag: kafkaQueueLag
severity_hint: ticket
environment: otel-demo-local
---

# Kafka queue and consumer errors

## Summary

Use this runbook when checkout or notification events accumulate queue lag or
consumer failures.

## Signals

- Producing service: `checkout`
- Consumer service: `email`
- Symptom: queue lag, consumer errors, delayed notifications

## Safe Next Steps

Inspect checkout producer deploys, consumer schema compatibility, and lag metrics.
