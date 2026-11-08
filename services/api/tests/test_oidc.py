import jwt
import pytest

from app.config import settings
from app.oidc import OIDCVerifier


def test_default_jwks_url_uses_keycloak_oidc_certs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str] = {}

    class FakeJWKClient:
        def __init__(self, url: str, **_kwargs: object) -> None:
            captured["url"] = url

    monkeypatch.setattr(settings, "oidc_jwks_url", None)
    monkeypatch.setattr(jwt, "PyJWKClient", FakeJWKClient)

    OIDCVerifier()

    assert captured["url"] == (
        "http://127.0.0.1:8080/realms/dwlle/protocol/openid-connect/certs"
    )
