# 架构文档与开发计划一致性审查

## 摘要结论

本次只读审查完整阅读了 `docs/ARCHITECTURE.md`、`docs/PROJECT_PLAN.md`、`docs/PROJECT_PLAN_ALPHA.md`、`docs/PROJECT_PLAN_BETA.md` 与 `docs/PROJECT_PLAN_PREVIEW.md`，并仅以这五份文件的文本作为证据。`docs/PROJECT_PLAN_2026-11.md` 当前不存在；未从 Git 历史恢复或读取其内容。

发现 1 项会使阶段验收范围无法按文字直接执行的问题：架构文档将 UI、REST、MCP、OpenMetadata 血缘和 Polaris/OpenMetadata 恢复列为“各阶段开发计划”至少应覆盖的验证，但 Alpha 计划明确将其中 MCP 置为非验收 P1，并把 OpenMetadata 与 Polaris 产品化留到后续阶段。架构文档同时规定具体范围与验收以阶段计划为准，两个规则没有定义优先级或按阶段裁剪方法。

除此之外，所查文本在以下方面一致，未发现可直接证实的矛盾：DolphinScheduler 是由 dwlle 统一界面和应用服务受控调用的后端执行能力；客户不直接使用 DolphinScheduler 或 OpenMetadata 原生 UI；Alpha、Beta、Preview、GA 的日期窗口一致；SeaTunnel、Polaris 产品化和 OpenMetadata 血缘归属 Beta；OpenMetadata 是 LineageEdge 的唯一权威、dwlle 是质量规则和结果的权威；所有计划均处于撰写中并要求重新批准，尚未构成实施基线。

无法仅从这些文件判断各计划最终是否已经重新批准、每一项验收是否已有实现或执行证据，或 GA 是否会通过 Go/No-Go。这些均不在本次文档文本一致性审查的可判断范围内。

## 证据与发现

### [1][中等] 架构的“各阶段至少包括”验收清单与 Alpha 的阶段裁剪互相冲突，未定义如何判定 Alpha 达标

**文件和行号：**

- `docs/ARCHITECTURE.md:67`：具体范围、资源、任务、里程碑和验收以各阶段开发计划为准。
- `docs/ARCHITECTURE.md:323-331`：要求“各阶段开发计划必须覆盖与其实施范围对应的验证，至少包括”，随后列出 UI/公共 REST/MCP 的统一权限与审计、OpenMetadata 唯一权威血缘及可重建缓存和人工修正、以及 Polaris/OpenMetadata 元数据库恢复等项目。
- `docs/PROJECT_PLAN_ALPHA.md:14`：Alpha 明确不交付 Polaris 自研管理界面、SeaTunnel 批量接入或 OpenMetadata 血缘。
- `docs/PROJECT_PLAN_ALPHA.md:75-77`：只读 FastMCP 工具属于 P1，且 P1 不进入 Alpha 核心验收。
- `docs/PROJECT_PLAN_ALPHA.md:83`：OpenMetadata 的部署、血缘初始化、查询和人工修正明确留在后续阶段。
- `docs/PROJECT_PLAN_ALPHA.md:162-178`：Alpha 的端到端验收表未列 MCP 验收，也未列 OpenMetadata 或 Polaris 的恢复验收。
- 对照，`docs/PROJECT_PLAN_BETA.md:144` 已对 REST/MCP 血缘查询列出验收，但只声明权限一致和不暴露管理凭证，未明确覆盖架构要求的 MCP 审计；`docs/PROJECT_PLAN_PREVIEW.md:72-84` 的验收表也未包含 MCP 验收。

**相互冲突证据：**

架构第 11 节的“各阶段”“至少包括”按字面将 MCP、OpenMetadata 血缘和 Polaris/OpenMetadata 恢复放入每个阶段计划必须覆盖的验证集。Alpha 的 P0 边界和验收则明确排除 OpenMetadata/Polaris 的相关能力，并将 MCP 放到不影响 P0 验收的 P1。架构第 2.1 节又把具体验收的裁决交给阶段计划，因而无法从文本判断：第 11 节是所有阶段都必须逐项满足的硬性门槛，还是只有组件已纳入该阶段时才适用的验证原则。

**实际影响：**

实施和验收人员无法一致判定 Alpha 是否可在 11-30 达到完成定义。若第 11 节是无条件门槛，Alpha 必须实施其明确延期到 Beta 的 OpenMetadata、Polaris 恢复和 MCP 验收，造成阶段范围和顺序冲突。若以 Alpha 计划为准，则第 11 节“各阶段至少包括”的范围无法按字面执行，且 Beta/Preview 对 MCP 审计的验收覆盖也没有明确要求。该不确定性会导致任务拆分、测试基线和阶段出口结论不一致。

**最小文档修复建议：**

修改 `docs/ARCHITECTURE.md` 第 11 节的引导句，明确七项原则仅在“该能力已纳入该阶段 P0/P1 实施范围时”才要求对应验证，并允许阶段计划明确标注“未实施，不适用，交接到 <阶段>”。然后在 Alpha 验收或未验收项交接中标明 MCP、OpenMetadata 血缘和 Polaris/OpenMetadata 恢复不适用并交给 Beta；在 Beta/Preview 验收中补一条适用的 MCP 统一权限**与审计**验证，或明确 MCP 未在该阶段范围内及其验收归属。这样保留现有 Alpha/Beta 顺序，不新增产品功能。

## 结论与建议

- 产品与客户界面边界一致：架构规定所有客户可见功能由 `dwlle-web` 完成，DolphinScheduler 和 OpenMetadata 原生 UI 都只供受控内部管理；总计划的跨阶段约束也采用同一边界（`ARCHITECTURE.md:101-128`、`PROJECT_PLAN.md:26`）。
- 子系统职责与阶段部署边界一致：架构将 DolphinScheduler 定义为后台无头调度引擎（`ARCHITECTURE.md:86`），并将 SeaTunnel、Polaris 产品化和 OpenMetadata 集成安排为 Beta（`ARCHITECTURE.md:71-77`）；Alpha 和 Beta 计划的 P0 范围与此相符（`PROJECT_PLAN_ALPHA.md:46-90`、`PROJECT_PLAN_BETA.md:39-75`）。
- 数据权威模型一致：架构与总计划均声明 OpenMetadata 是唯一权威 LineageEdge 存储，dwlle 是质量规则和结果的权威来源（`ARCHITECTURE.md:252-273`、`PROJECT_PLAN.md:27`）；Beta 和 Preview 验收继续要求缓存可从 OpenMetadata 重建（`PROJECT_PLAN_BETA.md:136-147`、`PROJECT_PLAN_PREVIEW.md:75-84`）。
- 日期、里程碑和文档状态一致：架构阶段表与总计划阶段表的 Alpha 至 GA 窗口一致（`ARCHITECTURE.md:71-74`、`PROJECT_PLAN.md:16-19`）；三个阶段计划均标注为待重新批准，且总计划明确它们在重新评审前不是实施基线（`PROJECT_PLAN.md:30-33`）。

建议仅按发现 1 澄清架构验证原则与分阶段验收的适用关系。未发现需要改变产品边界、子系统职责、能力归属、日期或数据权威模型的文本修复。
