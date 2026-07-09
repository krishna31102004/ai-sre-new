from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    postgres_url: str = "postgresql://glassbox:glassbox@localhost:5432/glassbox_sre"
    openai_api_key: str | None = None
    openai_triage_model: str = "gpt-4.1-mini"
    langsmith_tracing: str | None = None
    langsmith_api_key: str | None = None
    langsmith_project: str | None = "glassbox-sre-dev"
    slack_bot_token: str | None = None
    slack_signing_secret: str | None = None
    alert_queue_name: str = "glassbox:alerts"
    worker_poll_interval_seconds: float = 1.0
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
