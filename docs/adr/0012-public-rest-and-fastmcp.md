# 0012 公共 REST 与 FastMCP 共用应用服务

状态：已接受
日期：2026-11-03

## 背景

平台需要原生支持外部应用和 AI Agent。前后端分离并不自动形成稳定的公共 API；如果只围绕页面设计接口，后续开放时容易重复建设权限、审计和领域逻辑。MCP 通过内部 HTTP 组合 REST 可实现复用，但复杂工具会产生额外调用；同应用部署时，FastMCP 直接调用应用服务更自然。

## 决策

1. **核心领域 REST 是公共产品契约。** dwlle-web 与外部应用共用 `/api/v1`，提供 OpenAPI、统一错误码、分页、版本策略、幂等键和异步 Operation/Run 模型。前端不得通过隐式特权接口绕过领域权限。

2. **纯 UI 辅助接口可以保留。** 工作台聚合、界面偏好和临时展示状态可使用内部 UI/BFF 接口，但核心领域能力不得只存在于这些接口中。

3. **REST 与 FastMCP 共用应用服务。** 默认同控制平面部署时，FastMCP Tool 直接调用 Application Service，不通过 HTTP 组合 REST。独立 MCP 部署或安全域隔离时，可通过 REST 调用同一应用能力。

4. **应用服务承载共享规则。** ProjectService、ScenarioService、PipelineService、RunService、DatasetService、DiagnosisService 等负责业务逻辑、事务、权限、审计和组合查询。REST Controller 只处理 HTTP，FastMCP Tool 只处理 MCP 协议、参数 Schema 和响应裁剪。

5. **MCP 工具采用语义化白名单。** 不根据 OpenAPI 自动暴露全部接口。简单只读工具可直接对应领域查询，场景状态和失败诊断等工具可组合应用服务。禁止 MCP 直接访问 Repository、DS、Trino、数据库或云资源。

6. **统一身份与权限上下文。** 每次 REST/MCP 调用均确定 tenant、project、actor、agent 和 scopes。机器身份与用户委托均受租户隔离、Scope、限流、配额和审计约束；MCP 与 REST 权限取交集。

7. **默认只读，写操作分级审批。** Agent 默认只能查询和生成草稿。发布、运行、Solution 安装、云资源创建、授权和删除必须按风险要求人工确认，首版不开放自动修复。

## 理由

- 自家前端成为公共领域 API 的第一个消费者，可避免后续将页面接口硬改成第三方契约。
- FastMCP 直接调用应用服务可减少内部 HTTP、序列化和重复认证开销，同时保持业务逻辑复用。
- 语义化工具比一一映射 REST 更适合 Agent，也能限制高风险能力暴露。
- 权限和审计下沉到共享层，防止 MCP 绕过 REST 中间件。

## 后果（含代价与风险）

- 首版需要保持 Controller 与 Application Service 的清晰边界，不能把业务逻辑写在 FastAPI 路由中。
- 同进程 FastMCP 的性能优势通常小于数据库、日志和模型开销，不能替代真实基准测试。
- 公共 API 需要版本兼容和稳定错误契约，变更成本高于纯内部接口。
- MCP 独立部署时仍需通过 REST 或聚合接口避免大量细粒度远程调用。
