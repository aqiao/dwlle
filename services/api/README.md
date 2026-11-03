# dwlle Control Plane API

FastAPI 控制平面基础工程，当前提供 Workspace 创建、列表和详情查询，使用 SQLite 持久化。真实 OIDC、Scenario/Workflow、执行引擎和 MCP 尚未接入。

## 启动

```bash
cd services/api
uv sync --extra dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

默认地址：

- 健康检查：`http://127.0.0.1:8000/health`
- OpenAPI：`http://127.0.0.1:8000/docs`
- Workspace API：`http://127.0.0.1:8000/api/v1/workspaces`

## 示例

```bash
curl -H 'X-Tenant-Id: tenant-a' \
  -H 'Content-Type: application/json' \
  -d '{"workspace_key":"retail","name":"零售经营分析","environment":"production"}' \
  http://127.0.0.1:8000/api/v1/workspaces

curl -H 'X-Tenant-Id: tenant-a' \
  http://127.0.0.1:8000/api/v1/workspaces
```

## 检查

```bash
uv run ruff check .
uv run mypy app
uv run pytest
```

数据库文件默认是 `services/api/dwlle.db`，已被 `.gitignore` 忽略。可用 `DWLLE_DATABASE_URL` 修改数据库连接。
