# 0015 将 Pipeline 统一命名为 Workflow

状态：已接受
日期：2026-11-03

## 背景

当前 Pipeline 已覆盖数据接入、SQL 转换、质量检查、条件分支、通知、跨引擎任务和调度，超出了狭义数据管道含义。Workflow 更能表达通用工作流编排，也与 DolphinScheduler 的 Workflow 对应。

## 决策

1. **领域层级统一为 `Tenant → Workspace → Environment → Scenario → Workflow → TaskNode`。** Scenario 是业务逻辑组，Workflow 是可独立版本化和执行的技术工作流。
2. **文档、代码和接口使用 Workflow。** 包括 WorkflowVersion、WorkflowService、`/api/v1/workflows`、MCP `workflow.*` 工具和工作流模板。
3. **用户可见界面统一使用中文“工作流”。** 不在同一页面中混用 Pipeline、Workflow 和流程，避免增加非技术用户理解成本。
4. **运行指标按 Workflow 实例统计。** 工作流总数是定义数量，运行中数量是当前执行实例数量，运行成功率按已完成实例计算。
5. **国际化单独立项。** 中文文案与领域英文标识分离，未来通过国际化框架提供多语言，不在当前计划中增加实现。

## 理由

- Workflow 比 Pipeline 更准确地覆盖跨类型任务和编排语义。
- 与 DS 的 Workflow 映射直接，降低引擎适配复杂度。
- 文档/API 与界面文案分别服务开发者和终端用户，不应强制使用同一种语言。

## 后果（含代价与风险）

- 需要同步代码符号、API 路径、MCP 工具、页面、测试和文档，不能只替换导航文字。
- 历史 ADR 中的 Pipeline 保留原义，以本 ADR 为最新定义。
- 后续多语言实现需要维护领域术语表，避免不同语言之间含义漂移。
