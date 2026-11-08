import logging
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.identity import User
from app.oidc import OIDCVerifier, get_oidc_verifier
from app.services.identity import IdentityService

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
    verifier: Annotated[OIDCVerifier, Depends(get_oidc_verifier)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = verifier.verify(credentials.credentials)
    except jwt.InvalidTokenError as error:
        logger.info("OIDC token validation failed: %s", error)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    except jwt.PyJWKClientError as error:
        logger.warning("OIDC signing key retrieval failed: %s", error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OIDC signing keys are unavailable",
        ) from error

    user = IdentityService(db).upsert_user(claims)
    request.state.actor = user
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
