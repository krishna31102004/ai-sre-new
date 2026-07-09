# Infrastructure

Placeholder for Docker Compose files, Prometheus rules, Alertmanager config, and OpenTelemetry demo wiring.

## Local Core Services

Start Postgres with pgvector and Redis:

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
```

Check health:

```bash
docker compose -f infra/docker/docker-compose.yml ps
```

Stop services:

```bash
docker compose -f infra/docker/docker-compose.yml down
```

## OpenTelemetry Demo With Alerts

The OpenTelemetry Astronomy Shop demo is tracked as an external git submodule at
`infra/otel-demo/opentelemetry-demo`.

Initialize or update the submodule after a fresh clone:

```bash
git submodule update --init --recursive
```

Start the demo with its observability stack and the Glassbox SRE alert overlay:

```bash
docker compose \
  -f infra/otel-demo/opentelemetry-demo/compose.yaml \
  -f infra/otel-demo/opentelemetry-demo/compose.observability.yaml \
  -f infra/otel-demo/compose.glassbox.yml \
  up -d
```

Useful local URLs:

- Astronomy Shop: http://localhost:8080
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Jaeger: http://localhost:16686
- Feature flags: http://localhost:8080/feature
