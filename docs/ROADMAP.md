# 路线图

前提：每天约 2 小时。编码由 Kimi Code 完成，设计与评审由 Claude 负责。

## 阶段 1：引擎与基准测试（第 1 个月）

目标：一键部署单节点 StarRocks，并产出**成本与性能对比报告**（第一份销售材料）。

| 任务 | 内容 | 依赖 | 状态 |
|---|---|---|---|
| [T001](tasks/T001-cdk-skeleton.md) | CDK 骨架、配置加载、网络和 S3 存储桶 | — | 待开始 |
| [T002](tasks/T002-artifact-staging.md) | `versions.json` 与 `stage-artifacts` 脚本 | T001 | 待开始 |
| [T003](tasks/T003-starrocks-node.md) | StarRocks 单节点：EC2、数据卷、安装、初始化（账号、资源组） | T001, T002 | 待开始 |
| T004 | 备份与恢复：DLM 快照、每日 `BACKUP` 到 S3、恢复操作手册，以及**实例替换演练**（验证 FQDN 模式） | T003 | 待写 |
| T005 | TPC-DS 基准测试：StarRocks on EC2 对比 Athena、Redshift Serverless，同时比较性能和成本 | T003 | 待写 |

## 阶段 2：调度与查询（第 2 个月）

| 任务 | 内容 |
|---|---|
| T006 | RDS PostgreSQL 元数据库（DolphinScheduler、Superset、dwlle 分库） |
| T007 | App 节点与 DolphinScheduler（验证 JDBC registry，ARCHITECTURE Q2） |
| T008 | StarRocks 异步任务包装（提交后轮询，直到完成） |
| T009 | Superset 部署（SQL Lab 作为过渡 IDE）并连接 StarRocks |
| T010 | 数据接入示例：JDBC Catalog 同步 MySQL，`FILES()` 导入文件 |

## 阶段 3：dwlle 产品层与 Agent（第 3 个月）

顺序说明：先打通调度页和失败诊断，再做自研 IDE。这样 IDE 完成前，失败诊断就能在 dwlle-web 上线（ADR-0008）。

| 任务 | 内容 |
|---|---|
| T011 | dwlle-api 骨架与认证方案（ARCHITECTURE Q5） |
| T012 | DS client 与同步：API 封装、契约测试、按 DS code 挂元数据（ADR-0008） |
| T013 | dwlle-web 调度页：任务列表、运行实例、重跑、DS 深链接跳转 |
| T014 | Agent 工具层（MCP）与 AgentCore 接入（ARCHITECTURE Q3/Q4） |
| T015 | 任务失败诊断 agent（入口在 T013 的运行实例页） |
| T016 | 自研 SQL IDE 首版，含"查询一键发布为定时任务" |
| T017 | sqlglot 血缘解析与数据地图 |
| T018 | NL2SQL，并建立评测集 |

## 每个任务的流程

1. Claude 编写任务说明 `docs/tasks/Txxx-*.md`
2. 你把任务说明交给 Kimi Code：
   > 读 AGENTS.md 和 docs/tasks/Txxx-*.md，按任务说明执行
3. Kimi 在 `task/Txxx-*` 分支上提交，并输出交付说明
4. Claude 执行 `/code-review` 审查该分支，你决定是否合并
5. 你在真实 AWS 账号中部署验证。涉及中国区的任务，两个分区都要部署一次
