from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_create_and_list_workspaces(client: TestClient) -> None:
    response = client.post(
        "/api/v1/workspaces",
        headers={"X-Tenant-Id": "tenant-a"},
        json={
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

    list_response = client.get("/api/v1/workspaces", headers={"X-Tenant-Id": "tenant-a"})
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = client.get(
        f"/api/v1/workspaces/{workspace['id']}",
        headers={"X-Tenant-Id": "tenant-a"},
    )
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "零售经营分析"


def test_tenant_isolation(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/workspaces",
        headers={"X-Tenant-Id": "tenant-a"},
        json={"workspace_key": "finance", "name": "财务数据中心"},
    )
    workspace_id = create_response.json()["id"]

    list_response = client.get("/api/v1/workspaces", headers={"X-Tenant-Id": "tenant-b"})
    assert list_response.status_code == 200
    assert list_response.json() == []

    get_response = client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers={"X-Tenant-Id": "tenant-b"},
    )
    assert get_response.status_code == 404


def test_tenant_header_is_required(client: TestClient) -> None:
    response = client.get("/api/v1/workspaces")

    assert response.status_code == 400
    assert response.json()["detail"] == "X-Tenant-Id header is required"


def test_duplicate_workspace_key_returns_conflict(client: TestClient) -> None:
    payload = {"workspace_key": "retail", "name": "零售经营分析"}
    first_response = client.post(
        "/api/v1/workspaces",
        headers={"X-Tenant-Id": "tenant-a"},
        json=payload,
    )
    assert first_response.status_code == 201

    second_response = client.post(
        "/api/v1/workspaces",
        headers={"X-Tenant-Id": "tenant-a"},
        json=payload,
    )
    assert second_response.status_code == 409
