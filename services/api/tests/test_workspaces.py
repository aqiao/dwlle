from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_create_and_list_workspaces(client: TestClient) -> None:
    response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers(),
        json={
            "tenant_id": "tenant-a",
            "workspace_key": "retail",
            "name": "零售经营分析",
            "description": "订单与客户数据工作空间",
            "environment": "production",
        },
    )

    assert response.status_code == 201
    workspace = response.json()
    assert workspace["workspace_key"] == "retail"
    assert workspace["tenant_id"] == "tenant-a"
    assert workspace["environment"] == "production"

    list_response = client.get("/api/v1/workspaces", headers=auth_headers())
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = client.get(
        f"/api/v1/workspaces/{workspace['id']}",
        headers=auth_headers(),
    )
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "零售经营分析"


def test_tenant_isolation(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers(),
        json={"tenant_id": "tenant-a", "workspace_key": "finance", "name": "财务数据中心"},
    )
    workspace_id = create_response.json()["id"]

    list_response = client.get(
        "/api/v1/workspaces", headers=auth_headers("tenant-b-admin")
    )
    assert list_response.status_code == 200
    assert list_response.json() == []

    get_response = client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers("tenant-b-admin"),
    )
    assert get_response.status_code == 403


def test_bearer_token_is_required(client: TestClient) -> None:
    response = client.get("/api/v1/workspaces")

    assert response.status_code == 401
    assert response.json()["detail"] == "Bearer token is required"
    assert response.headers["www-authenticate"] == "Bearer"


def test_duplicate_workspace_key_returns_conflict(client: TestClient) -> None:
    payload = {"tenant_id": "tenant-a", "workspace_key": "retail", "name": "零售经营分析"}
    first_response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers(),
        json=payload,
    )
    assert first_response.status_code == 201

    second_response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers(),
        json=payload,
    )
    assert second_response.status_code == 409
