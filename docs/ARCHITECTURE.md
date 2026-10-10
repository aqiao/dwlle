# dwlle 架构设计

版本：v0.1（2026-10-09） · 状态：草案

## 1. 目标与非目标

**目标（MVP）**：在客户 AWS 账号内，一条命令部署出可用的数据平台，跑通一条闭环：

> 接入数据源 → 用 SQL / 自然语言开发 ETL → 调度上线 → 失败时 AI 诊断 → ad hoc 查询与看板

**目标用户**：国内中小企业的数据/业务团队，数据量 GB ~ 数 TB，对成本敏感，熟悉 DataWorks / MySQL 生态。

**非目标（MVP 阶段明确不做）**
- 不自研任何计算/存储引擎
- 不追求 DataWorks 功能对齐（数据服务、复杂权限体系、多租户等延后）
- 不做实时 CDC（Flink 等），只做批量同步
- 不做 SaaS 托管，只做客户账号内部署
- 不做公网访问入口（见 §7 ICP）

## 2. 总体架构

```
                 客户 AWS 账号（aws 或 aws-cn 分区）
┌───────────────────────────────────────────────────────────────────┐
│ VPC（2 AZ）                                                        │
│                                                                   │
│  私有子网                                                          │
│  ┌──────────────────────────────┐   ┌──────────────────────────┐  │
│  │ App 节点（EC2, docker compose）│   │ StarRocks 节点（EC2）     │  │
│  │  - dwlle-web  (React)        │   │  - FE + BE 同机部署       │  │
│  │  - dwlle-api  (FastAPI)      │──▶│  - 数据：EBS gp3（独立卷） │  │
│  │  - DolphinScheduler           │   │  - MySQL 协议 :9030       │  │
│  │    (api/master/worker/alert)  │   └────────────┬─────────────┘  │
│  │  - Superset                   │                │ BACKUP        │
│  └──────────────┬───────────────┘                ▼               │
│                 │                       ┌──────────────────────┐  │
│                 ▼                       │ S3                    │  │
│  ┌──────────────────────────────┐       │  - backup bucket      │  │
│  │ RDS PostgreSQL（元数据库）     │       │  - artifacts bucket   │  │
│  │  db: dolphinscheduler/superset│       │  - landing bucket     │  │
│  │      /dwlle                  │       └──────────────────────┘  │
│  └──────────────────────────────┘                                 │
│                                                                   │
│  公有子网：NAT Gateway ×1     S3 Gateway Endpoint（免费）            │
└───────────────────────────────────────────────────────────────────┘
          │
          ▼
  Bedrock AgentCore（Runtime / Gateway） ──▶ 模型：Claude（Global）或 国内模型（aws-cn）
  Secrets Manager · CloudWatch Logs · SSM Session Manager · DLM（EBS 快照）
```

## 3. 组件

| 组件 | 选型 | 部署 | 说明 | ADR |
|---|---|---|---|---|
| 分析引擎 | StarRocks（存算一体） | 独立 EC2，Graviton 优先 | 数据放 EBS gp3，查询不走 S3 | 0002 |
| 调度 | Apache DolphinScheduler 3.x | App 节点 docker compose | 注册中心优先用 JDBC registry，避免 ZooKeeper（待验证）；主路径界面由 dwlle-web 提供，原生界面用于进阶运维 | 0003, 0008 |
| SQL IDE | 过渡：Superset SQL Lab；之后：自研（Monaco） | App 节点 | 不使用 Hue | 0004 |
| BI 看板 | Apache Superset | App 节点 | 长期保留，通过 Embedded SDK 嵌入 dwlle-web | 0004 |
| 元数据库 | RDS PostgreSQL（小规格） | 托管 | DS / Superset / dwlle 共用实例、分库 | 0003 |
| AI Agent | Bedrock AgentCore + 模型抽象层 | 托管 | Agent 只能通过 dwlle-api 暴露的工具访问数据 | 0005 |
| 后端 | Python 3.12 + FastAPI | App 节点 | Python 便于复用 sqlglot、agent SDK | 0007 |
| 前端 | React + TypeScript + Monaco | App 节点 | | 0007 |
| IaC | AWS CDK（TypeScript） | — | 同一代码同时支持 aws / aws-cn | 0001 |

### 3.1 关于元数据（对早期讨论的修正）

StarRocks 存算一体模式下，内表元数据由 StarRocks FE 自己管理，**不在 Glue Data Catalog 中**。因此：
- 数据地图 MVP 直接读取 StarRocks `information_schema`
- Glue Data Catalog 只在客户需要查询 S3 上的 Iceberg/Hive 外表时，作为 External Catalog 接入（可选）

### 3.2 数据接入（MVP 不引入额外组件）

| 来源 | 方式 |
|---|---|
| MySQL / PostgreSQL | StarRocks JDBC Catalog + `INSERT INTO ... SELECT`，由 DS 定时调度 |
| 文件（CSV/Parquet/JSON） | 上传至 landing bucket，`INSERT INTO ... SELECT * FROM FILES(...)` |
| 实时 CDC | 不在 MVP，后续评估 Flink CDC / Routine Load |

## 4. 自研部分（产品价值所在）

1. **StarRocks 任务类型（DS 插件或包装脚本）**：提交异步作业（Broker Load、`SUBMIT TASK`、物化视图刷新）后轮询 `information_schema` 直至完成，再向 DS 回报成功/失败。
2. **血缘**：用 sqlglot（StarRocks 方言）解析 DS 任务中的 SQL，生成表级 / 字段级血缘，存于 dwlle 库。
3. **数据质量**：基于 SQL 的规则（非空、唯一、阈值、波动），在 StarRocks 内执行，可作为 DS 任务节点。
4. **SQL IDE**：编辑、结果网格、库表树、历史、"查询一键转调度任务"。
5. **Agent 能力**：NL2SQL、ETL/DAG 生成、任务失败诊断（汇总 DS 日志 + StarRocks profile）。
6. **DS client 与调度页**：dwlle-api 中唯一调用 DS API 的模块（锁版本、契约测试），按 DS code 挂 dwlle 元数据；dwlle-web 提供任务列表、运行实例、重跑和深链接跳转（ADR-0008）。

## 5. Agent 安全模型

- Agent **不直连数据库**。所有数据访问经由 dwlle-api 暴露的工具（通过 AgentCore Gateway 以 MCP 形式提供）。
- 工具层强制：只读账号执行 ad hoc 查询；结果行数上限；超时；写操作（建表、建任务）只生成草稿，必须由用户在 UI 确认后执行。
- 模型抽象层：统一接口 `ModelProvider`，实现 `bedrock`（Global：Claude）与 `openai_compatible`（国内模型）。由部署配置选择。

## 6. StarRocks 默认配置（面向非专家用户）

部署时默认写入，用户无需调优：
- Resource Group：`rg_etl`（DS 账号）与 `rg_adhoc`（IDE/Superset/Agent 账号）分别限制 CPU / 内存
- 大查询熔断：按扫描行数、CPU 时间、内存设上限
- 查询队列：开启
- Spill to disk：开启，落在数据卷
- `query_timeout`：ad hoc 默认 300s，ETL 由任务单独设置

具体数值随实例规格计算，见任务 T003。

## 7. 分区差异（aws vs aws-cn）

| 方面 | 要求 |
|---|---|
| ARN / 域名 | 禁止硬编码 `arn:aws:`、`amazonaws.com`；使用 `Aws.PARTITION`、`Aws.URL_SUFFIX` 或 CDK 内建方法 |
| 安装包下载 | 中国区访问 GitHub / 海外下载站不可靠。所有第三方安装包（StarRocks、DS、Superset 镜像等）**预先放入 artifacts bucket**，部署时只从 S3 获取（ADR-0006） |
| 容器镜像 | 同上，镜像推送到客户账号 ECR，或打包为 tar 存 S3 |
| 实例规格 | Graviton 机型在各区可用性不同，实例类型必须可配置，并在 synth 时校验 |
| 模型 | Global：Bedrock Claude；aws-cn：国内模型（经 NAT 访问公网 API 或当地可用的托管模型） |
| 公网访问 | 中国区对外提供 Web 服务需 ICP 备案。MVP 只提供私网访问：SSM 端口转发 / 客户 VPN |
| 认证 | Cognito 在中国区可用性需确认；MVP 采用 dwlle 自有账号体系（待定，见 §9） |

## 8. 运维与可靠性（MVP 级别）

- 访问：无公网 IP，管理通过 SSM Session Manager
- 密钥：StarRocks root 密码、RDS 密码存 Secrets Manager，首次启动生成
- 备份：DLM 每日 EBS 快照（保留 7 天）+ StarRocks `BACKUP` 到 S3（逻辑备份）
- 故障恢复：EC2 自动恢复（CloudWatch recover 告警）；EBS 数据卷独立于实例生命周期，`RemovalPolicy.RETAIN`
- 节点身份：Route 53 私有托管区 + StarRocks FQDN 模式，实例替换后 IP 变化不影响 FE 元数据（T003 D2）
- 日志：CloudWatch Agent 采集 StarRocks / DS 日志

## 9. 待决问题

| # | 问题 | 负责人 | 截止 |
|---|---|---|---|
| Q1 | StarRocks 官方 ARM64 二进制是否满足生产使用？否则回退 x86（r7i） | T003 验证 | — |
| Q2 | DS 3.x JDBC registry 是否稳定，可否完全去掉 ZooKeeper | T007 验证 | — |
| Q3 | AgentCore Runtime 访问私有 VPC 内 dwlle-api 的方式 | 设计 | 阶段 3 前 |
| Q4 | 中国区可用的模型清单与调用方式 | 用户确认 | 阶段 3 前 |
| Q5 | 用户认证方案（自有账号 / Keycloak / Cognito） | 设计 | 阶段 2 前 |
| Q6 | NAT Gateway 成本是否需要换 NAT 实例选项 | 成本测算后 | — |
| Q7 | DS 3.x 是否支持 OIDC/OAuth2 登录，能否与 dwlle 单点登录 | T007 验证 | — |
