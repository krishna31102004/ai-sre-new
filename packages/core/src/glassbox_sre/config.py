from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"
    redis_url: str = "redis://localhost:6379/0"
    database_url: str = "postgresql+psycopg://glassbox_sre:glassbox_sre@localhost:5432/glassbox_sre"
    alert_queue_name: str = "glassbox_sre:alerts"
    local_notifier_output_path: str = "logs/incident-briefs.jsonl"


def get_settings() -> Settings:
    return Settings()
