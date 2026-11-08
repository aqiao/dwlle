# dwlle 架构设计

版本：v0.9（2026-11-08） · 状态：撰写中
目标版本：内部 Alpha、Beta、Preview 与 GA
决策依据：ADR-0001～0017（含取代关系与各文件现行声明）

> v0.9 新增术语与规范章节，统一领域术语、API/MCP 命名、GitHub 分支和提交信息格式。此前版本已明确 OpenMetadata 血缘权威、DataAsset 领域模型和分阶段开发计划。

## 1. 产品定位与目标

Dwlle（对味）是一个轻量级数据治理 SaaS 平台，提供数据调度、数据安全、数据分析、数据质量管理、数据血缘、可观测性和 AI 辅助运维。平台通过方案市场支持个人开发者和企业共享或出售方案，并通过 REST API 和 MCP 提供开放集成。

平台面向有数据治理诉求同时对成本敏感的企业，由控制平面和数据平面组成：控制平面负责配置、权限、业务元数据和编排指令，数据平面负责实际的数据读取、写入、计算和任务运行。

控制平面采用 Tenant、Workspace、Scenario 三层领域模型。Workspace 内可以定义开发、测试、生产等 Environment。已验证的 WorkflowVersion 可以从测试 Environment 发布到生产 Environment，重新绑定生产资源和密钥并经审批后运行。

### 1.1 设计原则

1. **自研控制平面，复用执行引擎。** 不自研调度器、传输引擎、SQL 引擎或存储引擎；所有客户操作从自研平台进入。
2. **客户界面全部自研。** DolphinScheduler、OpenMetadata 等开源产品不作为客户操作路径，原生管理界面仅可供内部管理员受控使用。
3. **三层领域抽象。** Tenant 是顶层隔离对象；Workspace 是业务协作与资源治理边界；Scenario 是业务目标与协作边界，组织 Workflow、跨 Workflow 依赖、数据契约和 SLA。
4. **定义与环境绑定分离。** WorkflowVersion 和 Solution 保存可移植定义，不保存真实凭据或授权；部署时由目标管理员绑定并批准环境资源。
5. **统一数据资产。** DataSource、File 和 Dataset 统一抽象为 DataAsset，共用身份、权限、负责人、标签和环境绑定规则，同时保留类型特定配置与能力。
6. **单一血缘权威存储。** OpenMetadata 是 LineageEdge 的唯一权威存储；dwlle 不维护另一份可独立修改的权威血缘。
7. **数据开放。** 默认数据格式为 Iceberg/Parquet，产品元数据可导出，不以专有格式锁定客户。dwlle-web 与外部应用共用公共领域 REST，FastMCP 与 REST 共用应用服务。
8. **协议中立，适配器具体。** 通用协议不依赖 AWS；云网络、密钥和资源供应通过适配器实现。
9. **AI 辅助运维。** AI 分析系统级和应用级日志与指标，为用户提供有证据的建议，但不直接操作用户环境。
10. **按需购买服务。** 系统功能模块化，客户可按需购买；具体商业化范围由产品计划决定。

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
│ Workspace / Scenario / Workflow / Run / DataAsset / Diagnosis  │
│ Solution / Quality / 权限与 Operation                         │
│                                                             │
│ dwlle-web：Solution、Scenario、DAG、SQL、资产、运行与 AI 诊断   │
│ PostgreSQL：产品定义、版本、业务资产和运行索引                  │
│ ModelProvider：可替换模型实现                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ 受控执行与元数据适配器
                        ▼
┌──────────────────── 数据平面（Kubernetes） ───────────────────┐
│ DolphinScheduler ── 调度 SeaTunnel、Trino SQL、质量检查         │
│ SeaTunnel Zeta    ── MySQL/PostgreSQL 批量接入                 │
│ Trino             ── SQL 查询、CTAS 转换                       │
│ Apache Polaris    ── Iceberg 表技术目录                        │
│ OpenMetadata      ── 数据血缘唯一权威存储与内部管理             │
│ Prometheus / Loki / Grafana / OpenTelemetry ── 指标与日志        │
└───────────────────────┬─────────────────────────────────────┘
                        ▼
                 对象存储 S3 / Iceberg / Parquet

AWS 基础设施适配：EKS、EC2、RDS PostgreSQL、S3、ECR、Secrets Manager、KMS
```

### 2.1 阶段与开发计划

架构文档只维护阶段时间和能力方向，具体范围、资源、任务、里程碑与验收以各阶段开发计划为准。

| 阶段 | 时间 | 能力方向 | 开发计划 |
|---|---|---|---|
| Alpha | 2026-11-01～2026-11-30 | 自研控制平面、DolphinScheduler 工作流、Trino 查询、基础质量检查与只读 AI 失败诊断 | [Alpha 开发计划](PROJECT_PLAN_ALPHA.md) |
| Beta | 2026-12-01～2026-12-31 | Polaris 产品化、SeaTunnel 全流程链路、OpenMetadata 血缘与端到端集成 | [Beta 开发计划](PROJECT_PLAN_BETA.md) |
| Preview | 2027-01-01～2027-01-31 | 邀请制试运行、反馈处理、升级恢复、发布准备、网站与社区建设 | [Preview 开发计划](PROJECT_PLAN_PREVIEW.md) |
| GA | 2027-02-01～2027-02-20 | 根据 Preview 出口条件完成正式上线 | 由 Preview Go/No-Go 评审确定 |

Alpha 可以为 Trino 查询和 CTAS 验证部署后台 Iceberg Catalog，但 Polaris 的自研产品界面与资产治理在 Beta 完成。Alpha 不建立独立血缘库；Beta 接入 OpenMetadata 时直接从 Workflow 定义和 SQL 解析结果初始化血缘。

## 3. 组件职责

| 层次 | 组件 | 职责 | 架构边界 |
|---|---|---|---|
| 前端 | React + TypeScript + Monaco | 全部客户界面、DAG、SQL、资产、运行和诊断 | 简单 DAG，不复刻 DS 全部能力 |
| API | Python 3.12 + FastAPI | 产品 API、权限、审计、适配器、AI 工具 | 单区域部署起点，跨账号拓扑通过适配器扩展 |
| 产品数据库 | PostgreSQL | 租户、工作空间、定义、版本、业务资产和运行索引 | 不存客户业务数据，不作为权威血缘库 |
| 身份 | Keycloak 26.8.1 | 对接一个 OIDC Provider、登录和 JWT 校验 | 应用 RBAC 仍由 dwlle 管理 |
| 调度 | DolphinScheduler 3.4.3 | 定时、依赖、手动运行、重试、执行状态 | 后台无头引擎，受管定义由 dwlle 编译 |
| 接入 | SeaTunnel Zeta 3.0.0 | MySQL/PostgreSQL 到 Iceberg 的批量任务 | 全量/追加；不默认支持实时 CDC |
| 查询 | Trino 484 | SELECT、CTAS、SQL 质量检查 | 限制查询时间、扫描量、结果行数和资源 |
| 表格式 | Apache Iceberg | 开放表、Schema 演进和快照 | 复杂表维护操作不直接暴露给普通用户 |
| 技术目录 | Apache Polaris 1.8.0 | Iceberg 表标识和元数据位置 | 使用持久化存储，不作为业务资产或血缘权威来源 |
| 数据血缘 | OpenMetadata 2.0.5 | LineageEdge 唯一权威存储、血缘查询与内部管理 | 原生 UI 仅限内部管理员，不直接面向客户 |
| 对象存储 | S3 | 数据文件、任务产物和制品 | 数据不出约定区域 |
| 可观测性 | OTel、Prometheus、Loki、Grafana | 指标、日志、告警和排障上下文 | 不默认建设完整 APM/追踪平台 |
| AI | Amazon Bedrock + ModelProvider + dwlle 工具层 | 失败摘要、根因候选、修复建议 | Global 初始模型 Sonnet 5.5，只读；无自动修复 |
| IaC | AWS CDK TypeScript | AWS 网络、计算、数据库、存储和安全 | 两分区 synth，实测范围由阶段计划确定 |

## 4. 自研用户界面

### 4.1 界面边界

所有客户可见功能都在 dwlle-web 中完成：

| 页面 | 产品能力 |
|---|---|
| 登录与工作台 | OIDC 登录、Workspace/Environment 切换、最近 Scenario 和失败任务 |
| 工作空间 Scenario | 场景、跨 Workflow 依赖、数据契约、SLA 和按 Environment 聚合的状态 |
| 工作空间 Workflow | 新建、复制、搜索、启停、版本和发布状态 |
| 方案市场 Solution | 官方/社区只读模板、版本、组件/权限/资源需求和安装入口 |
| 已安装与更新 | 来源模板版本、本地实例版本、本地修改、差异比较与升级 |
| 开发者集成 | REST/OpenAPI、MCP Endpoint、服务账号、Scope 和工具清单 |
| DAG 编辑器 | 添加/连接/删除节点、参数配置、依赖校验、草稿保存 |
| 发布与版本 | 校验、发布、历史版本和回滚 |
| 运行中心 | 手动运行、定时状态、重试、任务状态和日志 |
| SQL IDE | SQL 编辑、执行、结果表格、历史、保存为 SQL 节点 |
| 数据资产 | 按 DataAsset 类型提供连接配置、Schema、预览、血缘和负责人管理 |
| 质量与告警 | 规则配置、质量结果和失败告警 |
| AI 诊断 | 失败摘要、证据、根因候选和修复建议 |
| 管理 | 用户、角色、审计和界面配置 |

DataAsset 页面是统一资产入口，按类型提供不同能力：DataSourceAsset 支持连接配置、SecretRef 绑定和连接测试；DatasetAsset 支持 Schema、预览和血缘；FileAsset 支持存储位置、格式、Schema，以及由对应连接器支持的预览能力。

主导航分为“日常工作、数据管理、方案市场”。日常工作只展示企业自有或已安装实例；方案市场只展示官方/社区只读模板及安装管理。Workspace 的创建、权限、环境、基础设施和开发者工具归入工作空间设置，个人账户与界面偏好归入个人设置。

不使用 iframe，不向客户提供 DS 或 OpenMetadata 深链接。DS 原生 UI 仅用于内部管理员紧急排障；OpenMetadata 原生 UI 仅用于内部管理员血缘管理。两者均采用受控访问，普通用户和客户管理员无直接访问权限。

### 4.2 DAG 与组件注册表

- 使用成熟图编辑库实现节点、连线、缩放和布局，不从零开发画布。
- 后端组件注册表提供节点类型、版本、参数 Schema、输入输出约束和引擎要求。
- 前端根据 Schema 渲染节点配置表单，后端使用同一 Schema 校验。
- 基础 DAG 支持串行、并行分支和汇合；跨工作空间依赖、子工作流、补数据、复杂日历和 Worker 分组属于扩展能力。
- 节点输入输出使用 DataAsset 引用，并由组件注册表限制可接受的资产类型。

### 4.3 Workflow 发布模型

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
  └─ Workspace：业务协作、权限与资源治理边界
      ├─ RoleBinding
      ├─ DataAsset：逻辑数据资产
      ├─ Environment：开发、测试、生产
      │   ├─ InfrastructureBinding
      │   ├─ ResourceQuota
      │   ├─ SecretRef
      │   ├─ DataAssetBinding：环境物理资产绑定
      │   └─ Run / 运行状态
      └─ Scenario：业务目标与跨 Workflow 协作
          └─ WorkflowVersion
              └─ Component / TaskNode

Solution：Workspace 级可共享模板，锁定 Scenario、Workflow 和组件版本
```

- Workspace 保存实际环境绑定；Solution 只保存可移植定义与需求，不保存真实密钥或授权。
- Scenario 默认引用同一 Workspace 内的 WorkflowVersion。跨 Workspace 引用必须基于显式共享、不可变版本和独立授权，不继承源 Workspace 的密钥或资源权限；跨 Workspace 数据协作优先通过 DataAsset 数据契约表达。
- Scenario 整体状态默认取生产 Environment，其他 Environment 的状态在场景详情中查看。
- 数据契约至少可表达数据分区就绪、新鲜度和质量通过，避免只依赖上游任务成功。
- 安装 Solution 必须经过兼容性检查、权限/成本审查、环境绑定和部署验证。
- 模板与实例生命周期为“方案市场只读模板 → 安装到指定环境 → 工作空间企业实例 → 本地修改 → 差异比较与升级”。升级不得覆盖本地修改。
- 固定三层，不支持场景嵌套；公开共享市场和跨 Tenant 直接引用不属于核心领域协议。

### 5.2 核心领域对象

| 对象 | 说明 | 事实来源 |
|---|---|---|
| Tenant / Workspace / Environment | 租户、工作空间和运行环境 | dwlle |
| Solution / SolutionVersion | 工作空间级模板、依赖锁定、权限与资源需求 | dwlle |
| Scenario / ScenarioVersion | Workflow 引用、依赖、数据契约和 SLA | dwlle |
| User / Role / AuditEvent | 用户、角色和关键操作审计 | dwlle，身份属性来自 IdP |
| DataAsset | DataSource、File、Dataset 的统一业务身份、类型、名称、负责人和标签 | dwlle |
| DataAssetBinding | DataAsset 在指定 Environment 下的连接、Catalog、库表或文件路径绑定 | dwlle |
| SecretRef | Environment 下的密钥引用，不保存明文密钥 | dwlle 保存引用，密钥由 Secrets Manager 或对应适配器管理 |
| Workflow / WorkflowVersion | 中立节点、依赖、调度、资源和质量配置 | dwlle |
| ComponentVersion | 节点类型、参数 Schema、引擎要求和版本兼容 | dwlle 注册表 |
| Run / TaskRun / Operation | 执行实例、异步操作、状态、日志位置和指标 | DS/应用服务，dwlle 建索引 |
| Metadata | DataAsset 的技术 Schema、格式和物理描述，通过 assetId 关联 | Polaris、Trino、对象存储及采集服务 |
| LineageEdge | DataAsset 之间的表级血缘，通过资产映射关联 | **OpenMetadata 唯一权威存储** |
| QualityRule / QualityResult | SQL 质量规则和执行结果 | dwlle；执行引擎为 Trino |
| Alert / Diagnosis | 阈值告警、AI 上下文、结论与建议 | dwlle |

### 5.3 Workflow 协议

Workflow/WorkflowVersion 至少满足：

- 保存可移植的业务和技术定义，包含稳定标识、版本、Workspace、Scenario 和负责人；
- Environment 属于发布、部署或运行上下文，不作为不可变定义中的物理资源绑定；
- 节点包含 ID、类型、配置和输入输出 DataAsset 引用；
- 节点包含依赖、调度表达式、超时、重试和失败策略；
- 声明引擎要求及组件版本；
- 实际资源、密钥和基础设施不进入 WorkflowVersion；
- 密钥只存引用，不进入导出文件、日志或 AI 上下文；
- 创建、发布、回滚到历史版本均记录审计。

节点分为通用节点、SeaTunnel/Trino 引擎节点和后续云专用节点。发布时由 `DolphinSchedulerCompiler` 生成工作流，并保存 `WorkflowVersion → DS workflow code` 映射。Scenario 协调和数据契约由 dwlle 负责，不要求 DS 理解三层模型。

### 5.4 公共 REST 与应用服务

- dwlle-web 和外部应用共用 `/api/v1` 领域接口，提供 OpenAPI、分页、统一错误码、幂等键和异步 Operation。
- 核心资源路径包括 `/workspaces`、`/scenarios`、`/workflows`、`/runs`、`/dataassets`、`/diagnoses`、`/solutions`。
- DataAsset 的 Schema、预览和血缘由应用服务组合权限、环境绑定和外部元数据适配器提供，不向前端暴露 OpenMetadata 管理凭证。
- UI 聚合与偏好可使用内部 BFF 接口，但核心能力不得绕过公共领域权限。
- REST Controller 不承载业务逻辑，统一调用 WorkspaceService、ScenarioService、WorkflowService、RunService、DataAssetService、DiagnosisService 等应用服务。

### 5.5 FastMCP 集成

- 默认与控制平面同应用部署，FastMCP Tool 直接调用 Application Service，不通过 HTTP 组合 REST；独立部署时可复用 REST。
- MCP 工具使用语义化白名单，不从 OpenAPI 自动生成，不直接访问 Repository、DS、Trino、OpenMetadata 管理接口或云资源。
- 基础只读工具包括 `workflow.list/get`、`scenario.get_status`、`run.get_status/get_logs`、`data_asset.get_schema/get_lineage`、`run.diagnose`。
- 场景状态、失败诊断等组合逻辑放在应用服务，避免 Agent 连续调用大量细粒度接口。
- REST/MCP 均使用统一 `tenant + workspace + actor + agent + scopes` 上下文；权限取交集，审计保留真实用户和 Agent 身份。
- Agent 默认只读和草稿；发布、运行、安装、授权、云资源和删除操作必须按风险人工确认。

### 5.6 运行与日志

- 所有 DS API 调用集中在一个带版本契约测试的 client 中，前端和 MCP 不直接访问 DS。
- 控制平面通过轮询或事件同步运行状态，不在请求线程中等待长任务完成。
- 日志主体留在数据平面，控制平面保存位置、摘要和受权限保护的查询入口。
- 重跑和重试由用户主动触发；AI 不直接调用写操作。

## 6. 数据流、血缘与质量

### 6.1 标准数据链路

```text
MySQL/PostgreSQL
   │ SeaTunnel 全量或追加
   ▼
S3 Iceberg raw 表
   │ Trino CTAS / SQL
   ▼
S3 Iceberg curated 表
   │ Trino SQL 质量检查
   ▼
DataAsset 列表、Schema、数据预览和 OpenMetadata 表级血缘
```

Polaris 保存 Iceberg 表技术目录；dwlle 保存 DataAsset 业务身份、负责人、权限和环境绑定；两者通过稳定的 Catalog、数据库和表标识关联。FileAsset 的技术元数据由对象存储扫描或采集任务获得。

### 6.2 血缘权威模型

- Workflow 显式输入输出和 Trino SQL 解析结果是血缘生成依据，不是独立的权威存储。
- **OpenMetadata 是 LineageEdge 的唯一权威存储。** 血缘的创建、更新、删除、人工修正和查询均以 OpenMetadata 为准。
- dwlle 通过受控 OpenMetadata 适配器写入 Workflow 声明血缘和 SQL 解析血缘，不在 PostgreSQL 中维护另一份可独立修改的权威 LineageEdge。
- dwlle-web、公共 REST 和 MCP 通过 DataAssetService 读取 OpenMetadata。dwlle 可以保存带权限的缓存或读取索引，但必须可从 OpenMetadata 重建，不能作为冲突时的裁决来源。
- DataAsset 使用稳定 ID，并保存与 Polaris 表标识、OpenMetadata 实体标识的映射，禁止仅依赖可变的显示名称拼接血缘。
- 自动同步必须幂等，并区分自动血缘与人工血缘。自动同步不得覆盖或删除内部管理员的人工修正；冲突保留审计并进入人工复核。
- OpenMetadata 原生 UI 仅限内部管理员，通过 SSO、受控 RBAC 和审计进行血缘管理；客户只能使用 dwlle-web 或公共接口。
- 各阶段的历史数据初始化、同步验证和迁移步骤由对应开发计划定义。

### 6.3 数据质量

- dwlle 是 QualityRule 和 QualityResult 的权威来源，Trino 负责 SQL 质量检查执行。
- 基础规则包括非空、唯一、行数阈值和新鲜度；规则失败可以终止下游节点。
- OpenMetadata 不作为工作流质量规则或结果的第二权威存储。需要在其界面展示时，可以同步只读质量结果。
- 字段级血缘、跨版本影响分析和完整数据地图属于扩展能力，不影响基础血缘模型。

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
- 每个客户使用独立数据平面；跨账号部署是否验收由阶段计划确定。
- OIDC 只负责身份认证；应用权限采用 Admin、Developer、Viewer 三种角色。
- 数据库密码和访问密钥存 Secrets Manager，通过接口隔离具体实现，禁止写入 Workflow、日志和镜像。
- Trino 查询使用受限服务身份，设置执行超时、扫描/结果限制和工作空间资源配额。
- OpenMetadata 管理接口不对前端、MCP 或普通用户开放；内部管理员通过独立授权路径访问。
- AI 工具按用户权限执行，默认只读；发送模型前移除密钥，并提供日志/内容脱敏。
- 管理入口不开公网；AWS 管理通过 SSM，应用入口仅对受邀用户开放。
- 数据卷、S3 数据桶和 RDS 默认保留，开发环境只有显式配置才允许销毁。

## 9. AI 辅助运维

基础能力只实现任务失败诊断：

1. 收集失败节点的错误日志、最近运行指标、Workflow 版本和最近变更。
2. 通过规则完成错误分类和敏感信息清理。
3. 模型输出失败摘要、最多三个根因候选、证据引用和修复建议。
4. 在运行实例页展示，并允许用户标记“有帮助/无帮助”。
5. 不自动修改 Workflow、不重启任务、不扩容、不执行 SQL 修复。

系统指标、应用指标和数据指标先使用阈值告警。趋势预测、容量预测、GC 全量分析和自治修复不属于基础能力。

## 10. 可靠性、成本与运维

- 应用支持单副本演示部署；控制平面和 Trino 的生产高可用需要独立设计与验收。
- RDS 和 S3 开启备份/版本保护；恢复范围明确覆盖产品数据库、DS、Keycloak、Polaris、OpenMetadata 元数据库及其搜索索引重建。
- 所有第三方组件的镜像、版本和制品进入 `versions.json`，预置 S3/ECR，部署不从公网拉取。
- 使用 requests/limits、查询超时、工作空间并发上限和结果行数上限控制资源。
- 记录每个 Workflow 的运行时长、读写数据量和估算成本；只展示可获得的指标，不承诺精确账单分摊。
- 关闭非演示环境夜间资源的策略可作为运维脚本，但不能影响持久数据、OpenMetadata 血缘和产品元数据恢复。

## 11. 架构验证原则

各阶段开发计划必须覆盖与其实施范围对应的验证。以下原则仅在该能力已纳入该阶段 P0 或 P1 实施范围时适用；未实施的能力必须标注“未实施，不适用”，并明确交接阶段，不得仅因本清单要求其提前实施。验证至少包括：

1. 自研 UI、公共 REST 和 MCP 均执行统一权限与审计。
2. Workflow 只单向编译到 DS，不产生定义双写。
3. DataAsset 跨 Environment 绑定正确，测试与生产密钥不混用。
4. OpenMetadata 是唯一权威血缘存储，dwlle 缓存可重建，人工修正如实保留。
5. 质量规则失败能够阻断下游，质量结果不存在第二权威来源。
6. 元数据库、Polaris、OpenMetadata 和业务数据可按声明范围恢复。
7. 部署无公网下载、无明文密钥、无公开数据桶或公网管理端口。

## 12. 待验证架构问题

| # | 问题 | 所属开发计划 |
|---|---|---|
| Q1 | SeaTunnel Zeta 与 JDBC、S3/Iceberg、Polaris 的兼容性和恢复语义 | Beta |
| Q2 | Keycloak、dwlle、DS 与 OpenMetadata 内部管理入口的身份和权限隔离 | Alpha / Beta |
| Q3 | OpenMetadata 血缘写入、人工修正保护、查询性能和索引恢复 | Beta |
| Q4 | 单客户最小数据平面成本和资源规格 | Alpha / Beta |
| Q5 | 模型日志脱敏和诊断证据质量 | Alpha |

具体完成日期、失败处理和降级范围见对应阶段开发计划。


## 13. 术语与规范

### 13.1 核心领域术语

| 术语 | 含义与使用边界 |
|---|---|
| Tenant | 顶层租户对象，是产品数据、权限和资源的隔离边界。 |
| Workspace | 业务协作与资源治理边界，包含并列的 Scenario 和 Environment。 |
| Environment | Workspace 内的开发、测试、生产运行环境，持有基础设施、配额、SecretRef 和 DataAssetBinding。 |
| Scenario | 业务目标与协作边界，组织 Workflow、跨 Workflow 依赖、数据契约和 SLA。 |
| Workflow / WorkflowVersion | Workflow 是工作流稳定身份，WorkflowVersion 是可发布、不可变的技术定义；DS Workflow 是编译后的执行侧定义。 |
| DataAsset | DataSource、File、Dataset 的统一业务资产抽象，共用标识、负责人、标签和权限。 |
| DataAssetBinding | DataAsset 在指定 Environment 下的物理连接、Catalog、库表或文件路径绑定。 |
| SecretRef | Environment 下的密钥引用，不代表密钥本身，不保存明文。 |
| Metadata | DataAsset 的技术 Schema、格式和物理描述，通过 assetId 关联。 |
| LineageEdge | DataAsset 之间的血缘关系，唯一权威存储为 OpenMetadata。 |
| QualityRule / QualityResult | dwlle 权威管理的质量规则和执行结果，Trino 负责 SQL 检查执行。 |
| Solution | Workspace 级可共享、版本化模板，安装到既有 Workspace 的目标 Environment。 |
| Run / TaskRun | Workflow 或节点的运行实例，必须关联已发布版本和 Environment。 |

### 13.2 命名与文档规范

- 领域对象和代码类名使用 PascalCase，例如 `DataAsset`、`DataAssetBinding`、`DataAssetService`。
- REST 资源路径使用小写复数，例如 `/api/v1/workspaces`、`/api/v1/workflows`、`/api/v1/dataassets`。
- MCP 工具使用蛇形命名，例如 `workflow.get`、`run.get_status`、`data_asset.get_lineage`。
- 产品名称统一写作 `OpenMetadata`、`DolphinScheduler`、`SeaTunnel`、`Trino`、`Polaris`、`Keycloak`、`FastMCP`。
- 文档和界面中文使用“租户、工作空间、环境、业务场景、工作流、数据资产”；代码和 API 使用对应的英文术语。
- 新阶段计划按阶段命名，不再以月份作为文档边界；ADR 编号递增且不删除历史记录。
- 文档使用中文，代码注释和提交信息使用英文。

### 13.3 GitHub 分支命名

新任务说明文件统一命名为 `docs/tasks/Txxxx-description.md`，任务编号与分支、提交和交付记录使用同一标识。新任务必须按主要变更意图选择以下一种分支类型：

| 类型 | 分支格式 | 使用场景 |
|---|---|---|
| 功能类分支 | `feature/Txxxx-description` | 新产品能力、架构能力或功能增强 |
| 文档类分支 | `doc/Txxxx-description` | 架构、ADR、计划、任务说明和纯文档修改 |
| Bug 修复分支 | `bugfix/Txxxx-description` | 非紧急的缺陷修复和回归处理 |
| 紧急修复分支 | `hotfix/Txxxx-description` | 需要紧急修复生产或发布阻断问题 |

具体规则：

- `T` 大写，`xxxx` 为四位数字任务编码，不足四位时前面补零，例如 `0001`。
- `description` 使用简短的小写英文单词并以短横线连接，不使用空格、下划线或中文。
- 示例：`feature/T0001-workspace-environment`、`doc/T0002-lineage-authority`、`bugfix/T0003-secret-ref-binding`、`hotfix/T0004-prod-auth-failure`。
- 历史 `Txxx` 任务如需新建分支，可补足四位后使用，例如 `T019` 对应 `T0019`；已有分支和历史任务文档不强制重命名或回填。
- 一个任务对应一个分支，从最新的目标基线创建。混合变更按主要意图选择类型，不把无关功能、文档和修复混入同一分支。
- `hotfix` 从受影响发布基线创建，修复后按发布流程合入，并同步回主开发基线，避免只在紧急分支修复。
- 分支通过 Pull Request 评审和必要检查后合入，不直接推送未经验证的变更到主分支。

### 13.4 提交信息规范

提交信息使用英文，格式为：

```text
Txxxx: <动词开头的英文描述>
```

例如：

```text
T0001: Add workspace environment model
T0002: Clarify OpenMetadata lineage authority
T0003: Fix secret reference binding
```

要求提交保持小而完整，提交信息准确描述实际变更；历史提交和已有任务中的 `Txxx:` 格式不强制改写。
