from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DWLLE_")

    app_name: str = "dwlle Control Plane"
    app_version: str = "0.1.0"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://aqiao@127.0.0.1:5432/dwlle"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"


settings = Settings()
