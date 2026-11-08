from functools import lru_cache
from typing import Any

import jwt

from app.config import settings


class OIDCVerifier:
    def __init__(self) -> None:
        jwks_url = settings.oidc_jwks_url or (
            f"{settings.oidc_issuer.rstrip('/')}/protocol/openid-connect/certs"
        )
        self._jwks_client = jwt.PyJWKClient(jwks_url, cache_keys=True, lifespan=300)

    def verify(self, token: str) -> dict[str, Any]:
        signing_key = self._jwks_client.get_signing_key_from_jwt(token)
        claims: dict[str, Any] = jwt.decode(
            token,
            signing_key.key,
            algorithms=settings.oidc_algorithm_list,
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
        return claims


@lru_cache
def get_oidc_verifier() -> OIDCVerifier:
    return OIDCVerifier()
