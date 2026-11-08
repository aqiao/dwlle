# 架构决策记录（ADR）

每条决策一个文件，编号递增，不删除。推翻旧决策时新建 ADR，并把旧 ADR 状态改为"已被 00xx 取代"。

| 编号 | 标题 | 状态 |
|---|---|---|
| [0001](0001-aws-native-dual-partition.md) | AWS 原生，部署在客户账号，同时支持 aws / aws-cn | 已被 0009 取代（分区兼容约束保留） |
| [0002](0002-starrocks-shared-nothing.md) | 分析引擎：StarRocks 存算一体 on EC2 | 已被 0009 取代 |
| [0003](0003-dolphinscheduler.md) | 调度：DolphinScheduler，元数据库用 RDS PostgreSQL | 已接受（部分被 0009、0010 取代） |
| [0004](0004-sql-ide-and-bi.md) | SQL IDE 与 BI：Superset 过渡 + 自研 IDE，不用 Hue | 已接受（部分被 0009、0016 调整） |
| [0005](0005-agent-architecture.md) | Agent：AgentCore + 模型抽象 + 只经 API 工具访问数据 | 已接受（部分被 0009、0012、0016 取代） |
| [0006](0006-offline-artifacts.md) | 部署时不从公网下载，所有安装包走 artifacts bucket | 已接受 |
| [0007](0007-tech-stack.md) | 技术栈：CDK TS / Python FastAPI / React TS | 已接受（部分被 0009、0017 调整） |
| [0008](0008-scheduler-ui-split.md) | 调度界面：dwlle-web 做主路径，DS 原生界面做进阶运维 | 已被 0010 取代 |
| [0009](0009-neutral-control-and-data-plane.md) | 平台中立的 SaaS 控制平面与开源数据平面 | 已接受 |
| [0010](0010-self-owned-user-interface.md) | 客户可见界面全部由 dwlle 自研 | 已接受（阶段范围由架构与阶段计划覆盖） |
| [0011](0011-solution-scenario-pipeline.md) | 解决方案、业务场景与 Pipeline 三层抽象 | 已接受（术语及三层表述由 0014、0015 与现行声明调整） |
| [0012](0012-public-rest-and-fastmcp.md) | 公共 REST 与 FastMCP 共用应用服务 | 已接受（术语部分被 0014、0015 取代） |
| [0013](0013-workspace-and-solution-market.md) | 我的工作空间与方案市场分离 | 已接受（术语部分被 0014、0015 取代，导航以现行声明为准） |
| [0014](0014-workspace-terminology.md) | 将 Project 统一命名为 Workspace | 已接受（Solution 安装与对象关系以现行声明为准） |
| [0015](0015-workflow-terminology.md) | 将 Pipeline 统一命名为 Workflow | 已接受（对象关系以现行架构为准） |
| [0016](0016-keycloak-and-bedrock-selection.md) | Keycloak OIDC 与 Amazon Bedrock 首个模型提供方 | 已接受 |
| [0017](0017-openmetadata-lineage-authority.md) | OpenMetadata 作为数据血缘唯一权威存储 | 已接受 |

模板：

```
# 00xx 标题
状态：提议 | 已接受 | 已被 00yy 取代
日期：YYYY-MM-DD
## 背景
## 决策
## 理由
## 后果（含代价与风险）
```
