# 0009 平台中立的 SaaS 控制平面与开源数据平面

状态：已接受
日期：2026-11-02

## 背景

ADR-0001 选择只在客户 AWS 账号内部署，ADR-0002 选择 StarRocks 存算一体，ADR-0005 将 Agent 运行时绑定到 Bedrock AgentCore。这些决策降低了早期部署和运维复杂度，但不满足新的产品约束：

- 首发运行在 AWS 上，但产品协议、数据格式和执行核心不能被 AWS 专有服务绑定。
- 产品需要 SaaS 控制平面，并允许数据平面以后运行在其他云或客户环境。
- 目标不是重新开发调度、传输和查询引擎，而是提供统一体验、可复用组件、可观测性和 AI 辅助运维。
- AWS 单品能力不是空白，目标痛点是整合成本、学习成本和中小企业总体拥有成本。

## 决策

1. **控制平面与数据平面分离。**
   - 自研多租户 SaaS 控制平面，管理租户、项目、Pipeline、版本、资产、权限、审计和 AI 运维。
   - 数据平面基于 Kubernetes 和容器部署，承载调度、传输、查询及可观测性组件。
   - 月末 Alpha 允许在同一个 AWS 账号中部署两个平面；跨账号和客户 VPC 部署是后续验收项。

2. **AWS 是首个基础设施适配器，不是产品协议。**
   - AWS 上可使用 EKS、EC2、S3、RDS PostgreSQL、Secrets Manager、KMS 等基础设施。
   - 核心协议采用 OCI、Kubernetes、PostgreSQL、OIDC、OpenTelemetry、S3 API 和开放表格式。
   - 不使用 Step Functions、Glue Job、Athena 或 Redshift 作为默认 Pipeline 的执行语义。

3. **默认开源数据栈。**
   - DolphinScheduler：调度与任务执行编排。
   - SeaTunnel：批量数据接入与轻量转换，首版优先验证 Zeta Engine。
   - Trino：交互式 SQL 查询与 SQL 转换。
   - S3 + Apache Iceberg + 独立部署的 Iceberg REST Catalog：开放数据存储与技术目录。
   - PostgreSQL：控制平面和开源组件的元数据库。
   - 首版不默认引入 Spark、Flink、Kafka，不支持实时 CDC。

4. **dwlle Pipeline 是产品事实来源。**
   - dwlle 保存版本化、引擎中立的 Pipeline 定义，并单向编译为 DolphinScheduler 工作流。
   - DolphinScheduler 是调度执行事实来源；运行状态由控制平面同步。
   - 受管 Pipeline 不允许在 DS 原生界面修改后反向同步，避免双写。DS 原生界面在 Alpha 中只用于只读排障。
   - 通用节点与引擎专用节点并存，不承诺任意 Pipeline 在所有引擎上无修改运行。

5. **AI 与模型运行时解耦。**
   - 保留 `ModelProvider` 抽象，首版只实现一种模型提供方。
   - AgentCore 不再是必需依赖；是否使用 Bedrock 模型由部署配置决定。
   - AI 不直连数据引擎，只能调用 dwlle-api 的受控工具；首版只读诊断，不自动执行修复。

6. **与既有 ADR 的关系。**
   - 取代 ADR-0001 和 ADR-0002。
   - 取代 ADR-0005 中“必须使用 AgentCore”的部分，保留模型抽象和 API 工具安全约束。
   - 取代 ADR-0007 中“SQL 解析只使用 StarRocks 方言”的部分，首版改为 Trino 方言。
   - ADR-0008 由 ADR-0010 统一取代；保留并强化 dwlle-web 主路径和 DS client 集中封装原则。
   - ADR-0003、0004、0006 继续有效；其中 StarRocks 专属任务和 Superset 连接对象随新数据栈调整。

## 理由

- 开放数据格式和自有 Pipeline 协议可避免产品核心被单一云厂商锁定。
- DolphinScheduler、SeaTunnel 和 Trino 分别复用成熟的调度、传输和查询能力，自研资源集中在控制平面和差异化功能。
- Iceberg 使数据可以被不同计算引擎读取，降低未来扩展 Spark、Flink 或其他云服务的迁移成本。
- 控制平面与数据平面分离，使 SaaS 元数据管理与客户数据驻留可以同时成立。

## 后果（含代价与风险）

- 团队需要负责 EKS、DolphinScheduler、SeaTunnel、Trino、Catalog 和可观测性组件的版本、升级、备份与安全。
- Trino 查询 S3 会产生请求费用和查询延迟，必须通过投影下推、Parquet/Iceberg、结果限制和资源组控制成本；不能预设其一定比 StarRocks 便宜。
- Iceberg REST Catalog 和 SeaTunnel Zeta 的生产适用性必须在第一周验证，失败时需要触发范围或选型复审。
- 自有 Pipeline 协议需要维护编译器和版本兼容，工作量大于直接把 DS 工作流暴露为用户模型。
- 平台中立不等于零云适配成本。网络、身份、密钥、镜像、备份和自动扩缩容仍需按云实现。
- 月末 Alpha 不具备生产级高可用、跨账号隔离、公开市场和自动修复能力。
