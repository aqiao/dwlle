# 架构与 ADR 一致性只读审查报告

## 摘要结论

发现 **4 项会影响实施方向的文档一致性问题**。当前架构文档已明确自研客户界面、dwlle 为工作流定义事实来源、Trino/Iceberg 数据栈、公共 REST/FastMCP 边界，以及 Alpha/Beta 分阶段范围；ADR-0001、0002、0008 的索引状态和现行说明能够让读者识别其已被取代。

主要风险集中在仍标记为“已接受（部分被取代/调整）”的 ADR。它们保留在“决策”或“后果”段的直接可执行指令，与架构的现行约束相反，但没有逐项标记哪些编号决策已经失效。人类或 AI 实施者若按 ADR 的“决策”部分执行，可能部署错误的数据平面、暴露或嵌入第三方界面，或使用已废弃的 Project/Pipeline/API 导航术语。

本审查严格限于以下文本：`docs/ARCHITECTURE.md`、`docs/adr/README.md` 和 `docs/adr/0001` 至 `0017`。未阅读任务、计划、README、路线图、代码、部署文件，也未判断任何文档所称能力是否已实现。

## 证据与发现

### F1 — 高：ADR-0003 的“已接受”调度部署与界面指令仍可被直接执行，且与现行架构相反

- **位置**：
  - `docs/adr/0003-dolphinscheduler.md:2, 11-12, 24-26`
  - `docs/ARCHITECTURE.md:42-45, 118-120, 140-145`
  - `docs/adr/README.md:8`
- **相互冲突的证据**：
  - ADR-0003 的状态仍为“已接受（部分被 0009、0010 取代）”。其“决策”仍要求在 App 节点通过 docker compose 部署 DS，并与 Superset、dwlle 共用 RDS 实例；其“后果”仍称 DS 界面短期直接向用户开放。
  - 同一 ADR 的现行说明称 DS 现部署在 Kubernetes 数据平面，原生 UI 仅供内部管理员。架构文档也将 DS 放在 Kubernetes 数据平面，规定所有客户路径均在 `dwlle-web` 中、不得给客户 DS 深链接，且定义只由 dwlle 单向编译到 DS。
- **实际影响**：实施者可合理地把 ADR 的正式“决策”段当作仍有效指令，从而创建 docker-compose App 节点部署、共库拓扑或客户 DS UI 访问。这会破坏控制面/数据面边界、自有客户界面与定义单向性。
- **最小文档修复建议**：将 ADR-0003 状态改为“已被 0009、0010 部分取代”，并在每条被取代的原“决策/后果”前标记“历史记录，不得实施”；保留的决策单列为“仍有效约束”（RDS PostgreSQL、JDBC registry、非 MWAA/Step Functions、SQL 质量规则）。ADR 索引同步使用相同状态文字。

### F2 — 高：ADR-0004 仍要求 Superset 嵌入，与禁止 iframe 和自研客户路径的现行边界冲突

- **位置**：
  - `docs/adr/0004-sql-ide-and-bi.md:2, 5, 11-13, 23`
  - `docs/ARCHITECTURE.md:90-108, 114-120`
  - `docs/adr/README.md:9`
- **相互冲突的证据**：
  - ADR-0004 状态仍为“已接受（部分被 0009、0016 调整）”，但其“决策”要求验证期部署 Superset，并长期通过 Embedded SDK 嵌入 `dwlle-web`；“后果”还要求以 guest token 处理该嵌入的账号打通。
  - ADR-0004 自身的现行说明称 Superset 非必装组件、不是默认客户路径，且任何嵌入不得违反“不使用 iframe”。架构文档规定“不使用 iframe”，所有客户可见功能在 dwlle-web 完成，且不向客户提供 DS 或 OpenMetadata 深链接。虽然架构没有逐字禁止 Superset 外链，但“长期嵌入”与该现行界面边界不兼容。
- **实际影响**：实施者无法仅凭 ADR 的状态判断“部署 Superset、客体 token、Embedded SDK”是否为应实现的产品契约；按原决策实施会增加一条未受现行 UI 边界清晰约束的客户操作路径。
- **最小文档修复建议**：把 ADR-0004 中 Superset 的验证期部署、长期嵌入和 guest-token 后果明确标为历史/可选项，或另建 ADR 定义在“不使用 iframe、客户可见界面自研”前提下允许的 BI 集成形式。保留自研 SQL IDE、Monaco、Trino 方言和不使用 Hue 的有效决定。

### F3 — 中：已接受 ADR 的原始 Project/Pipeline、API 上下文和导航决策，与已接受术语 ADR 及架构不一致，索引不足以作为实施判定依据

- **位置**：
  - `docs/adr/0011-solution-scenario-pipeline.md:2, 6, 15-30`
  - `docs/adr/0012-public-rest-and-fastmcp.md:2, 6, 17-30`
  - `docs/adr/0013-workspace-and-solution-market.md:2, 6, 17-23`
  - `docs/adr/0014-workspace-terminology.md:12-28`
  - `docs/adr/0015-workflow-terminology.md:12-20`
  - `docs/ARCHITECTURE.md:10-15, 114-120, 210-244`
  - `docs/adr/README.md:16-20`
- **相互冲突的证据**：
  - ADR-0011、0012、0013 均仍为“已接受”。其正式决策分别规定 Project/Pipeline 三层模型、`ProjectService`/`PipelineService`/`DatasetService` 和 `tenant + project` 上下文，以及含“开放集成”的四项主导航。
  - ADR-0014 已接受并规定 `WorkspaceService`、`/workspaces` 和 `workspace` 上下文；ADR-0015 已接受并规定 Workflow、`WorkflowService`、`/workflows` 和 `workflow.*`。架构采用 Tenant/Workspace/Scenario/Workflow，服务使用 WorkspaceService、WorkflowService、DataAssetService，主导航为“日常工作、数据管理、方案市场”，开发者集成归入工作空间设置。
  - 三个旧 ADR 的顶部“现行架构声明”逐一说明新术语或新导航，但 ADR 索引只把它们概括列为“已接受”（ADR-0011）或“已接受（部分被……调整）”（ADR-0012）/“已接受”（ADR-0013）。尤其 ADR-0011、0013 的索引没有提示术语/导航决策已被后续 ADR 覆盖。
- **实际影响**：接口路径、服务命名、MCP 工具名、身份上下文和导航信息架构均是实现接口。仅按 ADR 索引筛选“已接受”文件的实施者会取得互斥的名称和路径，并可能继续增加 `project`/`pipeline` 兼容层或错误的独立“开放集成”主导航。
- **最小文档修复建议**：将 ADR-0011、0012、0013 的状态统一为精确的“已接受（术语/导航部分被 0014、0015 取代）”，并在索引对应行列出取代编号。各文档把旧的完整“决策”条目拆为“历史决定”和“仍有效语义决定”，使最新的术语 ADR 可作为唯一可执行命名基线。

### F4 — 中：ADR-0010 对 Alpha 节点范围的原始决策仍包含 SeaTunnel，与当前阶段划分相冲突

- **位置**：
  - `docs/adr/0010-self-owned-user-interface.md:7, 19-22, 33`
  - `docs/ARCHITECTURE.md:55-61, 128-135`
  - `docs/adr/README.md:14`
- **相互冲突的证据**：
  - ADR-0010 仍为“已接受”。其决策第 6 条将首版 P0 节点列为 SeaTunnel、Trino SQL、质量检查和通知，并在第 8 条把复杂能力排除在 2026 年 11 月 Alpha 之外。
  - ADR-0010 的现行说明已明确 Trino SQL 与质量检查属于 Alpha，SeaTunnel 属于 Beta，且节点类型和交付阶段以独立开发计划为准。架构的阶段表也把 SeaTunnel 全流程链路放在 Beta；架构的 DAG 段仅称基础 DAG 的节点来自组件注册表，未将 SeaTunnel 归入 Alpha。
- **实际影响**：实施者若把“首版/P0 节点”视为 Alpha 的实现范围，会提前实现或部署 SeaTunnel，违反当前阶段边界并引入不必要的数据面、安全和离线制品工作。
- **最小文档修复建议**：在 ADR-0010 的原决策第 6 条前增加明确的历史范围标记，或将该条改成“首版节点由阶段计划决定；当前 Alpha 为 Trino SQL/质量检查，SeaTunnel 为 Beta”。ADR 索引可将 0010 标为“已接受（阶段范围由架构与阶段计划覆盖）”，避免状态与正文的例外规则脱节。

## 已验证的主要一致性

以下内容在架构文档与当前有效 ADR 的现行声明之间一致，未发现仅凭本文档即可证实的矛盾：

- **产品与平面边界**：自研多租户控制平面结合 Kubernetes 开源数据平面；AWS 是首个基础设施适配器而非产品协议（架构第 1、2、7 节；ADR-0009）。
- **AWS 分区与离线制品**：保留 `aws`/`aws-cn` 兼容约束，禁止硬编码分区端点/ARN，第三方制品经 S3 artifacts bucket 或 ECR 预置，部署不从公网下载（架构第 10、11 节；ADR-0001 的现行说明、ADR-0006）。
- **自有客户界面与 DS 定位**：客户只使用 dwlle-web；DS 是后台受控执行引擎，DS API 集中在服务端 client，DS 原生 UI 只限内部受控排障（架构第 4、5 节；ADR-0010）。
- **SQL IDE、身份与 AI 边界**：React/Monaco/Trino SQL IDE；Keycloak 负责 OIDC，dwlle 管理 Workspace RBAC；首个模型提供方为 Global Bedrock，AI 只读诊断且不直连数据引擎（架构第 3、4、8、9 节；ADR-0004/0005 的现行说明、ADR-0016）。
- **数据资产、血缘与质量权威**：DataAsset 是 dwlle 的业务资产模型；OpenMetadata 是 LineageEdge 唯一权威；dwlle 是质量规则/结果权威；客户经 DataAssetService 使用血缘，OpenMetadata 原生 UI 仅限内部管理员（架构第 5、6 节；ADR-0017）。
- **REST/MCP 边界**：公共 REST 和 FastMCP 共用应用服务，MCP 使用语义化白名单、不得直连 Repository/DS/Trino/OpenMetadata 管理接口或云资源，写操作需人工确认（架构第 5 节；ADR-0012 的现行说明）。

## 无法仅凭本次文档范围判断的事项

- 阶段计划是否与架构阶段表和 ADR 的当前范围相符。
- 代码、CDK、部署脚本及 `versions.json` 是否落实分区兼容、离线制品、最小权限、保留策略或版本选择。
- DS、OpenMetadata、Keycloak 与 FastMCP 的实际网络隔离、身份隔离、审计和权限实现。
- OpenMetadata 人工血缘修正保护、缓存重建、SQL 解析和血缘初始化是否已实现或可行。

## 结论与建议

建议先完成上述四处最小状态/正文修复，再要求后续实施任务只以“当前可执行决策”建立约束。最小且可持续的治理规则是：ADR 一旦部分失效，索引状态必须列出取代 ADR；原 ADR 的每条可执行决策必须明确标为“仍有效”或“历史，不得实施”。这样无需改写历史 ADR，也能避免实施者把旧正文与顶部现行说明当作同等优先级的指令。
