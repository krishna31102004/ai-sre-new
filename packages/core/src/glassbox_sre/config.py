from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    postgres_url: str = "postgresql+psycopg://glassbox_sre:glassbox_sre@localhost:15432/glassbox_sre"
    openai_api_key: str | None = None
    openai_triage_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    langsmith_tracing: str | None = None
    langsmith_api_key: str | None = None
    langsmith_project: str | None = "glassbox-sre-dev"
    slack_bot_token: str | None = None
    slack_signing_secret: str | None = None
    slack_app_token: str | None = None
    slack_channel_id: str | None = None
    alert_queue_name: str = "glassbox:alerts"
    worker_poll_interval_seconds: float = 1.0
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("postgres_url")
    @classmethod
    def normalize_postgres_url(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            value = value.replace("postgresql://", "postgresql+psycopg://", 1)
        if value in {
            "postgresql+psycopg://glassbox:glassbox@localhost:5432/glassbox_sre",
            "postgresql+psycopg://glassbox_sre:glassbox_sre@localhost:5432/glassbox_sre",
        }:
            return "postgresql+psycopg://glassbox_sre:glassbox_sre@localhost:15432/glassbox_sre"
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
