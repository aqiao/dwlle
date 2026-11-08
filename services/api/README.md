# dwlle Control Plane API

FastAPI 控制平面基础工程，默认使用 PostgreSQL 持久化。当前提供 OIDC/JWT 认证、Workspace 级 RBAC、关键写操作审计，以及 Workspace、Scenario、Workflow、不可变 WorkflowVersion 和 Run API。Run 仅记录关联已发布版本的 queued 实例，执行引擎和 MCP 尚未接入。

## 启动

```bash
cd services/api
uv sync --extra dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

默认地址：

- 健康检查：`http://127.0.0.1:8000/health`
- OpenAPI：`http://127.0.0.1:8000/docs`
- 当前用户：`http://127.0.0.1:8000/api/v1/auth/me`
- Workspace API：`http://127.0.0.1:8000/api/v1/workspaces`

## Keycloak 与 OIDC 配置

运行前提是按 ADR-0016 部署 Keycloak `26.8.1`，并准备 Realm、上游 OIDC Provider 和 `dwlle-web` Public Client。Web Client 必须启用 Authorization Code + PKCE，禁止 implicit flow；Redirect URI 和 Web Origin 只填写实际 dwlle-web 地址。

API 通过以下环境变量配置：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DWLLE_OIDC_ISSUER` | `http://127.0.0.1:8080/realms/dwlle` | 必须与 Token 的 `iss` 完全一致 |
| `DWLLE_OIDC_AUDIENCE` | `dwlle-api` | 必须与 Token 的 `aud` 匹配 |
| `DWLLE_OIDC_JWKS_URL` | 空 | 可选；默认使用 Keycloak issuer 下的 `protocol/openid-connect/certs` |
| `DWLLE_OIDC_ALGORITHMS` | `RS256` | 允许的签名算法，多个值用逗号分隔 |

在 Keycloak 中为 Web Client 配置 Audience Mapper，使 Access Token 包含 `dwlle-api` audience。API 使用 JWKS 验证签名、issuer、audience、`iat` 和 `exp`；OIDC Token 中的角色不会转化为 dwlle 权限。

## 用户与角色引导

首次持有效 Token 访问时，API 按 `issuer + subject` 创建或更新用户身份。新用户默认没有任何 Tenant 或 Workspace 权限，不开放自助注册。

首个 Tenant Admin 通过控制平面命令引导，不需要在浏览器或数据库中写入明文密钥：

```bash
uv run python scripts/provision_admin.py \
  --issuer 'http://127.0.0.1:8080/realms/dwlle' \
  --subject '<keycloak-user-sub>' \
  --tenant-id 'tenant-a' \
  --email 'admin@example.com' \
  --name 'Tenant Admin'
```

Admin 可通过 `/api/v1/workspaces/{id}/members` 为已经至少认证一次的用户授予 `Admin`、`Developer` 或 `Viewer`。角色语义：

- `Viewer`：读取 Workspace、Scenario、Workflow 和 Run。
- `Developer`：包含 Viewer 权限，并可创建 Scenario/Workflow、发布版本和手动运行。
- `Admin`：包含 Developer 权限，并可管理 Workspace 成员；Tenant Admin 还可创建 Workspace。

`X-Tenant-Id` 不再是身份或租户上下文来源。Tenant 和 Workspace 均由本地 `RoleBinding` 决定。

## 示例

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id":"tenant-a","workspace_key":"retail","name":"零售经营分析","environment":"production"}' \
  http://127.0.0.1:8000/api/v1/workspaces

curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://127.0.0.1:8000/api/v1/workspaces
```

## 检查

```bash
uv run ruff check .
uv run mypy app
uv run pytest
```

测试使用本地 RSA 密钥签发真实 JWT，并模拟 JWKS 公钥返回，不需要启动 Keycloak。默认连接是 `postgresql+psycopg://aqiao@127.0.0.1:5432/dwlle`。可用 `DWLLE_DATABASE_URL` 修改连接；生产环境通过 Secrets Manager 注入。

## API 资源

- `GET /api/v1/auth/me`
- `POST/GET /api/v1/workspaces`
- `GET /api/v1/workspaces/{id}`
- `GET/PUT /api/v1/workspaces/{id}/members`
- `DELETE /api/v1/workspaces/{id}/members/{user_id}`
- `POST/GET /api/v1/scenarios?workspace_id=1`
- `GET /api/v1/scenarios/{id}`
- `POST/GET /api/v1/workflows?workspace_id=1`
- `GET /api/v1/workflows/{id}`
- `POST /api/v1/workflows/{id}/publish`
- `GET /api/v1/workflows/{id}/versions`
- `POST /api/v1/workflows/{id}/runs`
- `GET /api/v1/runs?workspace_id=1&workflow_id=1`
- `GET /api/v1/runs/{id}`
