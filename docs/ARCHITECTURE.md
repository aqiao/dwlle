# dwlle 架构设计

版本：v0.6（2026-11-03） · 状态：已接受
目标版本：2026-11-30 内部 Alpha
决策依据：ADR-0009～0015

> v0.6 将 Pipeline 统一调整为 Workflow，文档/API 使用 Workflow，用户可见界面使用中文“工作流”。历史设计与理由保留在 Git 和 ADR 中。

## 1. 产品定位与目标

面向在 AWS 上建设数据平台的中小企业，提供一套可迁移、成本可观测、低门槛的数据开发与运维平台：

> 复用解决方案 → 编排业务场景 → 开发 Workflow → 质量与血缘 → AI 辅助诊断 → REST/MCP 开放集成

首版的价值不是增加另一种计算引擎，而是把成熟开源组件整合成统一产品，并减少部署、开发、排障和成本管理负担。

### 1.1 设计原则

1. **自研控制平面，复用执行引擎。** 不自研调度器、传输引擎、SQL 引擎或存储引擎。
2. **客户界面全部自研。** DolphinScheduler 只作为后台执行引擎，不属于客户操作路径。
3. **三层产品抽象。** Workspace 负责运行治理，Scenario 负责业务协作，Workflow 负责技术执行；Solution 是可共享的工作空间级版本化模板。
4. **定义与环境绑定分离。** 共享定义不包含真实凭据或授权，安装时由目标管理员绑定并批准资源。
5. **API-first。** dwlle-web 与外部应用共用公共领域 REST，FastMCP 与 REST 共用应用服务，不重复业务逻辑。
6. **数据开放。** 默认数据格式为 Iceberg/Parquet，产品元数据可导出，不以专有格式锁定客户。
7. **协议中立，适配器具体。** 通用协议不依赖 AWS；云网络、密钥和资源供应通过适配器实现。
8. **单向编译，避免双写。** dwlle Workflow 单向编译到 DS，不在两个系统间双向同步定义。
9. **AI 只读优先。** 默认查询与草稿，写操作按风险审批，首版不自动修复。
10. **按中小客户控制默认复杂度。** 首版不默认部署 Spark、Flink、Kafka、完整数据治理平台和商业市场。

## 2. 总体架构

```text
dwlle-web             外部应用                AI Agent
   │                      │                       │
   └────── 公共 REST /api/v1（OpenAPI） ───┐       │ MCP
                                          │       ▼
┌──────────────────────────────────┐   FastMCP Tools（语义化白名单）
│ 身份、租户、Scope、限流、审计、配额  │ ◀──────────────┘
└───────────────────┬──────────────┘
                    ▼
┌──────────────────── 应用服务层（自研） ───────────────────────┐
│ Workspace / Scenario / Workflow / Run / Dataset / Diagnosis    │
│ Solution / Quality / 权限与 Operation                         │
│                                                             │
│ dwlle-web：Solution、Scenario、DAG、SQL、资产、运行与 AI 诊断   │
│ PostgreSQL：产品定义、版本和运行索引                            │
│ ModelProvider：可替换模型实现                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ 受控执行适配器
                        ▼
┌──────────────────── 数据平面（Kubernetes） ───────────────────┐
│ DolphinScheduler ── 调度 SeaTunnel、Trino SQL、质量检查         │
│ SeaTunnel Zeta    ── MySQL/PostgreSQL 批量接入                 │
│ Trino             ── SQL 查询、CTAS 转换                       │
│ Iceberg REST Catalog ── 表技术元数据                            │
│ Prometheus / Loki / Grafana / OpenTelemetry ── 指标与日志        │
└───────────────────────┬─────────────────────────────────────┘
                        ▼
                 对象存储 S3 / Iceberg / Parquet

AWS 基础设施适配：EKS、EC2、RDS PostgreSQL、S3、ECR、Secrets Manager、KMS
```

### 2.1 月末部署边界

- 目标架构支持控制平面与数据平面分账号部署；月末只验收同账号、单 AWS Global Region。
- 两个平面使用独立可部署单元和 API 边界，不把同账号演示固化为长期架构。
- CDK 保持 `aws` / `aws-cn` 分区兼容并执行两种 synth；月末不承诺中国区实际部署验证。
- Alpha 为内部/邀请制环境，不开放公网自助注册，不承诺生产 SLA。

## 3. 组件职责

| 层次 | 组件 | 职责 | 首版边界 |
|---|---|---|---|
| 前端 | React + TypeScript + Monaco | 全部客户界面、DAG、SQL、资产、运行和诊断 | 简单 DAG，不复刻 DS 全部能力 |
| API | Python 3.12 + FastAPI | 产品 API、权限、审计、适配器、AI 工具 | 单区域部署 |
| 产品数据库 | PostgreSQL | 租户、工作空间、定义、版本、资产、运行索引 | 不存客户业务数据 |
| 身份 | Keycloak 26.8.1 | 对接一个 OIDC Provider、登录和 JWT 校验 | 应用 RBAC 仍由 dwlle 管理 |
| 调度 | DolphinScheduler 3.4.3 | 定时、依赖、手动运行、重试、执行状态 | 后台无头引擎，受管定义由 dwlle 编译 |
| 接入 | SeaTunnel Zeta 3.0.0 | MySQL/PostgreSQL 到 Iceberg 的批量任务 | 全量/追加；不做实时 CDC |
| 查询 | Trino 484 | SELECT、CTAS、SQL 质量检查 | 限制查询时间、结果行数和资源 |
| 表格式 | Apache Iceberg | 开放表、Schema 演进和快照 | 不首版暴露复杂表维护操作 |
| 技术目录 | Apache Polaris 1.8.0 | 表标识和元数据位置 | 本地链路已验证，生产持久化后续实现 |
| 对象存储 | S3 | 数据文件、任务产物和制品 | 数据不出约定区域 |
| 可观测性 | OTel、Prometheus、Loki、Grafana | 指标、日志、告警和排障上下文 | 不建设完整 APM/追踪平台 |
| AI | Amazon Bedrock + ModelProvider + dwlle 工具层 | 失败摘要、根因候选、修复建议 | Global 初始模型 Sonnet 5.5，只读；无自动修复 |
| IaC | AWS CDK TypeScript | AWS 网络、计算、数据库、存储和安全 | 两分区 synth，单分区实测 |

### 3.1 首版不引入的组件

- Spark/Flink：SeaTunnel 和 Trino 已覆盖首版批处理路径。
- Kafka：没有实时流用例。
- DataHub/OpenMetadata：先实现轻量资产与血缘，避免引入额外存储和索引依赖。
- Superset：可作为后续嵌入组件，不阻塞首版数据开发闭环。
- 独立服务网格、复杂多集群调度：Alpha 无对应规模需求。

## 4. 自研用户界面

### 4.1 界面边界

所有客户可见功能都在 dwlle-web 中完成：

| 页面 | Alpha 能力 |
|---|---|
| 登录与工作台 | OIDC 登录、工作空间/环境切换、最近 Scenario 和失败任务；只显示企业实例 |
| 工作空间 Scenario | 自有或已安装场景、跨 Workflow 依赖、数据契约、SLA 和整体状态 |
| 工作空间 Workflow | 自有或已安装实例的新建、复制、搜索、启停、版本和发布状态 |
| 方案市场 Solution | 官方/社区只读模板、版本、组件/权限/资源需求和安装原型 |
| 方案市场模板 | 只读 Scenario/Workflow 模板，不提供企业运行状态或直接修改 |
| 已安装与更新 | 来源模板版本、本地实例版本、本地修改和升级入口 |
| 开发者集成 | REST/OpenAPI、MCP Endpoint、服务账号、Scope 和工具清单 |
| 数据源 | MySQL/PostgreSQL 配置、连接测试、密钥引用 |
| DAG 编辑器 | 添加/连接/删除节点、参数配置、依赖校验、草稿保存 |
| 发布与版本 | 校验、发布、历史版本和回滚 |
| 运行中心 | 手动运行、定时状态、重试、任务状态和日志 |
| SQL IDE | SQL 编辑、执行、结果表格、历史、保存为 SQL 节点 |
| 数据资产 | 库表、Schema、数据预览和表级血缘 |
| 质量与告警 | 规则配置、质量结果和失败告警 |
| AI 诊断 | 失败摘要、证据、根因候选和修复建议 |
| 管理 | 用户、角色、审计和基本主题配置 |

主导航固定分为“日常工作、数据管理、方案市场”。日常工作只放企业自有或已安装实例；方案市场只放官方/社区只读模板及安装管理，不用“我的/共享”筛选混合两类对象。Workspace 的创建、权限、环境、基础设施和开发者工具归入右上角的“工作空间设置”，个人账户与界面偏好归入左下角“个人设置”。

不使用 iframe，不向客户提供 DS 深链接。DS 原生 UI 只允许内部管理员通过独立账号紧急排障，普通用户无访问权限。

### 4.2 DAG 与组件注册表

- 使用成熟图编辑库实现节点、连线、缩放和布局，不从零开发画布。
- 后端组件注册表提供节点类型、版本、参数 Schema、输入输出约束和引擎要求。
- 前端根据 Schema 渲染节点配置表单，后端使用同一 Schema 校验。
- Alpha 支持串行、并行分支和汇合；跨工作空间依赖、子工作流、补数据、复杂日历和 Worker 分组后续实现。

### 4.3 发布模型

```text
Draft（草稿）
  → Validate（结构、参数、权限、SQL 校验）
  → Published（不可变版本）
  → Compiled（生成 DS 工作流）
  → Running（运行实例关联已发布版本）
```

回滚通过历史版本生成一个新发布版本，保留完整审计。DS 中的定义不反向同步，避免双写和定义漂移。

## 5. 控制平面设计

### 5.1 三层领域模型

```text
Tenant
  └─ Workspace：运行、权限与环境边界
      ├─ Environment / InfrastructureBinding / RoleBinding / SecretRef
      └─ Scenario：业务目标与跨 Workflow 协作
          └─ WorkflowVersion：可独立执行的数据工作流
              └─ Component / TaskNode

Solution：Workspace 级可共享模板，锁定 Scenario、Workflow 和组件版本
```

- Workspace 保存实际环境绑定；Solution 只保存可移植定义与需求，不保存真实密钥或授权。
- Scenario 只引用同一工作空间内的 WorkflowVersion，包含依赖、数据契约、SLA、负责人和整体状态。
- 数据契约至少可表达数据分区就绪、新鲜度和质量通过，避免只依赖上游任务成功。
- 安装 Solution 必须经过兼容性检查、权限/成本审查、环境绑定和部署验证。
- 模板与实例生命周期为“方案市场只读模板 → 安装到指定环境 → 工作空间企业实例 → 本地修改 → 差异比较与升级”。安装记录保存来源模板版本和本地版本，升级不得覆盖本地修改。
- 固定三层，不支持场景嵌套；跨工作空间引用和公开共享市场后续开放。

### 5.2 核心领域对象

| 对象 | 说明 | 事实来源 |
|---|---|---|
| Tenant / Workspace / Environment | 租户、工作空间和开发/生产环境 | dwlle |
| Solution / SolutionVersion | 工作空间级模板、依赖锁定、权限与资源需求 | dwlle |
| Scenario / ScenarioVersion | Workflow 引用、依赖、数据契约和 SLA | dwlle |
| User / Role / AuditEvent | 用户、Admin/Developer/Viewer 和关键操作审计 | dwlle，身份属性来自 IdP |
| DataSource / SecretRef | 数据源类型、连接参数和密钥引用，不保存明文密钥 | dwlle |
| Workflow / WorkflowVersion | 中立节点、依赖、调度、资源和质量配置 | dwlle |
| ComponentVersion | 节点类型、参数 Schema、引擎要求和版本兼容 | dwlle 注册表 |
| Run / TaskRun / Operation | 执行实例、异步操作、状态、日志位置和指标 | DS/应用服务，dwlle 建索引 |
| Dataset / LineageEdge | 技术 Schema、负责人和表级血缘 | Catalog/Trino + dwlle |
| QualityRule / QualityResult | SQL 质量规则和执行结果 | dwlle |
| Alert / Diagnosis | 阈值告警、AI 上下文、结论与建议 | dwlle |

### 5.3 Workflow 协议

首版 Workflow 至少包含：

- 唯一标识、版本、工作空间、场景、环境和负责人；
- 节点 ID、类型、配置、输入输出 Dataset 引用；
- 节点依赖、调度表达式、超时、重试和失败策略；
- 引擎要求及组件版本；
- 密钥只存引用，不进入导出文件、日志或 AI 上下文；
- 创建、发布、回滚到历史版本的审计记录。

节点分为通用节点、SeaTunnel/Trino 引擎节点和后续云专用节点。发布时由 `DolphinSchedulerCompiler` 生成工作流，并保存 `WorkflowVersion → DS workflow code` 映射。Scenario 协调和数据契约由 dwlle 负责，不要求 DS 理解三层模型。

### 5.4 公共 REST 与应用服务

- dwlle-web 和外部应用共用 `/api/v1` 领域接口，提供 OpenAPI、分页、统一错误码、幂等键和异步 Operation。
- 核心资源路径包括 `/workspaces`、`/scenarios`、`/workflows`、`/runs`、`/datasets`、`/diagnoses`、`/solutions`。
- UI 聚合与偏好可使用内部 BFF 接口，但核心能力不得绕过公共领域权限。
- REST Controller 不承载业务逻辑，统一调用 WorkspaceService、ScenarioService、WorkflowService、RunService、DatasetService、DiagnosisService 等应用服务。

### 5.5 FastMCP 集成

- 默认与控制平面同应用部署，FastMCP Tool 直接调用 Application Service，不通过 HTTP 组合 REST；独立部署时可复用 REST。
- MCP 工具使用语义化白名单，不从 OpenAPI 自动生成，不直接访问 Repository、DS、Trino 或云资源。
- 首版工具以只读为主：`workflow.list/get`、`scenario.get_status`、`run.get_status/get_logs`、`dataset.get_schema/get_lineage`、`run.diagnose`。
- 场景状态、失败诊断等组合逻辑放在应用服务，避免 Agent 连续调用大量细粒度接口。
- REST/MCP 均使用统一 `tenant + workspace + actor + agent + scopes` 上下文；权限取交集，审计保留真实用户和 Agent 身份。
- Agent 默认只读和草稿；发布、运行、安装、授权、云资源和删除操作必须按风险人工确认。

### 5.6 运行与日志

- 所有 DS API 调用集中在一个带版本契约测试的 client 中，前端和 MCP 不直接访问 DS。
- 控制平面通过轮询或事件同步运行状态，不在请求线程中等待长任务完成。
- 日志主体留在数据平面，控制平面保存位置、摘要和受权限保护的查询入口。
- 重跑和重试由用户主动触发；AI 不直接调用写操作。

## 6. 数据流与血缘

月末标准链路：

```text
MySQL/PostgreSQL
   │ SeaTunnel 全量或追加
   ▼
S3 Iceberg raw 表
   │ Trino CTAS / SQL
   ▼
S3 Iceberg curated 表
   │ SQL 质量检查
   ▼
数据集列表、Schema、表级血缘和查询预览
```

- 首版支持库表级血缘，来源为 Workflow 显式输入输出和 Trino SQL 解析。
- 字段级血缘、跨版本影响分析和完整数据地图不在月末范围。
- 数据质量规则包括非空、唯一、行数阈值和新鲜度；规则失败可终止下游节点。
- 技术目录只保存表元数据；业务资产目录由 dwlle 保存，两者通过表标识关联。

## 7. 平台中立边界

### 7.1 可以替换的部分

- 对象存储：通过 S3 兼容接口或明确适配器替换。
- 计算基础设施：通过 Kubernetes manifests/Helm 与云供应适配器替换。
- 密钥、模型、通知和身份提供方：通过窄接口替换。
- 执行引擎：新增适配器，不改变既有 Workflow 的引擎专用语义。

### 7.2 不做虚假的可移植承诺

- Trino SQL 不保证可在 Spark SQL、StarRocks 或 Databricks 上直接执行。
- SeaTunnel 连接器的语义由其引擎决定，平台只统一配置和运行观测。
- Workflow 导出时必须携带组件版本和引擎要求；导入时执行兼容性检查。
- 后续增加平台时，提供可移植性报告和节点替换提示，而非自动改写所有逻辑。

## 8. 安全与多租户

- 控制平面采用租户隔离，所有产品查询必须带租户上下文；关键操作记录审计。
- Alpha 至少验证两个租户的产品元数据隔离；每个客户使用独立数据平面，跨账号部署尚未验收。
- OIDC 只负责身份认证；应用权限采用 Admin、Developer、Viewer 三种角色。
- 数据库密码和访问密钥存 Secrets Manager，通过接口隔离具体实现，禁止写入 Workflow、日志和镜像。
- Trino 查询使用受限服务身份，设置执行超时、扫描/结果限制和工作空间资源配额。
- AI 工具按用户权限执行，默认只读；发送模型前移除密钥，并提供日志/内容脱敏。
- 管理入口不开公网；AWS 管理通过 SSM，应用入口仅对受邀用户开放。
- 数据卷、S3 数据桶和 RDS 默认保留，开发环境只有显式配置才允许销毁。

## 9. AI 辅助运维

首版只实现任务失败诊断：

1. 收集失败节点的错误日志、最近运行指标、Workflow 版本和最近变更。
2. 通过规则完成错误分类和敏感信息清理。
3. 模型输出失败摘要、最多三个根因候选、证据引用和修复建议。
4. 在运行实例页展示，并允许用户标记“有帮助/无帮助”。
5. 不自动修改 Workflow、不重启任务、不扩容、不执行 SQL 修复。

系统指标、应用指标和数据指标先使用阈值告警。趋势预测、容量预测、GC 全量分析和自治修复不属于月末范围。

## 10. 可靠性、成本与运维

- Alpha 允许单副本应用，不承诺控制平面和 Trino 的高可用。
- RDS 和 S3 开启备份/版本保护；提供一次元数据库恢复演练，客户业务数据以 Iceberg/S3 持久化。
- DS、Trino 和 SeaTunnel 的镜像与版本锁定到 `versions.json`，制品预置 S3/ECR，部署不从公网拉取。
- 使用 requests/limits、查询超时、工作空间并发上限和结果行数上限控制资源。
- 记录每个 Workflow 的运行时长、读写数据量和估算成本；月末只展示可获得的指标，不承诺精确账单分摊。
- 关闭非演示环境夜间资源的策略可作为运维脚本，但不能影响持久数据和元数据恢复。

## 11. Alpha 验收场景

在一个真实 AWS 账号中完成：

1. 用户通过 OIDC 登录，并被分配到工作空间和角色。
2. 配置一个 MySQL 或 PostgreSQL 数据源，密钥不出现在日志中。
3. 在自研 DAG 中创建并发布“SeaTunnel 接入 → Trino 转换 → 质量检查”的 Workflow。
4. 手动运行成功后设置定时调度，可以查看版本、状态和日志，无需打开 DS UI。
5. 查询 raw/curated 表，查看 Schema 和表级血缘。
6. 注入一个可复现失败，收到基础告警并获得带证据的 AI 诊断建议。
7. 使用第二个租户验证产品元数据不可互相访问。
8. 删除演示资源时，保留策略按配置生效，不留下公网下载或明文密钥。

## 12. 待决问题与验证门槛

| # | 问题 | 截止 | 失败处理 |
|---|---|---|---|
| Q1 | 选择哪个 Iceberg REST Catalog 实现，能否与 Trino/SeaTunnel 稳定集成 | 11-03 | 复审选型，不临时自研 Catalog |
| Q2 | SeaTunnel Zeta 是否满足 JDBC → S3/Iceberg 的批任务和恢复要求 | 11-08 | 缩减连接器范围或复审执行引擎 |
| Q3 | Keycloak 与 dwlle 的集成及 DS 管理入口隔离 | 11-08 | DS 独立管理账号，不阻塞 dwlle OIDC |
| Q4 | 单客户最小数据平面月成本是否满足目标 | 11-15 | 调整共享执行池或资源规格，不宣称低成本 |
| Q5 | 模型日志脱敏和诊断准确率是否达到演示要求 | 11-25 | 保留规则诊断，AI 标为实验功能 |
