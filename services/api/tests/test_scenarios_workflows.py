from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def create_workspace(client: TestClient, tenant: str = "tenant-a") -> int:
    response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers(f"{tenant}-admin"),
        json={"tenant_id": tenant, "workspace_key": "retail", "name": "零售经营分析"},
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_scenario_and_workflow_publish(client: TestClient) -> None:
    workspace_id = create_workspace(client)
    scenario_response = client.post(
        "/api/v1/scenarios",
        headers=auth_headers(),
        json={
            "workspace_id": workspace_id,
            "scenario_key": "fulfillment",
            "name": "订单履约分析",
            "owner": "陈默",
            "sla": "每天 06:00 前就绪",
        },
    )
    assert scenario_response.status_code == 201
    scenario_id = scenario_response.json()["id"]

    workflow_response = client.post(
        "/api/v1/workflows",
        headers=auth_headers(),
        json={
            "workspace_id": workspace_id,
            "scenario_id": scenario_id,
            "workflow_key": "orders-daily",
            "name": "订单每日入湖",
            "owner": "陈默",
        },
    )
    assert workflow_response.status_code == 201
    workflow_id = workflow_response.json()["id"]
    assert workflow_response.json()["current_version"] == 0

    publish_response = client.post(
        f"/api/v1/workflows/{workflow_id}/publish",
        headers=auth_headers(),
        json={
            "definition": {
                "nodes": [
                    {"id": "source", "type": "mysql", "config": {"table": "orders"}},
                    {"id": "transform", "type": "trino", "config": {"query": "select 1"}},
                    {"id": "quality", "type": "quality", "config": {"rules": ["not_null"]}},
                ],
                "edges": [
                    {"source": "source", "target": "transform"},
                    {"source": "transform", "target": "quality"},
                ],
            }
        },
    )
    assert publish_response.status_code == 200
    version = publish_response.json()
    assert version["version"] == 1
    assert version["status"] == "published"
    assert version["definition"]["nodes"][0]["id"] == "source"
    assert version["published_at"] is not None

    versions_response = client.get(
        f"/api/v1/workflows/{workflow_id}/versions",
        headers=auth_headers(),
    )
    assert versions_response.status_code == 200
    assert len(versions_response.json()) == 1

    workflow_get = client.get(
        f"/api/v1/workflows/{workflow_id}",
        headers=auth_headers(),
    )
    assert workflow_get.json()["status"] == "published"
    assert workflow_get.json()["current_version"] == 1


def test_workflow_rejects_cycle(client: TestClient) -> None:
    workspace_id = create_workspace(client)
    workflow_response = client.post(
        "/api/v1/workflows",
        headers=auth_headers(),
        json={"workspace_id": workspace_id, "workflow_key": "cycle", "name": "循环工作流"},
    )
    workflow_id = workflow_response.json()["id"]

    response = client.post(
        f"/api/v1/workflows/{workflow_id}/publish",
        headers=auth_headers(),
        json={
            "definition": {
                "nodes": [{"id": "a", "type": "trino"}, {"id": "b", "type": "quality"}],
                "edges": [
                    {"source": "a", "target": "b"},
                    {"source": "b", "target": "a"},
                ],
            }
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Workflow contains a cycle"


def test_workflow_tenant_isolation(client: TestClient) -> None:
    workspace_id = create_workspace(client)
    workflow_response = client.post(
        "/api/v1/workflows",
        headers=auth_headers(),
        json={"workspace_id": workspace_id, "workflow_key": "private", "name": "租户私有工作流"},
    )
    workflow_id = workflow_response.json()["id"]

    response = client.get(
        f"/api/v1/workflows/{workflow_id}",
        headers=auth_headers("tenant-b-admin"),
    )
    assert response.status_code == 403

    list_response = client.get(
        "/api/v1/workflows",
        headers=auth_headers("tenant-b-admin"),
        params={"workspace_id": workspace_id},
    )
    assert list_response.status_code == 403
