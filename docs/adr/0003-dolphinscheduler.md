# 0003 调度：DolphinScheduler，元数据库用 RDS PostgreSQL
状态：已接受
日期：2026-10-09

## 背景
需要可视化的 DAG 调度，支持补数据、重跑和告警，并且交互接近 DataWorks。

## 决策
- 使用 Apache DolphinScheduler 3.x，部署在 App 节点上（docker compose）。
- 元数据库使用 RDS PostgreSQL（小规格），与 Superset、dwlle 共用同一个实例，按库分开。
- 注册中心优先使用 JDBC registry，避免运维 ZooKeeper（待 T007 验证）。
- 不使用 MWAA 或 Step Functions 作为调度后端。

## 理由
- 国内用户熟悉 DolphinScheduler，采用 Apache 2.0 许可，能省下数月的调度开发量。
- MWAA 有固定的环境费用，对中小企业偏贵；Step Functions 不具备补数据、运维中心等数据调度语义。
- 用 RDS 托管元数据库，省去备份和高可用的运维工作，而且成本可控。

## 后果
- 需要自研"StarRocks 任务类型"，等待异步作业完成（见 ARCHITECTURE §4）。
- DolphinScheduler 的数据质量模块依赖 Spark，我们不使用它，改为自研基于 SQL 的质量规则。
- DolphinScheduler 的界面短期内直接暴露给用户，长期由 dwlle-web 封装核心操作。MVP 阶段的具体界面划分见 ADR-0008。
