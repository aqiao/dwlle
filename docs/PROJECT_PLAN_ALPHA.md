# dwlle Alpha 开发计划

版本：v2.3（2026-11-08） · 状态：已确认
计划窗口：2026-11-01～2026-11-30
关联文档：[架构设计](ARCHITECTURE.md)、ADR-0001～0017（含取代关系与各文件现行声明）
上一阶段：无 · 下一阶段：[Beta 开发计划](PROJECT_PLAN_BETA.md)

## 1. 阶段目标

在真实 AWS 账号中交付一套可演示、可重复部署、代码可继续迭代的内部 Alpha，跑通：

> OIDC 登录 → 配置 DataSourceAsset → 创建并发布 Workflow → Trino 查询/CTAS → SQL 质量检查 → DS 定时运行 → 查看 DataAsset、日志和运行状态 → 失败后 AI 只读诊断

Alpha 聚焦自研控制平面、DolphinScheduler 和 Trino。可以为 Trino 查询及 CTAS 部署后台 Iceberg Catalog，但不交付 Polaris 自研管理界面、SeaTunnel 批量接入或 OpenMetadata 血缘。

Alpha 不是生产级 SaaS，不开放自助注册和付费，不承诺生产高可用、跨云、跨账号、实时处理或自动修复。

### 1.1 完成定义

- P0 功能全部通过第 7 节验收，不接受仅页面或接口可用。
- 新环境可按文档重复部署，部署脚本幂等，第三方制品不从公网拉取。
- 关键路径有自动化测试，两个 AWS 分区均可 `cdk synth`。
- 无未处理的明文密钥、公开数据桶、公网管理端口或高危安全问题。
- 提供部署手册、演示脚本、已知限制、成本基线和回滚/恢复说明。
- 不建立 dwlle 权威血缘库，不以自研血缘实现替代 Beta 的 OpenMetadata 集成。

## 2. 资源与决策前提

### 2.1 资源假设

- 平台工程师 1 名全职：AWS/IaC、Kubernetes、开源组件和可观测性。
- 产品工程师 1 名全职：FastAPI、React、Workflow、OIDC 和 AI 工具层。
- 设计/评审/验收投入约 0.2 人月。

编码 agent 可以提高实现速度，但不能替代 AWS 部署、组件兼容、安全和恢复验证。若资源不成立，必须重新评审范围或日期，不得默认省略安全与端到端验收。

### 2.2 决策门槛

- ADR-0001～0017（含取代关系与各文件现行声明） 中与 Alpha 相关的决策作为实施约束。
- Keycloak、Bedrock 和后台 Iceberg Catalog 使用已锁定选型。
- 11-08 前完成 DS、Trino、后台 Catalog 和 Keycloak 的基础兼容性验证。
- 任何范围调整不得把 OpenMetadata 血缘或 SeaTunnel 全流程隐式塞回 Alpha P0。

## 3. 功能边界

### 3.1 P0：Alpha 必须完成

| 领域 | 包含范围 | 完成定义 |
|---|---|---|
| AWS 部署 | 单 AWS Global Region、同账号控制/数据平面、EKS、RDS PostgreSQL、S3、ECR | 新环境按手册部署成功；Global/中国区配置均可 synth |
| 租户与环境 | Tenant、Workspace、Environment；每客户独立数据平面 | 两个租户的产品元数据隔离通过；测试/生产绑定不混用 |
| 认证与权限 | Keycloak 对接一个 OIDC Provider；Admin/Developer/Viewer | 登录、登出、JWT 校验和关键 API 权限测试通过 |
| 自研 UI | 工作台、DAG、SQL IDE、DataAsset、运行中心和管理页 | 核心流程无需 DS 原生 UI、iframe 或深链接 |
| 分层模型 | Scenario/Solution 领域模型与只读原型 | 不影响 Workflow 主链路，不实现生产 Scenario 调度或 Solution 实际安装 |
| 公共接口 | `/api/v1`、OpenAPI、Controller 与 Application Service 分层 | 核心资源统一权限与审计，Web 不调用特权领域接口 |
| DataAsset | DataSourceAsset、DatasetAsset 统一模型；FileAsset 仅预留类型 | DataSource 可配置和测试；Dataset 可查看 Schema/预览；统一资产 ID |
| 环境绑定 | DataAssetBinding、SecretRef、InfrastructureBinding | 同一 WorkflowVersion 可切换 Environment，不复制密钥或物理资源定义 |
| Workflow | Trino SQL、质量检查节点；简单依赖；定时、手动、重试、超时 | dwlle 定义版本化并单向编译 DS；发布、运行和回滚可用 |
| SQL | Trino SELECT、CTAS、结果网格、查询历史 | 查询超时和结果行数限制生效；SQL 可保存为 Workflow 节点 |
| 数据质量 | dwlle 管理非空、唯一、行数阈值、新鲜度规则，Trino 执行 | 结果可见，失败阻止下游；QualityRule/Result 只以 dwlle 为准 |
| 运行中心 | Workflow/任务状态、开始结束时间、重试、受控日志查看 | DS 状态同步一致，长任务不阻塞 API |
| 监控告警 | CPU/内存、任务失败、运行时长、表行数阈值 | 注入故障后产生告警，并能定位到运行实例 |
| AI 诊断 | 失败摘要、最多三个根因候选、证据引用、修复建议 | 只读、脱敏、可反馈；模型不可用时保留规则错误摘要 |
| 内置模板 | 一个“Trino CTAS → 质量检查”模板 | 可从模板创建并运行 Workflow，不依赖市场功能 |
| 运维 | 制品锁定、日志采集、RDS 备份、资源限制、卸载/保留策略 | 完成一次恢复验证和重复部署验证 |

### 3.2 P1：仅在 P0 不延期时完成

- Workflow JSON 导出/导入及兼容性检查。
- Logo、主题色等静态 UI 配置。
- Superset 外链或只读嵌入。
- 第二种模型提供方。
- 简单的数据量趋势图和运行时长趋势图。
- Scenario 只读分组、跨 Workflow 依赖和数据契约展示。
- 只读 FastMCP 工具，包括 `workflow.*`、`run.*`、`data_asset.get_schema` 和已有诊断查询。

P1 不进入 Alpha 核心验收，不因完成 P1 而接受 P0 缺陷。

### 3.3 明确留到后续阶段

- SeaTunnel 批量接入、完整 raw/curated 接入链路。
- Polaris 自研产品界面和完整资产治理。
- OpenMetadata 部署、血缘初始化、血缘查询及人工修正。
- 独立 dwlle 权威 LineageEdge 存储。
- FileAsset 实际接入和文件血缘。
- 生产级 Scenario 调度、Solution 实际安装/升级及公开共享市场。
- 实时 CDC、Flink、Kafka、Spark 默认执行路径。
- MCP 写操作、自动修复、自动扩容和容量预测。
- 多区域、生产级高可用、跨账号/客户 VPC 和中国区实测。

## 4. 里程碑

| 里程碑 | 日期 | 出口条件 |
|---|---|---|
| A0：架构与选型冻结 | 11-03 | Alpha P0 冻结；Catalog/OIDC/模型选型明确 |
| A1：基础技术链路打通 | 11-08 | DS、Trino、后台 Catalog 健康；Trino 查询与 CTAS 成功 |
| A2：AWS 与身份可部署 | 11-15 | EKS/RDS/S3/ECR 和核心组件可重复部署；OIDC 可用 |
| A3：产品闭环可用 | 11-22 | 自研 UI 创建、发布、运行 Workflow；SQL、质量、DataAsset、日志可用 |
| A4：功能冻结 | 11-25 | P0 代码完成；AI 诊断接入；之后只修复缺陷和文档 |
| A5：Alpha 验收 | 11-30 | 端到端、隔离、安全、恢复和重复部署验收通过 |

## 5. 工作安排

本节将阶段目标分解为可独立评审和验收的任务。一个 Git 任务对应一份 `docs/tasks/Txxxx-*.md` 和一个任务分支，不以“周”或“阶段”为单位合并分支。除已有分支外，下列分支名称均为计划，**不代表已经创建分支**。历史 `Txxx` 任务与 `task/Txxx` 分支保留原格式，不回填重命名。

状态统一使用：未开始、进行中、阻塞、已实现待验收、已验收、不适用。Owner 中的“平台”指平台工程师，“产品”指产品工程师，“验收”指设计/评审/验收负责人；每项至少由另一角色交叉审核。历史“已完成”仅表示对应任务文件已有交付记录，不自动等同于本计划 P0 已验收，A5 仍须复核证据。

### 5.1 基础选型与工程骨架（11-01～11-08，A0/A1）

本周已覆盖 Alpha 范围与组件版本冻结、工程骨架、最小网络、EKS/RDS/S3/ECR、后台 Catalog、Trino SELECT/CTAS、DS 基础执行、日志采集及初版领域模型。

| 任务 | Owner / 审核 | 复核目标日 | 统一状态 | 可追溯交付与验收证据 |
|---|---|---|---|---|
| T019 平台中立架构基线 | 产品 / 平台 | 11-10 | 已实现待验收 | `docs/tasks/T019-neutral-platform-baseline.md` |
| T020 Alpha UI 原型 | 产品 / 平台 | 11-16 | 已实现待验收 | `docs/tasks/T020-ui-prototype.md` |
| T021 Scenario/Solution 分层与只读原型 | 产品 / 验收 | 11-16 | 已实现待验收 | `docs/tasks/T021-scenario-and-integration.md`：解决方案安装原型、业务场景原型及交互测试 |
| T022 方案市场与只读模板边界 | 产品 / 验收 | 11-16 | 已实现待验收 | `docs/tasks/T022-workspace-and-solution-market.md`：模板/实例边界及页面测试 |
| T023～T031 UI、术语与组件治理 | 产品 / 验收 | 11-16 | 已实现待验收 | `docs/tasks/T023-light-workspace-theme.md`～`docs/tasks/T031-layout-components-and-css-cleanup.md` 各自交付记录 |
| T032 Workspace 控制平面基础 | 产品 / 平台 | 11-10 | 已实现待验收 | `docs/tasks/T032-control-plane-foundation.md` |
| T033 Workspace 前后端联调 | 产品 / 平台 | 11-10 | 已实现待验收 | `docs/tasks/T033-ui-api-integration.md` |
| T034 PostgreSQL 持久化 | 产品 / 平台 | 11-10 | 已实现待验收 | `docs/tasks/T034-postgresql-migration.md` |
| T035 Scenario 真实模型与公共 API | 产品 / 验收 | 11-16 | 已实现待验收 | `docs/tasks/T035-scenario-workflow-foundation.md`：Scenario 创建/查询、隔离测试和 API 证据 |
| T036 双分区基础设施骨架 | 平台 / 产品 | 11-10 | 已实现待验收 | `docs/tasks/T036-infrastructure-foundation.md` |
| T037 SeaTunnel/Iceberg/Trino 链路验证 | 平台 / 产品 | 11-10 | 已实现待验收 | `docs/tasks/T037-data-plane-validation.md` |
| T038 组件版本锁定 | 平台 / 产品 | 11-10 | 已实现待验收 | `docs/tasks/T038-latest-component-versions.md` |
| T039 Run 初版模型与 API | 产品 / 平台 | 11-16 | 已实现待验收 | `docs/tasks/T039-run-foundation.md` |
| T040 OIDC 与模型选型 | 产品 / 平台 | 11-10 | 已实现待验收 | `docs/tasks/T040-identity-and-model-selection.md` |
| T041 AWS 数据平面部署验证 | 平台 / 产品 | 11-10 | 已实现待验收 | `docs/tasks/T041-aws-data-plane-deployment.md` |
| T042 CI 质量门禁 | 平台 / 产品 | 11-15 | 进行中 | `docs/tasks/T042-cicd-foundation.md`：本地检查已通过，真实 GitHub Actions 与提交仍待验证 |
| T0001 OIDC、Keycloak EKS 与认证集成 | 产品 / 平台 | 11-08 | 已验收 | `docs/tasks/T0001-oidc-auth-integration.md`：EKS、真实 PKCE、RBAC 与测试证据 |
| T001～T003 旧 StarRocks 路线 | — | — | 不适用 | 已被现行架构取代，不生成新分支 |

复核目标日取最早下游依赖与 A5 中较早者。标记为“已实现待验收”的历史任务须由表中审核角色复核证据后才能改为“已验收”，不得直接作为第 5.7 节的已验收前置。

Scenario/Solution 的 P0 最小范围由 T021/T022 的只读原型和 T035 的 Scenario 真实模型共同覆盖，**不新增重复任务**；T0077 的跨 Workflow 依赖和数据契约仍只作为 P1，不得充当上述 P0 的唯一证据。

**停止线：** 11-08 仍不能完成 Trino 查询和 CTAS 时，不进入大规模 UI 开发，先解决 Catalog/Trino 兼容问题。

### 5.2 AWS、身份与资产基础（11-09～11-15，A2）

| 编号 | 任务与交付物 | Owner / 审核 | 目标日 | 状态 | 建议分支 | 任务级验收标准 / 证据 |
|---|---|---|---|---|---|---|
| T0043 | DolphinScheduler Client、版本契约及错误处理 | 平台 / 产品 | 11-10 | 未开始 | `feature/T0043-dolphinscheduler-client-contract` | 契约测试覆盖版本、认证、错误与超时；真实 DS 调用有权限和日志证据 |
| T0044 | Tenant、Workspace、Environment 完整模型与隔离 | 产品 / 平台 | 11-10 | 未开始 | `feature/T0044-tenant-workspace-environment` | 两租户元数据隔离及环境边界自动化测试通过 |
| T0045 | DataAsset 统一模型、DataSourceAsset 与 FileAsset 类型预留 | 产品 / 平台 | 11-12 | 未开始 | `feature/T0045-data-asset-datasource` | DataSource/Dataset 统一 ID 和类型 API 测试通过；File 仅预留无实装 |
| T0046 | SecretRef、DataAssetBinding、InfrastructureBinding 与环境隔离 | 平台 / 产品 | 11-13 | 未开始 | `feature/T0046-secret-ref-environment-bindings` | 同一 WorkflowVersion 切换环境不复用测试 SecretRef，隔离测试通过 |
| T0047 | DataSource 连接测试、Secrets Manager 适配与权限校验 | 产品 / 平台 | 11-14 | 未开始 | `feature/T0047-datasource-connection-test` | 成功/失败连接均受权限控制；凭据仅在 Secrets Manager，审计无明文 |
| T0048 | 组件指标、任务日志、失败与运行时长基础告警 | 平台 / 产品 | 11-14 | 未开始 | `feature/T0048-observability-alerts` | 注入故障后产生告警并定位 Run；CPU/内存、失败、时长和行数证据可查询 |
| T0049 | 最小资源、组件成本及每日运行成本基线 | 平台 / 验收 | 11-15 | 未开始 | `doc/T0049-alpha-cost-baseline` | 记录资源规格、单价来源、估算与可获得的实际账单；无虚构精确分摊 |

主要依赖：T0043、T0044 先验收；T0045 是 T0046/T0047 的前置。OIDC、三种角色、审计和公共 API 权限由 T0001 交付，不重复拆分为新任务。

### 5.3 Workflow、SQL、质量与运行中心（11-16～11-22，A3）

| 编号 | 任务与交付物 | Owner / 审核 | 目标日 | 状态 | 建议分支 | 任务级验收标准 / 证据 |
|---|---|---|---|---|---|---|
| T0050 | 中立 Workflow Schema、组件注册表及参数校验 | 产品 / 平台 | 11-17 | 未开始 | `feature/T0050-workflow-component-registry` | 合法/非法节点、输入输出约束和 DAG 校验测试通过 |
| T0051 | WorkflowVersion 到 DS 的单向编译及版本映射 | 产品 / 平台 | 11-18 | 未开始 | `feature/T0051-dolphinscheduler-workflow-compiler` | 编译器测试及真实 DS 映射可查询；无反向同步或双写 |
| T0052 | 发布、定时、版本回滚及不可变版本生命周期 | 产品 / 平台 | 11-19 | 未开始 | `feature/T0052-workflow-lifecycle` | 发布、定时、回滚均保留不可变版本和审计；环境绑定正确 |
| T0053 | 手动运行、重试、超时及 DS 状态同步 | 产品 / 平台 | 11-20 | 未开始 | `feature/T0053-run-execution-sync` | 手动/重试/超时与 DS 状态一致，长任务不阻塞 API |
| T0054 | Trino SELECT/CTAS、查询超时、结果限制与历史 | 产品 / 平台 | 11-18 | 未开始 | `feature/T0054-trino-sql-query-service` | 真实 Trino 查询/CTAS 成功；超时、扫描/结果限制和历史测试通过 |
| T0055 | SQL IDE 真实查询、结果网格及保存为 Workflow 节点 | 产品 / 平台 | 11-20 | 未开始 | `feature/T0055-sql-ide-integration` | 浏览器执行真实查询、展示结果并保存节点；无特权旁路 |
| T0056 | 非空、唯一、行数阈值、新鲜度规则及失败阻断 | 产品 / 平台 | 11-20 | 未开始 | `feature/T0056-trino-data-quality` | 四类规则均有结果；失败阻断下游，质量权威仅为 dwlle |
| T0057 | DatasetAsset Schema、预览和统一资产 ID 映射 | 产品 / 平台 | 11-21 | 未开始 | `feature/T0057-dataset-schema-preview` | Schema/预览正确且受 Workspace 权限控制，资产 ID 与物理表映射一致 |
| T0058 | “Trino CTAS → 质量检查”内置模板及运行验证 | 产品 / 平台 | 11-21 | 未开始 | `feature/T0058-ctas-quality-template` | 从模板创建、发布、运行成功，目标表及质量结果可见 |
| T0059 | 自研 UI 创建、发布、运行工作流完整联调 | 产品 / 平台 | 11-22 | 未开始 | `feature/T0059-workflow-ui-integration` | 浏览器完成主链路，无 DS 原生 UI、iframe、深链接或特权接口 |
| T0060 | 运行中心状态、节点日志及受控日志查询 | 产品 / 平台 | 11-22 | 未开始 | `feature/T0060-run-center-controlled-logs` | 状态与 DS 一致；日志受角色保护且脱敏，长任务不阻塞 API |

主要依赖见第 5.7 节，不得仅凭任务已实现就进入下游联调，前置任务必须先达到“已验收”。

### 5.4 AI、稳定性与验收准备（11-23～11-29，A4）

**功能编码最迟于 11-25 完成并进入已实现待验收；11-26～29 只允许缺陷修复、证据收集和文档，不得新增 P0 实现。**

| 编号 | 任务与交付物 | Owner / 审核 | 目标日 | 状态 | 建议分支 | 任务级验收标准 / 证据 |
|---|---|---|---|---|---|---|
| T0061 | 失败上下文收集、日志脱敏及证据引用 | 产品 / 平台 | 11-23 | 未开始 | `feature/T0061-diagnosis-context-redaction` | 日志、指标、版本和变更上下文完整；密钥/连接信息不进入模型上下文 |
| T0062 | Bedrock 只读诊断、摘要、根因候选和修复建议 | 产品 / 平台 | 11-24 | 未开始 | `feature/T0062-bedrock-readonly-diagnosis` | 最多三个候选且有证据；不修改 Workflow、不重启、不执行 SQL 修复 |
| T0063 | 模型不可用时规则摘要及诊断反馈 | 产品 / 平台 | 11-25 | 未开始 | `feature/T0063-diagnosis-feedback-fallback` | 停用模型仍有规则摘要；有帮助/无帮助反馈可保存和查询 |
| T0064 | 两租户隔离、安全、越权审计及敏感日志检查 | 平台 / 产品 | 11-25 | 未开始 | `feature/T0064-alpha-security-isolation` | 两租户越权全部拒绝且有审计；无敏感日志、公网管理口或公开数据桶 |
| T0065 | Workspace 并发、查询、扫描量和结果配额 | 产品 / 平台 | 11-25 | 未开始 | `feature/T0065-workspace-resource-guardrails` | 每类限制分别触发并返回明确错误，越权调整配额被拒绝 |
| T0066 | 实装组件恢复、重复部署及保留策略验证 | 平台 / 验收 | 11-25 | 未开始 | `feature/T0066-alpha-recovery-repeat-deploy` | 按下述恢复矩阵逐项验证；重复部署无重复资源且数据保留 |
| T0067 | 部署、升级、回滚、备份恢复和故障处理手册 | 平台 / 验收 | 11-27 | 未开始 | `doc/T0067-alpha-operations-runbooks` | 按手册实际执行部署、回滚和恢复；命令、输入、输出及未实测项明确 |
| T0068 | 演示脚本、已知限制、成本说明和 Beta 交接 | 产品 / 验收 | 11-29 | 未开始 | `doc/T0068-alpha-demo-beta-handoff` | 演示可重复；限制、成本、未验收项和 Beta 交接逐项列出 |

T0066/T0067 的恢复矩阵固定为：

| 对象 | 备份来源 | 恢复动作与可观察结果 |
|---|---|---|
| 产品 RDS 元数据 | RDS 自动备份/快照 | 产品 Workspace、Scenario、WorkflowVersion、RoleBinding 和 Run 映射可读取 |
| DS 元数据 | 同一 RDS 中 DS 数据库/Schema | 已发布 WorkflowVersion 与 DS workflow code 映射及调度定义可恢复 |
| Keycloak 元数据 | 同一 RDS 中独立 `keycloak` schema | 恢复后 OIDC 登录、JWKS、Realm/Client 和用户可继续使用 |
| 后台 Catalog/Polaris 元数据 | Alpha 实装的持久化元数据；若当前仍为内存实现则明确未实施 | 后台 Catalog 可恢复，既有 CTAS 表仍可读取；内存实现不得宣称已恢复 |
| S3 CTAS 数据与相关持久卷 | S3 版本保护、对象存储备份及实装持久卷快照 | 恢复/卸载后可读取既有 CTAS 表，保留策略符合配置，无重复资源 |

OpenMetadata 未部署，继续按第 7.1 节标记不适用并交接 Beta；Polaris 完整产品化、生产 HA 和生产级灾备不借本矩阵提前纳入 Alpha。未实测对象必须进入 T0070 未验收项。

### 5.5 Alpha 最终验收（11-30，A5）

| 编号 | 任务与交付物 | Owner / 审核 | 目标日 | 状态 | 建议分支 | 任务级验收标准 / 证据 |
|---|---|---|---|---|---|---|
| T0069 | Alpha 端到端、两租户、真实 AWS 与双分区模板验收 | 验收 / 双方 | 11-30 | 未开始 | `feature/T0069-alpha-end-to-end-acceptance` | 第 7 节全部适用项通过；记录候选 SHA、Global/CN synth 和 ARN 检查输出 |
| T0070 | 验收报告、逐任务证据、未验收项及发布结论 | 验收 / 双方 | 11-30 | 未开始 | `doc/T0070-alpha-acceptance-report` | 每项标记通过/未通过/未实测/不适用并链接证据；CN 仅 synth 不实测 |
| 缺陷登记 | 汇总验收阻断缺陷，不设置通用修复分支 | 验收 / 双方 | 11-30 | 条件项 | 无汇总分支；每个缺陷独立 `bugfix/Txxxx-具体缺陷` | 每个缺陷有唯一任务说明、分支和回归证据，并由 T0070 引用 |

首个阻断缺陷使用 T0071，后续缺陷按发现顺序分配新的四位编号，**不得把多个不相关缺陷合并为一个通用分支**；没有阻断缺陷时 T0071 不创建，P1 编号保持预留。

### 5.6 P1 可选任务及分支

仅在全部 P0 不延期时安排，不进入 Alpha 核心验收，状态均为“可选未开始”。每项启动时仍须补任务说明、Owner、日期和验收证据。

| 编号 | 可选任务 | 建议分支 | 最低验收证据 |
|---|---|---|---|
| T0072 | Workflow JSON 导出、导入及兼容性检查 | `feature/T0072-workflow-json-portability` | 往返导出导入及不兼容拒绝测试，不包含 SecretRef 明文 |
| T0073 | Logo、主题色等静态 UI 配置 | `feature/T0073-static-ui-branding` | 配置化 UI 测试和构建通过 |
| T0074 | Superset 外链或只读集成 | `feature/T0074-superset-readonly-integration` | 不使用未经 ADR 批准的 iframe；权限与只读路径验证 |
| T0075 | 第二种模型提供方 | `feature/T0075-second-model-provider` | 提供方契约、脱敏、降级及只读测试 |
| T0076 | 数据量与运行时长趋势图 | `feature/T0076-observability-trend-charts` | 真实指标来源、权限和图表测试 |
| T0077 | Scenario 只读分组、跨 Workflow 依赖和数据契约 | `feature/T0077-scenario-readonly-insights` | 只读展示测试，不产生生产调度，不替代 P0 历史证据 |
| T0078 | 只读 FastMCP 工具及统一权限审计 | `feature/T0078-readonly-fastmcp-tools` | 工具白名单、REST 同等权限、真实用户与 Agent 审计测试 |

### 5.7 跨任务依赖与合入门禁

- T0043（DS Client）是 T0051（编译）、T0053（状态同步）和 T0060（日志）的前置。
- T0044 是 T0045/T0046 和 T0064 的前置；T0045 是 T0046/T0047/T0057 的前置。
- T0050 是 T0051/T0052/T0058 的前置；T0051 是 T0052/T0053/T0058/T0059 的前置。
- T0054 是 T0055/T0056/T0057/T0058 的前置；T0056 是 T0058 的前置。
- T0052、T0053、T0054、T0057 是 T0059 的前置，T0059 还须覆盖其调用的发布、运行、SQL、DataAsset 与日志接口。
- T0043/T0053 是 T0060 的前置；T0060 是 T0061 的前置；T0061 → T0062 → T0063。
- 所有支持第 7 节适用操作的 P0 实施任务均为 T0069 的前置，至少显式包括 T0059（UI 主链路）、T0063（AI 降级与反馈）、T0064（隔离安全）、T0065（配额）、T0066（恢复）、T0067（运维手册）和 T0068（演示、限制与 Beta 交接）。T0069 只能在这些任务合入并验收后的候选基线上创建和执行，候选 SHA 必须包含上述合入结果。
- T0069 的全部适用证据是 T0070 的前置；T0070 只引用该候选上的实际输出，不接受其他提交或日期的结果代替。
- 前置任务必须达到“已验收”，不能只达到“已实现待验收”。若直接依赖历史基线，须引用第 5.1 节具体任务及证据。

### 5.8 分支、任务与版本 tag 规则

- 功能、文档、普通缺陷和紧急修复分别使用 `feature/Txxxx-description`、`doc/Txxxx-description`、`bugfix/Txxxx-description`、`hotfix/Txxxx-description`。
- 普通任务分支不写 `alpha` 阶段名。任务归属由任务文档、阶段计划和 GitHub Milestone 管理；`T0069-alpha-end-to-end-acceptance` 中的 `alpha` 是任务名称，不是分支阶段前缀。
- 按依赖关系合入后，从最新目标基线创建下一个任务分支；编号表示计划顺序，不表示应让全部分支长期并行停留。
- 阶段验收后的代码快照使用 Git tag，不为每个任务创建阶段 tag。首个 GA 的推荐标记为 `v1.0.0-alpha.1`、`v1.0.0-beta.1`、`v1.0.0-rc.1` 和 `v1.0.0`。
- 预发布修复后递增为 `v1.0.0-alpha.2`、`v1.0.0-beta.2` 等；GA 后按 SemVer 使用 `v1.0.1`、`v1.1.0` 等版本。tag 只打在验收通过、可部署的合并提交上。

## 6. 工程质量门槛

基础设施任务按仓库规范执行：

```bash
cd infra
npm ci
npm run build
npm run lint
npm test
npx cdk synth -c env=dev-global
npx cdk synth -c env=dev-cn
```

同时要求：

- 遍历 synth 模板，确认不存在字面量 `arn:aws:`。
- Python 通过 ruff、mypy strict 和 pytest；前端通过 lint、类型检查和 vitest。
- DS client、Workflow 编译器、OIDC/RBAC、SQL 限制和 DataAssetBinding 有核心路径测试。
- Shell 脚本使用 `set -euo pipefail`、幂等，并输出 `[dwlle]` 前缀日志。
- 所有资源带 `Project=dwlle`、`Env=<envName>`，客户数据资源按配置保留。
- 新增第三方组件、镜像和模型依赖必须进入版本与制品清单。

## 7. Alpha 端到端验收

| # | 操作 | 预期结果 |
|---|---|---|
| 1 | 在干净 AWS 环境部署发布候选 | 无公网下载；部署可重复；失败有明确日志 |
| 2 | 租户 A 用户经 OIDC 登录 | 获得 Workspace 角色；无权限 API 被拒绝 |
| 3 | 创建 DataSourceAsset 并绑定测试 Environment | 凭据只在 Secrets Manager，连接测试成功 |
| 4 | 从内置模板创建 Workflow | 包含 Trino SQL/CTAS 和质量检查节点，不要求 SeaTunnel |
| 5 | 发布并手动运行 | 目标 Iceberg 表生成，重复运行符合幂等约定 |
| 6 | 设置定时并执行重试和版本回滚 | DS 执行正确，dwlle 状态和审计一致 |
| 7 | 切换生产 Environment 发布同一版本 | 重新绑定生产资源，不复用测试 SecretRef |
| 8 | 查询目标表并查看 DatasetAsset | SQL 限制生效，Schema 和预览正确，不要求血缘 |
| 9 | 将非空或唯一规则制造为失败 | 下游停止，质量结果和告警可见 |
| 10 | 注入错误 SQL 或错误连接并点击 AI 诊断 | 显示摘要、证据、候选原因和建议；不自动修复 |
| 11 | 用租户 B 访问租户 A 的 API/对象 | 所有越权请求被拒绝且有审计 |
| 12 | 按第 5.4 节恢复矩阵恢复产品 RDS、DS、Keycloak、后台 Catalog、S3 CTAS 数据及实装持久卷，并再次部署 | 产品数据、DS 映射和身份可恢复，OIDC 可登录，CTAS 表仍可读取；脚本幂等，无重复资源，未实测项明确列出 |
| 13 | 检查成本、日志、卸载和保留策略 | 成本可解释，无敏感日志，S3/RDS/持久卷保留策略符合配置，不发生测试与生产 SecretRef 混用 |
| 14 | 在验收候选提交上执行 `dev-global`、`dev-cn` synth 和模板 ARN 字面量检查 | 两个分区均 synth 成功，模板不含字面量 `arn:aws:`；命令、提交 SHA、时间和可追溯输出写入 T0070，不宣称中国区实装 |

### 7.1 不适用项与 Beta 交接

- **MCP**：Alpha 仅作为 P1 可选能力，不纳入 P0 核心验收；未实施或未验收部分交接 Beta。若 Alpha 已交付 P1 MCP，则仍须验证统一权限与审计。
- **OpenMetadata**：部署、血缘初始化与查询、人工修正、SSO 和恢复均为 Alpha 不适用项，交接 Beta。
- **Polaris 产品化**：自研管理界面、完整资产治理和完整生产恢复演练为 Alpha 不适用项，交接 Beta；Alpha 部署的后台 Catalog 仍须按第 12 项验证基础恢复和 CTAS 表可读性。

上述不适用项不构成 Alpha P0 缺陷，但必须进入 Beta 交接清单，不得标记为已实施或已验收。

## 8. 风险与应对

| 风险 | 早期信号 | 应对 |
|---|---|---|
| Trino/Catalog 集成超预期 | A1 查询或 CTAS 未通 | 停止 UI 扩张；复审后台 Catalog，不提前引入 OpenMetadata |
| DS 双向同步复杂 | 用户需要直接修改 DS 定义 | 坚持 dwlle 单向编译，DS 只做受控排障 |
| 环境绑定泄漏测试资源 | 生产运行引用测试 SecretRef | 阻断发布并补充 DataAssetBinding 隔离测试 |
| EKS/常驻组件成本过高 | A2 最小成本超出预期 | 调整资源池和规格，如实发布成本 |
| AI 幻觉或泄露 | 建议无证据、上下文含敏感值 | 强制证据引用、脱敏和只读工具；不达标则标为实验功能 |
| Alpha 范围重新膨胀 | 出现 SeaTunnel/OpenMetadata P0 任务 | 移至 Beta，除非重新评审架构和日期 |

## 9. 阶段交付物

- 可部署的后端、前端、数据平面配置和 AWS CDK 代码。
- 锁定的组件/镜像版本及离线制品。
- Trino/质量 Workflow 模板和可复现演示数据。
- 自动化测试、AWS 端到端验收结果和两分区 synth 结果。
- 部署、升级/回滚、备份恢复和故障处理手册。
- 最小运行成本基线、已知限制和 Beta 交接清单。
- 未验收项清单，不以“完成”掩盖未验证能力。
