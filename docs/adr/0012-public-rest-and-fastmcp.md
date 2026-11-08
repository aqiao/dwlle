# 0012 公共 REST 与 FastMCP 共用应用服务

状态：已接受（术语部分被 0014、0015 取代）
日期：2026-11-03

> 现行架构声明（2026-11-08）：现行可执行约束单独列于下节。原 ProjectService、PipelineService、DatasetService 和 `tenant + project` 上下文仅保留作历史记录，不得直接实施。当前使用 WorkspaceService、WorkflowService、DataAssetService、`workspace` 上下文和 `data_asset.*`。

## 现行有效约束

1. dwlle-web 和外部应用共用 `/api/v1` 公共领域 REST，提供 OpenAPI、统一错误码、分页、版本策略、幂等键和异步 Operation/Run 模型。
2. UI 聚合与偏好可以使用内部 BFF，但核心领域能力不得绕过公共权限或只存在于特权接口中。
3. REST 与 FastMCP 共用应用服务。同应用部署时 FastMCP 直接调用 Application Service；独立部署或安全域隔离时可通过 REST 调用同一能力。
4. 应用服务使用 WorkspaceService、ScenarioService、WorkflowService、RunService、DataAssetService、DiagnosisService 等现行名称，承载事务、权限、审计和组合查询。
5. MCP 工具采用语义化白名单，包括 `workflow.*`、`scenario.*`、`run.*`、`data_asset.*` 和 `run.diagnose`，不从 OpenAPI 自动生成。
6. MCP 不得直接访问 Repository、DS、Trino、OpenMetadata 管理接口、数据库或云资源；血缘通过 DataAssetService 从唯一权威 OpenMetadata 查询。
7. REST/MCP 使用统一的 `tenant + workspace + actor + agent + scopes` 上下文，权限取交集，审计保留真实用户和 Agent 身份。
8. Agent 默认只读和草稿；发布、运行、安装、授权、云资源和删除操作必须按风险人工确认。

## 背景

平台需要原生支持外部应用和 AI Agent。前后端分离并不自动形成稳定的公共 API。MCP 通过内部 HTTP 组合 REST 可实现复用，但复杂工具会产生额外调用；同应用部署时，FastMCP 直接调用应用服务更自然。

## 历史决策（不得直接实施）

1. 核心领域 REST 是公共产品契约，dwlle-web 与外部应用共用 `/api/v1`。
2. 纯 UI 辅助接口可以保留，但核心领域能力不得绕过领域权限。
3. REST 与 FastMCP 共用应用服务，同应用部署时直接调用 Application Service。
4. 应用服务曾命名为 ProjectService、ScenarioService、PipelineService、RunService、DatasetService、DiagnosisService。
5. MCP 工具采用语义化白名单，不直接访问 Repository、DS、Trino、数据库或云资源。
6. 身份上下文曾使用 `tenant + project + actor + agent + scopes`。
7. Agent 默认只读和草稿，写操作按风险人工确认。

## 历史理由与后果（仅作历史记录）

- 自家前端成为公共领域 API 的第一个消费者，可避免后续重造接口。
- FastMCP 直接调用应用服务可减少内部 HTTP、序列化和重复认证开销。
- 权限和审计下沉到共享层，防止 MCP 绕过 REST 中间件。
- 公共 API 需要版本兼容和稳定错误契约，变更成本高于纯内部接口。
- MCP 独立部署时仍需通过 REST 或聚合接口避免大量细粒度远程调用。
