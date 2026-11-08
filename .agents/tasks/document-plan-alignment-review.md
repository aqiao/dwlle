# 文档与开发计划一致性只读审查报告

## 摘要结论

**结论：当前文档集不完全一致，且尚不能作为无歧义的实施基线。** 本次审查确认了架构、路线图和分阶段计划对“DolphinScheduler 作为后台能力，客户使用 dwlle 自有统一界面”以及 OpenMetadata 血缘权威模型的大部分表述是一致的。但是，审查简报指定为权威基线的 `docs/PROJECT_PLAN_2026-11.md` 在工作区不存在（Git 状态显示为删除），替代计划仍标为“撰写中/待批准”，而 README 和 ROADMAP 同时将其称为“当前基线”。此外，两个仍标为“已接受”的旧 ADR 仍含有会导致实施者暴露 DS UI、将 DS 部署在过时 Docker Compose 形态，或将 Superset 嵌入客户界面的有效指令。

以下发现只包含可由当前文档文本直接证实、会改变实现方向或使编码 Agent 产生歧义的问题；未提出纯格式或文风建议。

## 审查范围与方法

- 权威对照目标：`docs/ARCHITECTURE.md` 与简报指定的 `docs/PROJECT_PLAN_2026-11.md`。后者缺失，故以仓库中新增的 `docs/PROJECT_PLAN.md`、`PROJECT_PLAN_ALPHA.md`、`PROJECT_PLAN_BETA.md`、`PROJECT_PLAN_PREVIEW.md` 作为候选替代文件进行交叉检查，但不把它们擅自认定为已批准权威基线。
- 已完整阅读：`README.md`、`docs/ROADMAP.md`、`docs/BACKLOG.md`、ADR-0001～0017、ADR 索引，以及 `docs/tasks/` 下 OA001、OA002、T001～T003、T019～T042 任务说明。
- 特别核对：DS 的客户界面边界、阶段范围和状态、术语更新、OpenMetadata 唯一血缘权威、旧 ADR 的取代关系，以及任务与阶段计划的可追溯性。
- 未审查代码、部署结果或未跟踪的 `sessionmanager-bundle` 文件；未运行会写入工作区、启动服务或部署 AWS 的命令。

## 发现与证据

### [DPA-01][阻塞] 简报指定的权威开发计划已不存在，候选替代计划尚未获批

**涉及文件和行号：**

- `docs/PROJECT_PLAN_2026-11.md`：文件不存在；本次只读 `git status --short` 显示该受简报指定的文件为 `D docs/PROJECT_PLAN_2026-11.md`。
- `docs/ARCHITECTURE.md:3`：架构状态为“撰写中”。
- `docs/ARCHITECTURE.md:67-75`：架构将具体范围、资源、任务、里程碑和验收委托给分阶段计划。
- `docs/PROJECT_PLAN.md:3, 23-32`：总计划状态为“撰写中”，并明确 Alpha/Beta/Preview 重新评审批准后才可作为实施基线。
- `docs/PROJECT_PLAN_ALPHA.md:3`、`docs/PROJECT_PLAN_BETA.md:3`、`docs/PROJECT_PLAN_PREVIEW.md:3`：三个阶段计划分别为“撰写中（待重新批准）”或“撰写中（待批准）”。
- `README.md:5`：将 ADR-0009～0017 和“阶段开发计划”称为“当前基线”，且宣称处于“内部 Alpha 实施阶段”。
- `docs/ROADMAP.md:3`：同样将架构、ADR-0009～0017 和阶段计划称为“当前基线”。

**相互冲突的证据：**

简报要求以 `PROJECT_PLAN_2026-11.md` 为权威基线，但该文件不在工作区。新计划正文又明确说，在重新批准前不能作为实施基线；README 和 ROADMAP 却已将同一批待批准文档标记为当前基线并引导编码 Agent 按其执行。

**影响：**

编码 Agent 无法确定应以已删除的旧 11 月计划、待批准的新分阶段计划，还是现有已完成任务说明作为范围和验收依据。由于架构第 2.1 节把具体任务与验收下放给计划，这不是单纯的文档链接问题，而是会阻断任务范围、阶段顺序和“已完成/待实施”判断。

**最小文档修复建议：**

选择并明确一种状态，不要同时保留两种含义：

1. 若新计划已获批准，将 `ARCHITECTURE.md`、`PROJECT_PLAN*.md` 的状态更新为已接受/当前实施基线，并在仓库中保留一个简短的 `PROJECT_PLAN_2026-11.md` 迁移说明或从该路径重定向到新计划入口。
2. 若尚未获批准，将 README 与 ROADMAP 的“当前基线/实施阶段”改为“待批准候选计划”，并明确当前允许执行的任务仅限哪些已批准任务。

### [DPA-02][高] ADR-0003 仍被列为有效，却要求客户直接使用 DS UI，并规定已过时的 DS 部署形态和 StarRocks 任务

**涉及文件和行号：**

- `docs/adr/README.md:10`：ADR-0003 状态为“已接受”。
- `docs/adr/0003-dolphinscheduler.md:5`：前言仅排除了 StarRocks 专属任务类型等“后果”，并称 DS/RDS 决策继续有效。
- `docs/adr/0003-dolphinscheduler.md:12-14`：要求 DS 部署在 App 节点 Docker Compose，且与 Superset、dwlle 共用 RDS 实例。
- `docs/adr/0003-dolphinscheduler.md:23-25`：要求 StarRocks 任务类型，并说明 DS UI 短期直接暴露给用户。
- `docs/adr/0010-self-owned-user-interface.md:14-18,36`：客户可见界面 100% 由 dwlle-web 提供；DS 仅为后台执行引擎；原生 UI 仅限内部管理员；ADR-0010 取代 ADR-0008。
- `docs/ARCHITECTURE.md:47-59, 101-124`：数据平面部署在 Kubernetes；DS 是后台调度组件；全部客户可见功能在 dwlle-web 完成，不提供 DS 深链接或原生 UI。
- `docs/PROJECT_PLAN_ALPHA.md:52-53, 79-80`：Alpha 目标是自研 UI，核心流程不使用 DS 原生 UI、iframe 或深链接，且 DS 部署属于 EKS 数据平面工作。

**相互冲突的证据：**

ADR-0003 的“直接暴露给用户”与 ADR-0010 的“客户不登录 DS、不提供深链接、原生 UI 仅内部管理员”直接相反。ADR-0003 的 Docker Compose App 节点和 StarRocks 任务类型也与现行 Kubernetes 开源数据平面及 Trino/SeaTunnel/Iceberg 路线不一致。ADR-0003 的前言没有将这些段落标为被 ADR-0009/0010 取代，ADR 索引仍把整条 ADR 标为已接受。

**影响：**

按 `AGENTS.md` 流程阅读全部已接受 ADR 的实现者，可能合理地把 DS UI 暴露、DS Docker Compose 部署或 StarRocks DS 插件纳入新任务。该风险正好违背产品已明确的统一 dwlle 界面方向。

**最小文档修复建议：**

不必删除历史 ADR。将 ADR-0003 状态和前言改为“部分被 0009、0010 取代”，逐项写清仅保留“DS 为调度后端、使用 RDS PostgreSQL、SQL 质量规则自研”的决定；明确 `Docker Compose`、`Superset 共库`、`StarRocks 任务类型`、`客户直接使用 DS UI` 均不再有效。同步在 ADR 索引标示该部分取代关系。

### [DPA-03][高] 仍有效的 ADR、Alpha P1 和 BACKLOG 允许 Superset 客户嵌入，与“全部客户界面自研”发生方向冲突

**涉及文件和行号：**

- `docs/adr/README.md:11`：ADR-0004 仍标为“已接受”。
- `docs/adr/0004-sql-ide-and-bi.md:5,12-14,23`：前言称“BI 复用开源组件方向不变”，决策包括验证期 Superset SQL Lab 和长期通过 Embedded SDK 嵌入 dwlle-web，后果要求 Guest Token 打通。
- `docs/PROJECT_PLAN_ALPHA.md:71`：Alpha P1 列出“Superset 外链或只读嵌入”。
- `docs/BACKLOG.md:12,20-22`：候选方向仍是将 Superset 受控嵌入 dwlle-web，并评估 Guest Token 与 OIDC/RBAC 映射。
- `docs/ARCHITECTURE.md:20,101-124`：所有客户操作和客户可见功能应经自研平台/dwlle-web；不使用 iframe。
- `docs/adr/0010-self-owned-user-interface.md:14-18`：客户可见界面 100% 由 dwlle-web 提供，以保持统一交互、权限和审计。

**相互冲突的证据：**

“嵌入 Superset”会将开源产品的 UI 作为客户操作路径，与架构和 ADR-0010 的全部客户界面由 dwlle 提供不相容。Alpha P1 将其列为本阶段可做范围，会让该方向比 BACKLOG 的候选性质更具可执行性。当前文本没有说明 Superset 只能作为非客户可见的内部工具，也没有建立一个允许该例外的 ADR。

**影响：**

实现者可能把 Guest Token、嵌入容器或外链纳入 Alpha，形成第二个客户界面、另一套会话/RBAC 边界，违反用户要求的统一 dwlle 体验。即使 P1 不属于 P0，仍会挤占 Alpha 工期并让后续权限模型返工。

**最小文档修复建议：**

在 ADR-0004 标明 Superset 嵌入决定已被 ADR-0010 取代，保留自研 SQL IDE 决策；从 Alpha P1 移除“Superset 外链或只读嵌入”。BACKLOG 可保留 BI 候选能力，但需改为“以 dwlle 自研客户界面消费 BI/查询能力；不得嵌入或外链 Superset 客户 UI”，除非未来通过新 ADR 明确批准一个产品边界例外。

### [DPA-04][中] 新术语已统一为 Workspace/Workflow，但多个仍“已接受”的规范 ADR 仍以 Project/Pipeline 写成当前决策，索引未显示其术语已过时

**涉及文件和行号：**

- `docs/adr/0014-workspace-terminology.md:14-27,40`：将 `Project` 统一为 `Workspace`，要求 API 使用 `/workspaces`、`WorkspaceService` 和 `workspace` 上下文，并说历史 ADR 保留原义、以本 ADR 为最新术语基线。
- `docs/adr/0015-workflow-terminology.md:13-15,27`：将 `Pipeline` 统一为 `Workflow`，并说 API、代码和文档应使用 Workflow。
- `docs/adr/0011-solution-scenario-pipeline.md:13-25`：仍以 Project、Pipeline、PipelineVersion 和跨 Project 引用描述其核心决策。
- `docs/adr/0012-public-rest-and-fastmcp.md:18,22`：仍把规范应用服务写为 `ProjectService`/`PipelineService`，身份上下文写为 `project`。
- `docs/adr/0009-neutral-control-and-data-plane.md:18-20,35-39`：仍将产品事实来源写为 Project/Pipeline。
- `docs/adr/README.md:16-22`：ADR-0009、0011、0012、0014、0015 全部仅显示“已接受”，没有标示 0009/0011/0012 的术语部分已由 0014/0015 更新。
- `docs/ARCHITECTURE.md:22,136-169,204-224`：现行架构已经使用 Workspace/Workflow、`WorkflowService` 和 `/workspaces`、`/workflows`。

**相互冲突的证据：**

ADR-0014/0015 的决策明确要求新接口、服务名和上下文采用 Workspace/Workflow；仍标为已接受的 ADR-0011、0012 和 0009 却把旧符号写在其“决策”条款中。ADR-0014/0015 虽说明历史 ADR 不重写，但 ADR 索引没有让按“所有已接受 ADR”工作的读者知道这些是保留的历史术语而非当前接口契约。

**影响：**

实现任务可能新增 `ProjectService`、`PipelineService`、`project` 权限上下文或旧 API 路径，与已存在的 `WorkspaceService`/Workflow 模型平行，造成不必要的双术语实现。问题不仅是显示名称，因为 ADR-0012 将这些名称作为应用服务和身份上下文的技术契约。

**最小文档修复建议：**

保留历史正文，但在 ADR-0009、0011、0012 顶部增加显式“术语部分已由 ADR-0014 和 ADR-0015 取代”的说明，列出旧词到现行词的映射；ADR 索引相应显示“已接受（术语由 0014/0015 更新）”。这保持 ADR 不改写历史的规则，同时让实现者能确定现行符号。

### [DPA-05][中] 阶段计划没有任务清单或任务映射，现有任务说明普遍不标明所属阶段，无法执行 ROADMAP 要求的范围与状态核对

**涉及文件和行号：**

- `docs/ROADMAP.md:40-48`：要求每个任务说明明确所属阶段，并要求任务范围归属一个阶段、跨阶段依赖和未验收项在对应阶段计划中显式记录。
- `docs/ARCHITECTURE.md:67-75`：将“具体范围、资源、任务、里程碑与验收”下放给阶段开发计划。
- `docs/PROJECT_PLAN_ALPHA.md:38-110`、`docs/PROJECT_PLAN_BETA.md:37-107`、`docs/PROJECT_PLAN_PREVIEW.md:26-90`：列出 P0/P1、里程碑和工作安排，但未列出或映射 `docs/tasks/` 的任务编号与状态。
- `docs/tasks/T032-control-plane-foundation.md:1-5`、`T041-aws-data-plane-deployment.md:1-5`、`T042-cicd-foundation.md:1-5`：分别有任务状态和日期，但没有“所属阶段”字段；T032/T041 标为已完成，T042 标为进行中。
- `docs/tasks/T019-neutral-platform-baseline.md:12-21`：历史任务仍将 `PROJECT_PLAN_ALPHA.md` 称为现行计划，而该候选计划现在是待重新批准状态。

**相互冲突的证据：**

ROADMAP 要求任务必须明确阶段，架构又规定阶段计划维护任务；但当前阶段计划没有任务 ID 映射，已存在的任务说明也通常没有阶段字段。仅能根据日期、文字或任务内容推断 T032～T042 与 Alpha 的关系，不能由文本确定其是否属于新 Alpha v2、是否仍有效、以及已完成任务的验收能否被新计划接收。总计划第 23 行还要求后续阶段不得默认继承“已完成”状态，却没有可记录或核对交接的任务清单。

**影响：**

编码 Agent 无法确定新任务应依赖 T032～T042 哪些产物，或哪些“已完成”声明在重划 Alpha/Beta（特别是 Polaris、SeaTunnel、OpenMetadata）后仍可作为阶段验收证据。任务顺序与范围因此无法在文档层面可靠执行。

**最小文档修复建议：**

在每份阶段计划中增加一个最小任务映射表：任务 ID、状态（计划/进行中/历史完成/需重新验收）、所属阶段、前置任务和是否计入该阶段 P0。为已有和新增 `docs/tasks/Txxx-*.md` 增加“所属阶段”和“计划版本”元数据。对重划后不自动接受的 T019～T042，标注“历史完成，待 Alpha v2 重新验收”或明确哪些验收证据被接收。

## 已确认一致的事项

- **DS 用户界面方向（在现行架构、ROADMAP 和分阶段计划中）：** `ARCHITECTURE.md:20,101-124`、`ROADMAP.md:20-22`、`PROJECT_PLAN.md:23-29`、`PROJECT_PLAN_ALPHA.md:52-53` 均将客户操作限定在 dwlle-web/公共接口，并将 DS/OpenMetadata 原生 UI 限于内部管理员。DPA-02 是仍有效旧 ADR 未被正确标注的例外，而不是当前架构正文互相冲突。
- **血缘权威与阶段归属：** `ARCHITECTURE.md:251-263`、ADR-0017:11-27、`PROJECT_PLAN_ALPHA.md:79-87` 与 `PROJECT_PLAN_BETA.md:40-57` 一致：Alpha 不建立独立权威血缘库；Beta 才部署并集成 OpenMetadata，且它是 LineageEdge 唯一权威。
- **质量权威：** `ARCHITECTURE.md:265-272`、ADR-0017:17、`PROJECT_PLAN_BETA.md:53-54` 一致地规定 dwlle 是 QualityRule/QualityResult 权威，Trino 执行 SQL 质量检查，OpenMetadata 只能拥有只读展示副本。
- **阶段顺序和日期：** 架构第 2.1 节、ROADMAP 第 8-16 行、`PROJECT_PLAN.md:14-20` 和各阶段文件的计划窗口相互一致，均为 Alpha（2026-11）→ Beta（2026-12）→ Preview（2027-01）→ GA（2027-02）。

## 无法从文档文本判定的事项

- 无法确认删除 `PROJECT_PLAN_2026-11.md` 是否有预期的 Git 重命名/迁移提交，或新分阶段计划是否已通过会议批准；当前文本和工作区状态只能证明它们尚未被文档标为已批准。
- 无法根据文档确认 T032～T042 的实现是否真正满足新 Alpha v2 的 P0 验收，或 T041 的真实 AWS 结果是否仍存在。该问题需要代码、Git 历史和 AWS 证据，不属于本次只读文档一致性审查。
- 无法判定未来 BI 是否应使用 Superset 的后端能力而不暴露其 UI；当前问题只针对文件明确写出的客户外链/嵌入 UI 方向。

## 结论与修复优先级

在创建或继续执行实现任务前，先完成 DPA-01：恢复/重定向权威计划路径并统一批准状态。随后处理 DPA-02 与 DPA-03，清楚撤销旧 ADR 和 Alpha P1 中与统一 dwlle 客户界面相反的可执行指令。最后通过 DPA-04、DPA-05 将术语取代关系和任务到阶段的映射显式化，使人类与 AI 编码工具能以同一套当前边界、顺序和验收状态工作。
