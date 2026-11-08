from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import AuditEvent, Role, RoleBinding, User
from tests.conftest import auth_headers


def create_workspace(client: TestClient) -> int:
    response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers(),
        json={"tenant_id": "tenant-a", "workspace_key": "retail", "name": "零售经营分析"},
    )
    assert response.status_code == 201
    return response.json()["id"]


def grant_workspace_role(db: Session, subject: str, workspace_id: int, role: Role) -> None:
    user = db.scalar(select(User).where(User.subject == subject))
    assert user is not None
    db.add(
        RoleBinding(
            user_id=user.id,
            tenant_id="tenant-a",
            workspace_id=workspace_id,
            role=role.value,
        )
    )
    db.commit()


@pytest.mark.parametrize(
    "claims",
    [
        {"iss": "https://wrong-issuer.example"},
        {"aud": "wrong-audience"},
        {"exp": datetime.now(UTC) - timedelta(minutes=5)},
    ],
)
def test_rejects_invalid_oidc_claims(client: TestClient, claims: dict[str, object]) -> None:
    response = client.get("/api/v1/auth/me", headers=auth_headers(**claims))

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired bearer token"


def test_rejects_invalid_signature(client: TestClient) -> None:
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "iss": "http://127.0.0.1:8080/realms/dwlle",
            "sub": "tenant-a-admin",
            "aud": "dwlle-api",
            "iat": now,
            "exp": now + timedelta(hours=1),
        },
        other_key,
        algorithm="RS256",
    )

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


def test_current_user_uses_local_roles(client: TestClient, db_session: Session) -> None:
    workspace_id = create_workspace(client)
    grant_workspace_role(db_session, "tenant-a-developer", workspace_id, Role.DEVELOPER)

    response = client.get("/api/v1/auth/me", headers=auth_headers("tenant-a-developer"))

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "tenant-a-developer"
    assert body["tenants"] == []
    assert body["workspaces"] == [
        {
            "workspace_id": workspace_id,
            "tenant_id": "tenant-a",
            "workspace_name": "零售经营分析",
            "role": "Developer",
        }
    ]


def test_workspace_roles_enforce_read_and_write_permissions(
    client: TestClient, db_session: Session
) -> None:
    workspace_id = create_workspace(client)
    grant_workspace_role(db_session, "tenant-a-viewer", workspace_id, Role.VIEWER)
    grant_workspace_role(db_session, "tenant-a-developer", workspace_id, Role.DEVELOPER)
    scenario_payload = {
        "workspace_id": workspace_id,
        "scenario_key": "fulfillment",
        "name": "订单履约分析",
    }

    viewer_read = client.get(
        f"/api/v1/workspaces/{workspace_id}", headers=auth_headers("tenant-a-viewer")
    )
    viewer_write = client.post(
        "/api/v1/scenarios",
        headers=auth_headers("tenant-a-viewer"),
        json=scenario_payload,
    )
    developer_write = client.post(
        "/api/v1/scenarios",
        headers=auth_headers("tenant-a-developer"),
        json=scenario_payload,
    )

    assert viewer_read.status_code == 200
    assert viewer_write.status_code == 403
    assert developer_write.status_code == 201


def test_token_roles_do_not_grant_application_access(client: TestClient) -> None:
    workspace_id = create_workspace(client)

    response = client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers("outsider", realm_access={"roles": ["Admin"]}),
    )

    assert response.status_code == 403


def test_write_and_denied_access_are_audited(client: TestClient, db_session: Session) -> None:
    workspace_id = create_workspace(client)
    denied = client.get(
        f"/api/v1/workspaces/{workspace_id}", headers=auth_headers("outsider")
    )
    assert denied.status_code == 403

    events = list(db_session.scalars(select(AuditEvent).order_by(AuditEvent.id)).all())
    assert [(event.action, event.outcome) for event in events] == [
        ("workspace.create", "success"),
        ("workspace.access", "denied"),
    ]
    assert events[0].tenant_id == "tenant-a"
    assert events[1].workspace_id == workspace_id


def test_admin_manages_workspace_members(client: TestClient) -> None:
    workspace_id = create_workspace(client)
    assigned = client.put(
        f"/api/v1/workspaces/{workspace_id}/members",
        headers=auth_headers(),
        json={"subject": "tenant-a-viewer", "role": "Viewer"},
    )
    assert assigned.status_code == 200
    member = assigned.json()
    assert member["role"] == "Viewer"

    members = client.get(
        f"/api/v1/workspaces/{workspace_id}/members", headers=auth_headers()
    )
    assert members.status_code == 200
    assert [item["subject"] for item in members.json()] == ["tenant-a-viewer"]

    viewer_assign = client.put(
        f"/api/v1/workspaces/{workspace_id}/members",
        headers=auth_headers("tenant-a-viewer"),
        json={"subject": "outsider", "role": "Viewer"},
    )
    assert viewer_assign.status_code == 403

    removed = client.delete(
        f"/api/v1/workspaces/{workspace_id}/members/{member['user_id']}",
        headers=auth_headers(),
    )
    assert removed.status_code == 204
    viewer_access = client.get(
        f"/api/v1/workspaces/{workspace_id}", headers=auth_headers("tenant-a-viewer")
    )
    assert viewer_access.status_code == 403
