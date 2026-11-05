# T032：FastAPI 控制平面与 Workspace 基础切片

状态：已完成
日期：2026-11-03

## 目标

建立可运行、可测试的 Python 控制平面，为后续 Scenario/Workflow、运行中心和数据资产提供统一公共 API 与应用服务边界。

## 范围

- 创建 `services/api/` Python 3.12 工程，使用 FastAPI、SQLAlchemy 2、Pydantic、uv。
- 提供应用工厂、配置、API v1、健康检查和 OpenAPI。
- 实现 Workspace 创建、列表和详情查询，使用 SQLite 持久化。
- 请求通过 `X-Tenant-Id` 隔离租户，业务数据模型包含 tenant/workspace/environment。
- 路由仅负责 HTTP，WorkspaceService 负责校验、权限上下文和业务逻辑。
- 配置 ruff、mypy strict 和 pytest，覆盖健康检查、创建、列表和租户隔离。
- 提供启动与测试文档。

## 非目标

- 不实现真实 OIDC、生产认证、AWS 部署、DS/Trino/SeaTunnel 适配。
- 不实现 Scenario、Workflow、SQL、数据资产、AI 或 MCP。
- 不引入前端依赖或修改现有原型。

## 验收标准

1. `uv run pytest` 全部通过，`uv run ruff check .` 和 `uv run mypy app` 通过。
2. 启动后可访问 `/health`、OpenAPI 和 `/api/v1/workspaces`，可创建并查询 Workspace。
3. 不同 Tenant 的 Workspace 数据不可互相读取。
4. 路由与 WorkspaceService 分层清晰，请求不直接访问数据库。
5. 在 `task/T032-control-plane-foundation` 分支提交，提交信息以 `T032:` 开头。

## 交付说明

### 完成内容

- 新建 FastAPI 控制平面工程，包含配置、应用工厂、数据库和 API v1。
- 实现 Workspace 创建、列表和详情查询，使用 SQLAlchemy/SQLite 持久化。
- 通过 `X-Tenant-Id` 实现基础租户隔离，路由与 WorkspaceService 分层。
- 配置 ruff、mypy strict、pytest 和启动文档。

### 验收标准核对

- [x] 标准 1 —— 5/5 测试通过，覆盖率 93%；ruff 无错误，mypy 无问题。
- [x] 标准 2 —— 真实 Uvicorn 请求验证 `/health`、OpenAPI 和 Workspace 创建/列表。
- [x] 标准 3 —— 测试及真实请求均确认 tenant-b 不可见 tenant-a 数据。
- [x] 标准 4 —— 路由仅处理 HTTP，WorkspaceService 负责业务逻辑。
- [x] 标准 5 —— 在指定任务分支提交。

### 偏离任务说明之处

无。

### 发现的问题 / 需要设计方决定的事

- 当前 `X-Tenant-Id` 仅用于开发期租户隔离，不是生产认证，后续 OIDC 任务必须替换为可信令牌上下文。
- 当前 SQLite 用于本地验证，生产部署需切换 RDS PostgreSQL 并加入正式迁移。
