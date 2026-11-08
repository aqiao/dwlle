from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db import Base, get_db
from app.main import create_app
from app.models.identity import Role, RoleBinding, User

PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PUBLIC_KEY = PRIVATE_KEY.public_key()


def make_token(subject: str = "tenant-a-admin", **claims: object) -> str:
    now = datetime.now(UTC)
    payload = {
        "iss": settings.oidc_issuer,
        "sub": subject,
        "aud": settings.oidc_audience,
        "iat": now,
        "exp": now + timedelta(hours=1),
        "email": f"{subject}@example.com",
        "name": subject,
        **claims,
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256", headers={"kid": "test-key"})


def auth_headers(subject: str = "tenant-a-admin", **claims: object) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(subject, **claims)}"}


@pytest.fixture()
def session_local(tmp_path: Path) -> Generator[sessionmaker[Session], None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    local = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    with local() as db:
        for tenant_id in ("tenant-a", "tenant-b"):
            subject = f"{tenant_id}-admin"
            user = User(
                issuer=settings.oidc_issuer,
                subject=subject,
                email=f"{subject}@example.com",
                display_name=subject,
            )
            db.add(user)
            db.flush()
            db.add(
                RoleBinding(
                    user_id=user.id,
                    tenant_id=tenant_id,
                    role=Role.ADMIN.value,
                )
            )
        for subject in ("tenant-a-developer", "tenant-a-viewer", "outsider"):
            db.add(
                User(
                    issuer=settings.oidc_issuer,
                    subject=subject,
                    email=f"{subject}@example.com",
                    display_name=subject,
                )
            )
        db.commit()
    yield local
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(session_local: sessionmaker[Session]) -> Generator[Session, None, None]:
    with session_local() as db:
        yield db


@pytest.fixture()
def client(
    session_local: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> Generator[TestClient, None, None]:
    def signing_key(_self: jwt.PyJWKClient, _token: str) -> SimpleNamespace:
        return SimpleNamespace(key=PUBLIC_KEY)

    monkeypatch.setattr(jwt.PyJWKClient, "get_signing_key_from_jwt", signing_key)

    def override_get_db() -> Generator[Session, None, None]:
        with session_local() as db:
            yield db

    app = create_app(run_migrations=False)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
