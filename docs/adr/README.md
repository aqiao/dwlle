# 架构决策记录（ADR）

每条决策一个文件，编号递增，不删除。推翻旧决策时新建 ADR，并把旧 ADR 状态改为"已被 00xx 取代"。

| 编号 | 标题 | 状态 |
|---|---|---|
| [0001](0001-aws-native-dual-partition.md) | AWS 原生，部署在客户账号，同时支持 aws / aws-cn | 已接受 |
| [0002](0002-starrocks-shared-nothing.md) | 分析引擎：StarRocks 存算一体 on EC2 | 已接受 |
| [0003](0003-dolphinscheduler.md) | 调度：DolphinScheduler，元数据库用 RDS PostgreSQL | 已接受 |
| [0004](0004-sql-ide-and-bi.md) | SQL IDE 与 BI：Superset 过渡 + 自研 IDE，不用 Hue | 已接受 |
| [0005](0005-agent-architecture.md) | Agent：AgentCore + 模型抽象 + 只经 API 工具访问数据 | 已接受 |
| [0006](0006-offline-artifacts.md) | 部署时不从公网下载，所有安装包走 artifacts bucket | 已接受 |
| [0007](0007-tech-stack.md) | 技术栈：CDK TS / Python FastAPI / React TS | 已接受 |
| [0008](0008-scheduler-ui-split.md) | 调度界面：dwlle-web 做主路径，DS 原生界面做进阶运维 | 已接受 |

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
