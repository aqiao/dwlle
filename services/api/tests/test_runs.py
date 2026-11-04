from fastapi.testclient import TestClient


def create_published_workflow(client: TestClient, tenant: str = "tenant-a") -> tuple[int, int, int]:
    workspace_response = client.post(
        "/api/v1/workspaces",
        headers={"X-Tenant-Id": tenant},
        json={"workspace_key": "retail", "name": "零售经营分析"},
    )
    workspace_id = workspace_response.json()["id"]
    workflow_response = client.post(
        "/api/v1/workflows",
        headers={"X-Tenant-Id": tenant},
        json={
            "workspace_id": workspace_id,
            "workflow_key": "orders-daily",
            "name": "订单每日入湖",
        },
    )
    workflow_id = workflow_response.json()["id"]
    publish_response = client.post(
        f"/api/v1/workflows/{workflow_id}/publish",
        headers={"X-Tenant-Id": tenant},
        json={"definition": {"nodes": [{"id": "source", "type": "postgresql"}], "edges": []}},
    )
    return workspace_id, workflow_id, publish_response.json()["id"]


def publish_next_version(client: TestClient, workflow_id: int) -> int:
    response = client.post(
        f"/api/v1/workflows/{workflow_id}/publish",
        headers={"X-Tenant-Id": "tenant-a"},
        json={
            "definition": {
                "nodes": [
                    {"id": "source", "type": "postgresql"},
                    {"id": "transform", "type": "trino"},
                ],
                "edges": [{"source": "source", "target": "transform"}],
            }
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_create_list_and_get_run(client: TestClient) -> None:
    workspace_id, workflow_id, workflow_version_id = create_published_workflow(client)

    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", headers={"X-Tenant-Id": "tenant-a"}
    )
    assert response.status_code == 201
    run = response.json()
    assert run["workspace_id"] == workspace_id
    assert run["workflow_id"] == workflow_id
    assert run["workflow_version_id"] == workflow_version_id
    assert run["status"] == "queued"
    assert run["trigger_type"] == "manual"
    assert run["attempt"] == 1
    assert run["external_run_id"] is None

    list_response = client.get(
        "/api/v1/runs",
        headers={"X-Tenant-Id": "tenant-a"},
        params={"workspace_id": workspace_id},
    )
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [run["id"]]

    workflow_list_response = client.get(
        "/api/v1/runs",
        headers={"X-Tenant-Id": "tenant-a"},
        params={"workspace_id": workspace_id, "workflow_id": workflow_id},
    )
    assert len(workflow_list_response.json()) == 1

    get_response = client.get(f"/api/v1/runs/{run['id']}", headers={"X-Tenant-Id": "tenant-a"})
    assert get_response.status_code == 200
    assert get_response.json()["workflow_version_id"] == workflow_version_id


def test_unpublished_workflow_cannot_create_run(client: TestClient) -> None:
    workspace_response = client.post(
        "/api/v1/workspaces",
        headers={"X-Tenant-Id": "tenant-a"},
        json={"workspace_key": "retail", "name": "零售经营分析"},
    )
    workflow_response = client.post(
        "/api/v1/workflows",
        headers={"X-Tenant-Id": "tenant-a"},
        json={
            "workspace_id": workspace_response.json()["id"],
            "workflow_key": "draft",
            "name": "草稿工作流",
        },
    )
    workflow_id = workflow_response.json()["id"]

    response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", headers={"X-Tenant-Id": "tenant-a"}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Workflow must be published before creating a run"


def test_run_locks_published_version(client: TestClient) -> None:
    _, workflow_id, first_version_id = create_published_workflow(client)
    first_run_response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", headers={"X-Tenant-Id": "tenant-a"}
    )
    second_version_id = publish_next_version(client, workflow_id)
    second_run_response = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", headers={"X-Tenant-Id": "tenant-a"}
    )

    assert first_run_response.json()["workflow_version_id"] == first_version_id
    assert second_run_response.json()["workflow_version_id"] == second_version_id
    locked_run = client.get(
        f"/api/v1/runs/{first_run_response.json()['id']}", headers={"X-Tenant-Id": "tenant-a"}
    )
    assert locked_run.json()["workflow_version_id"] == first_version_id


def test_run_tenant_isolation(client: TestClient) -> None:
    workspace_id, workflow_id, _ = create_published_workflow(client)
    run_id = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", headers={"X-Tenant-Id": "tenant-a"}
    ).json()["id"]

    get_response = client.get(f"/api/v1/runs/{run_id}", headers={"X-Tenant-Id": "tenant-b"})
    assert get_response.status_code == 404

    list_response = client.get(
        "/api/v1/runs",
        headers={"X-Tenant-Id": "tenant-b"},
        params={"workspace_id": workspace_id},
    )
    assert list_response.status_code == 404

    workflow_list_response = client.get(
        "/api/v1/runs",
        headers={"X-Tenant-Id": "tenant-b"},
        params={"workspace_id": workspace_id, "workflow_id": workflow_id},
    )
    assert workflow_list_response.status_code == 404
