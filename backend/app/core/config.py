from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings read from environment variables or .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_fallback_models: str = (
        "gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash,gemini-2.0-flash-lite,gemini-1.5-flash,gemini-1.5-flash-8b"
    )
    agent_backend: str = "gemini"
    agent_shared_secret: str = ""
    environment: str = "development"
    agent_max_message_length: int = 500
    agent_rate_limit_per_minute: int = 60
    agent_turn_timeout_seconds: float = 60.0
    cors_origins: str = "http://localhost:3000"
    persona_failure_rate: float = 0.0
    persona_latency_min_ms: int = 200
    persona_latency_max_ms: int = 600
    log_level: str = "INFO"
    database_url: str = ""
    google_genai_use_vertexai: bool = False
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"

    @property
    def fallback_models_list(self) -> list[str]:
        """Ordered list of Gemini models to cascade through if rate limits or quota errors occur."""
        models = [self.gemini_model]
        if self.gemini_fallback_models:
            for m in self.gemini_fallback_models.split(","):
                m = m.strip()
                if m and m not in models:
                    models.append(m)
        return models

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
