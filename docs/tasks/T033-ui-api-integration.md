# T033：Workspace 前后端联调

状态：已完成
日期：2026-11-03

## 目标

将顶部 Workspace 选择器从静态原型数据切换为真实控制平面 API，验证 UI 与 FastAPI 的端到端联通。

## 范围

- 前端新增 typed API client，调用 `/api/v1/workspaces`。
- Vite 开发服务器增加 `/api` 代理到 `127.0.0.1:8000`。
- Workspace 选择器展示真实数据，包含加载中、空列表、后端不可用状态和“全部工作空间”。
- 后端增加开发环境 CORS 配置，保留 `X-Tenant-Id` 开发隔离。
- 更新测试与启动文档，实际启动前后端验证选择器数据。

## 非目标

- 不将 Scenario、Workflow、运行中心等页面接入后端。
- 不实现真实 OIDC、生产认证或 RDS 部署。

## 验收标准

1. 启动 FastAPI 和 Vite 后，Workspace 下拉框显示真实 API 数据，后端不可用时显示明确错误。
2. 前端测试覆盖 API 数据加载和错误处理，现有测试不回归。
3. `uv run pytest`、`uv run ruff check .`、`uv run mypy app`、`npm run build`、`npm run lint`、`npm test` 通过。
4. 在 `task/T033-ui-api-integration` 分支提交，提交信息以 `T033:` 开头。

## 交付说明

### 完成内容

- 新增 typed Workspace API client 和 Vite `/api` 代理。
- 顶部选择器接入真实 Workspace 数据，支持加载、空列表和后端不可用回退。
- 后端增加开发环境 CORS 配置。
- 新增 API 成功/失败测试，总计 12 项，并更新启动文档。

### 验收标准核对

- [x] 标准 1 —— 实际启动前后端，通过 Vite 代理读取真实 Workspace；错误状态有明确提示。
- [x] 标准 2 —— 新增成功/失败测试，12/12 通过，无其他回归。
- [x] 标准 3 —— 后端 5/5 测试、ruff、mypy 通过；前端 build、lint、12 项测试通过。
- [x] 标准 4 —— 在指定任务分支提交。

### 偏离任务说明之处

无。

### 发现的问题 / 需要设计方决定的事

- 当前仅 Workspace 选择器联调，其他页面仍使用模拟数据。
- 前端临时使用 `tenant-a` 请求头，后续 OIDC 需改为可信用户租户上下文。
