from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DWLLE_")

    app_name: str = "dwlle Control Plane"
    app_version: str = "0.1.0"
    app_env: str = "development"
    database_url: str = "sqlite:///./dwlle.db"
    api_v1_prefix: str = "/api/v1"


settings = Settings()
