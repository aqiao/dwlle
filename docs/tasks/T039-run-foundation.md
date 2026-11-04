# T039：Run 初版数据模型与公共 API

状态：已完成
日期：2026-11-04

## 目标

建立 Run 初版数据模型、迁移和公共 API，使运行实例关联 Tenant、Workspace、Workflow 和不可变 WorkflowVersion，为后续 DS 执行与状态同步提供稳定边界。

## 范围

- Run 记录包含工作流版本、触发方式、执行状态、尝试次数、外部运行 ID、起止时间和错误摘要。
- 提供手动创建 Run、按 Workspace/Workflow 查询列表和查看详情的 `/api/v1` 接口。
- 只能为已发布 Workflow 创建 Run，创建时锁定当前已发布版本，初始状态为 queued。
- 路由仅处理 HTTP，RunService 负责业务规则与租户隔离。
- 补充 pytest 覆盖创建、版本关联、列表、详情、未发布约束和跨租户隔离。

## 非目标

- 不调用 DolphinScheduler，不执行真实任务，不做状态同步、日志、重试或前端接入。
- 不实现定时调度、完整 RBAC 和生产认证。

## 验收标准

1. 已发布 Workflow 可创建 Run，版本关联正确；未发布 Workflow 创建时返回 409。
2. 列表与详情遵循 Tenant/Workspace 隔离，其他 Tenant 不可读。
3. ruff、mypy strict、全部 pytest 通过，真实 PostgreSQL API 验证通过。
4. 在 `task/T039-run-foundation` 分支以 `T039:` 开头提交。

## T039 交付说明

### 完成内容

- 新增 Run 数据模型和 `runs` 表初始化，关联 Workspace、Workflow 和不可变 WorkflowVersion。
- 提供手动创建、按 Workspace/Workflow 查询及详情 API，创建时锁定当前已发布版本，初始状态为 queued。
- RunService 统一处理未发布约束与租户隔离，补充 API 文档和 4 项 Run 测试。

### 验收标准核对

- [x] 标准 1 —— 发布 v1 后创建的 Run 仍关联 v1，再发布 v2 不改变历史 Run；未发布 Workflow 返回 409。
- [x] 标准 2 —— 跨租户详情和列表均返回 404，查询会校验 Workspace 与 Workflow 的归属。
- [x] 标准 3 —— 12/12 pytest 通过，覆盖率 94%；ruff 和 mypy 无错误。真实 PostgreSQL API 创建并查询 Run，返回 `status=queued`、`trigger_type=manual`、`run_count=1`。
- [x] 标准 4 —— 在指定分支以 `T039: add run foundation` 提交。

### 偏离任务说明之处

无。

### 发现的问题 / 需要设计方决定的事

真实 DS 执行、外部运行 ID 和状态同步尚未实现；queued 仅表示控制平面已接受运行请求，不代表 DS 已收到任务。
