# T035：Scenario 与 Workflow 数据模型及版本发布

状态：已完成
日期：2026-11-04

## 目标

在 Workspace 基础上实现 Scenario、Workflow 和 WorkflowVersion 的领域模型、公共 API 与基础 DAG 校验，为 DS 编译和运行中心提供稳定数据契约。

## 范围

- Scenario：创建、列表、详情，包含 Workspace、负责人和 SLA。
- Workflow：创建、列表、详情，包含 scenario、调度、负责人、状态和当前版本。
- WorkflowVersion：不可变 JSON 定义、版本号、draft/published 状态和发布时间。
- 发布时校验节点 ID 唯一、边引用有效和 DAG 无循环。
- 所有接口按 Tenant 和 Workspace 隔离，路由仅负责 HTTP，应用服务负责业务逻辑。
- 更新数据库初始化和 API 文档，补充创建、发布、循环依赖和隔离测试。

## 非目标

- 不实现 DS 编译、真实调度、日志、AI 或前端页面接入。
- 不实现完整权限、补数据、复杂跨工作空间依赖。

## 验收标准

1. Scenario/Workflow 可创建和查询，Workflow 可发布不可变版本。
2. 重复节点、无效边和循环 DAG 被拒绝，版本发布有审计时间。
3. 不同 Tenant 的数据不可互访，ruff、mypy 和全部 pytest 通过。
4. 在 `task/T035-scenario-workflow-foundation` 分支提交，提交信息以 `T035:` 开头。

## 交付说明

### 完成内容

- 实现 Scenario、Workflow、WorkflowVersion 数据模型及公共 API。
- Workflow 发布生成不可变 JSON 版本，记录版本号和发布时间。
- 增加节点唯一性、边引用、自循环和 DAG 循环依赖校验。
- 保持 Tenant/Workspace 隔离和应用服务分层，更新 API 文档。

### 验收标准核对

- [x] 标准 1 —— 真实 API 创建 Scenario/Workflow 并发布 v1，版本状态为 published。
- [x] 标准 2 —— 循环 DAG 返回 422，版本包含发布时间。
- [x] 标准 3 —— 隔离测试通过，8/8 测试通过，ruff 和 mypy 无错误。
- [x] 标准 4 —— 在指定任务分支提交。

### 偏离任务说明之处

无。

### 发现的问题 / 需要设计方决定的事

- 当前 WorkflowVersion 不允许更新定义，后续草稿编辑与重新发布需要明确的版本状态流转。
- DS 编译器尚未实现，是下一切片的关键依赖。
