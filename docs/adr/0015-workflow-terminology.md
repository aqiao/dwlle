# 0015 将 Pipeline 统一命名为 Workflow

状态：已接受（对象关系以现行架构为准）
日期：2026-11-03

> 现行架构声明（2026-11-08）：本 ADR 的命名决策是将 Pipeline 统一为 Workflow，不再使用原来的线性箭头定义对象归属。Environment 与 Scenario 并列属于 Workspace，原 `Environment → Scenario` 层级仅保留作历史记录，不得直接实施。

## 现行有效约束

1. 文档、代码和接口使用 Workflow，包括 WorkflowVersion、WorkflowService、`/api/v1/workflows`、MCP `workflow.*` 工具和工作流模板。
2. 对象关系统一为：

   ```text
   Tenant
   └─ Workspace
      ├─ Environment
      └─ Scenario
         └─ WorkflowVersion
            └─ Component / TaskNode
   ```

   Scenario 是业务逻辑组，WorkflowVersion 是可独立版本化、发布和执行的技术定义；Environment 是发布、部署和运行上下文。
3. 用户可见界面统一使用中文“工作流”，不在同一页面中混用 Pipeline、Workflow 和流程。
4. 运行指标按 Workflow 实例统计：工作流总数是定义数量，运行中数量是当前执行实例数量，运行成功率按已完成实例计算。
5. 历史 ADR 中的 Pipeline 保留原义，本 ADR 只作为 Pipeline → Workflow 的命名基线，不单独定义对象归属。
6. 国际化单独立项，中文文案与领域英文标识分离，不在当前计划中增加实现。

## 背景

当前 Pipeline 已覆盖数据接入、SQL 转换、质量检查、条件分支、通知、跨引擎任务和调度，超出了狭义数据管道含义。Workflow 更能表达通用工作流编排，也与 DolphinScheduler 的 Workflow 对应。

## 历史决策（不得直接实施）

1. 曾将领域层级写为 `Tenant → Workspace → Environment → Scenario → Workflow → TaskNode`，并把 Environment 置于 Scenario 父链。
2. 文档、代码和接口使用 Workflow，包括 WorkflowVersion、WorkflowService、`/api/v1/workflows`、MCP `workflow.*` 工具和工作流模板。
3. 用户可见界面统一使用中文“工作流”。
4. 运行指标按 Workflow 实例统计。
5. 国际化单独立项。

## 历史理由与后果（仅作历史记录）

- Workflow 比 Pipeline 更准确地覆盖跨类型任务和编排语义。
- 与 DS 的 Workflow 映射直接，降低引擎适配复杂度。
- 文档/API 与界面文案分别服务开发者和终端用户，不应强制使用同一种语言。
- 需要同步代码符号、API 路径、MCP 工具、页面、测试和文档，不能只替换导航文字。
- 后续多语言实现需要维护领域术语表，避免不同语言之间含义漂移。
