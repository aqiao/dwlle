# 架构与阶段开发计划一致性复核报告（第二轮）

## 摘要结论

在限定审阅的五份文档中，**未发现可由文本直接证实、会使实施或阶段验收范围不明确的矛盾或遗漏**。上一轮重点问题已经得到明确处理：

- 架构验证清单已明确仅适用于该阶段纳入 P0 或 P1 的能力；未实施能力必须标注“未实施，不适用”并注明交接阶段。
- Alpha 对 MCP、OpenMetadata 和 Polaris 产品化分别写明不适用范围和 Beta 交接方式；Alpha 的可选 P1 MCP 若已交付，仍要求验证统一权限和审计。
- MCP 的权限、Scope 和审计验收归属已明确：Alpha 仅在实际交付 P1 MCP 时验证，Beta 将其纳入 P0，Preview 对其进行试运行阶段复核。

本次仅阅读并对照 `docs/ARCHITECTURE.md`、`docs/PROJECT_PLAN.md`、`docs/PROJECT_PLAN_ALPHA.md`、`docs/PROJECT_PLAN_BETA.md` 和 `docs/PROJECT_PLAN_PREVIEW.md`。已确认 `docs/PROJECT_PLAN_2026-11.md` 不存在；未读取 Git 历史或任何其他文档、代码和既有报告。

## 证据

### 1. 验证清单已具备按阶段适用性和未实施能力交接规则

- `docs/ARCHITECTURE.md:321-330` 的“11. 架构验证原则”规定，阶段计划只需覆盖其实施范围对应的验证；清单原则仅适用于已进入本阶段 P0 或 P1 的能力。该段进一步要求未实施能力标注“未实施，不适用”并明确交接阶段，且禁止仅因清单而提前实施。
- `docs/PROJECT_PLAN.md:24-29` 规定 P0 是阶段验收范围、P1 不得挤占 P0，且未验收项必须显式交接，不能在阶段切换时视为完成。
- `docs/PROJECT_PLAN_ALPHA.md:180-187` 的“7.1 不适用项与 Beta 交接”落实了这一规则：MCP、OpenMetadata 与 Polaris 产品化均声明 Alpha 不适用范围及 Beta 交接；Alpha 后台 Catalog 的基础恢复仍由 Alpha 第 7 节第 12 项验收，避免将已实施的基础能力误标为不适用。

这些文本相互一致，已消除“架构全阶段清单导致 Alpha 必须提前实现 Beta 能力”的验收范围歧义。

### 2. MCP 权限与审计的实施和验收归属清楚

- `docs/ARCHITECTURE.md:221-226` 定义 FastMCP 仅通过语义化白名单调用应用服务，不直接访问 Repository、DolphinScheduler、Trino、OpenMetadata 管理接口或云资源；REST/MCP 使用统一的 `tenant + workspace + actor + agent + scopes` 上下文，权限取交集，审计保留真实用户与 Agent 身份。
- `docs/PROJECT_PLAN_ALPHA.md:67-77` 将只读 FastMCP 列入 P1，并明确 P1 不进入 Alpha 核心验收；`docs/PROJECT_PLAN_ALPHA.md:182` 补充规定：未实施或未验收 MCP 交接 Beta，但若 Alpha 已交付 P1 MCP，仍须验证统一权限与审计。
- `docs/PROJECT_PLAN_BETA.md:54` 将“公共 REST 与 MCP”列入 Beta P0，要求统一权限、Scope、审计，且明确承接 Alpha 未完成的部分；`docs/PROJECT_PLAN_BETA.md:145-146` 的第 10 项端到端验收要求 REST/MCP 越权被拒绝，审计保留 `actor/agent/scopes`，并不得暴露 OpenMetadata 管理凭证。
- `docs/PROJECT_PLAN_PREVIEW.md:82-83` 的第 7 项在试运行阶段再次验证只读 REST/MCP 血缘与运行查询的权限取交集、越权拒绝、审计字段和管理凭证隔离。

架构约束、Alpha 的条件性验收、Beta 的 P0 交付验收及 Preview 的回归验收形成连续且无冲突的归属链。

### 3. 产品与客户界面边界一致

- `docs/ARCHITECTURE.md:14-22` 明确自研控制平面复用执行引擎，且所有客户操作由自研平台进入。
- `docs/ARCHITECTURE.md:112-132` 明确所有客户可见功能在 `dwlle-web` 中完成；不使用 iframe 或向客户提供 DolphinScheduler/OpenMetadata 深链接。两个原生 UI 仅供内部管理员受控使用，普通用户和客户管理员无直接权限。
- `docs/PROJECT_PLAN.md:26` 将相同约束作为跨阶段规则：客户可见功能只能经 `dwlle-web` 或公共接口，DS/OpenMetadata 原生 UI 仅限内部管理员。
- Alpha 的 P0 自研 UI 完成定义（`docs/PROJECT_PLAN_ALPHA.md:53`）要求核心流程不依赖 DS 原生 UI、iframe 或深链接；Beta 的原生 UI 访问验收（`docs/PROJECT_PLAN_BETA.md:145`）要求普通用户及客户管理员被拒绝、内部管理员经 SSO 和受控 RBAC 使用；Preview 的 P0 安全范围（`docs/PROJECT_PLAN_PREVIEW.md:31-32`）继续要求原生 OpenMetadata UI 不面向客户。

DolphinScheduler 的后台无头执行引擎定位和 dwlle 统一客户界面定位在架构、跨阶段规则与阶段验收中一致。

### 4. 子系统职责、数据权威模型和阶段归属一致

- `docs/ARCHITECTURE.md:74-91` 将 DolphinScheduler 定义为后台调度引擎，将 Polaris 定义为 Iceberg 技术目录，将 OpenMetadata 定义为 LineageEdge 唯一权威存储，并明确 PostgreSQL 不作为权威血缘库。
- `docs/ARCHITECTURE.md:255-275` 规定 OpenMetadata 是创建、更新、删除、人工修正和查询的唯一权威来源，dwlle 缓存或索引必须可从 OpenMetadata 重建且不可作为冲突裁决来源。
- Alpha 明确不交付 SeaTunnel、Polaris 产品界面或 OpenMetadata 血缘（`docs/PROJECT_PLAN_ALPHA.md:12-16`, `80-90`）；Beta 将 SeaTunnel、Polaris 产品化、OpenMetadata 部署、血缘权威与权限化读取纳入 P0（`docs/PROJECT_PLAN_BETA.md:45-61`），并在第 6、8、10、12、13 项端到端验收中分别验证唯一权威、人工修正、权限审计、缓存重建及恢复（`docs/PROJECT_PLAN_BETA.md:141-150`）。
- Preview 将既有标准链路、血缘、质量、权限和恢复作为前置条件（`docs/PROJECT_PLAN_PREVIEW.md:12-16`），并对权威血缘缓存重建及 REST/MCP 权限审计进行验收（`docs/PROJECT_PLAN_PREVIEW.md:81-83`）。

上述安排与架构的 Alpha→Beta→Preview 顺序相符，不存在将 Beta 血缘权威能力提前作为 Alpha P0 验收，或将 dwlle 本地存储表述为第二权威血缘源的文本冲突。

### 5. 阶段时间、里程碑与计划状态没有文本冲突

- 架构阶段表的 Alpha、Beta、Preview、GA 窗口为 2026-11-01～11-30、2026-12-01～12-31、2027-01-01～01-31、2027-02-01～02-20（`docs/ARCHITECTURE.md:47-52`）。
- 总计划使用相同时间和阶段目标（`docs/PROJECT_PLAN.md:13-20`）；三个阶段计划的标题元数据和阶段安排均处于对应窗口内（`docs/PROJECT_PLAN_ALPHA.md:3-6, 95-114`，`docs/PROJECT_PLAN_BETA.md:3-6, 78-97`，`docs/PROJECT_PLAN_PREVIEW.md:3-6, 58-65`）。
- 架构状态为“撰写中”（`docs/ARCHITECTURE.md:3`），总计划状态为“撰写中”（`docs/PROJECT_PLAN.md:3`），Alpha 为“撰写中（待重新批准）”（`docs/PROJECT_PLAN_ALPHA.md:3`），Beta、Preview 为“撰写中（待批准）”（各自第 3 行）。总计划进一步明示三份阶段计划均须重新评审批准后才能成为实施基线（`docs/PROJECT_PLAN.md:30-33`）。

文档没有一处宣称阶段计划已经批准或已成为实施基线，因此状态和批准条件一致。

## 结论

本轮限定范围的文本一致性审查通过，无需提出阻断性或非阻断性文档修复项。当前文档已清楚界定：

1. 阶段验证只覆盖已进入该阶段 P0/P1 的能力。
2. Alpha 尚未实施的能力须“不适用”并显式交接 Beta。
3. MCP 统一权限与审计从架构约束到 Alpha 条件性验证、Beta P0 验收和 Preview 回归验收均有明确责任归属。
4. DS 是后台能力、dwlle 是唯一客户操作界面；OpenMetadata 是唯一权威血缘存储且原生 UI 不面向客户。

## 建议

无须修改本次审阅范围内的文档。

以下事项无法仅凭本次允许阅读的文本判断，因而不构成发现：各阶段计划是否已在文档外实际获批、MCP/权限/审计验收是否已被实现或执行、以及部署与恢复流程是否在真实 AWS 环境中成功验证。这些属于实施状态和验收证据问题，超出本次架构与开发计划文本一致性审查范围。
