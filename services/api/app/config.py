from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DWLLE_")

    app_name: str = "dwlle Control Plane"
    app_version: str = "0.1.0"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://aqiao@127.0.0.1:5432/dwlle"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    oidc_issuer: str = "http://127.0.0.1:8080/realms/dwlle"
    oidc_audience: str = "dwlle-api"
    oidc_jwks_url: str | None = None
    oidc_algorithms: str = "RS256"

    @property
    def oidc_algorithm_list(self) -> list[str]:
        return [item.strip() for item in self.oidc_algorithms.split(",") if item.strip()]


settings = Settings()
