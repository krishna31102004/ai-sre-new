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
