# 0003 调度：DolphinScheduler，元数据库用 RDS PostgreSQL
状态：已接受（部分被 0009、0010 取代）
日期：2026-10-09

> 现行架构声明（2026-11-08）：现行可执行约束单独列于下节。原“决策”和“后果”仅保留作历史记录，不得直接实施；App 节点 docker compose、StarRocks 任务类型和向客户开放 DS 原生 UI 均已失效。

## 现行有效约束

- 使用 DolphinScheduler 3.4.3，部署于 Kubernetes 数据平面，作为受控后台调度与执行引擎。
- 元数据库使用 RDS PostgreSQL。允许不同组件共用 RDS 实例，但必须按数据库或 schema 隔离，不得混用表结构、凭据或权限。
- 注册中心优先使用 JDBC registry；不使用 MWAA 或 Step Functions 作为调度后端。
- dwlle WorkflowVersion 是定义事实来源，通过 DS client 单向编译和调用；DS 是执行状态来源，不反向同步定义。
- DS 原生 UI 仅限内部管理员受控排障，普通用户和客户管理员无直接访问权限。
- 不使用依赖 Spark 的 DS 数据质量模块；QualityRule/QualityResult 由 dwlle 管理，Trino 执行 SQL 质量检查。
- 不再开发 StarRocks 专属任务类型，节点交付范围以架构和阶段计划为准。

## 背景

需要可视化的 DAG 调度，支持补数据、重跑和告警，并且交互接近 DataWorks。

## 历史决策（不得直接实施）

- 使用 Apache DolphinScheduler 3.x，部署在 App 节点上（docker compose）。
- 元数据库使用 RDS PostgreSQL（小规格），与 Superset、dwlle 共用同一个实例，按库分开。
- 注册中心优先使用 JDBC registry，避免运维 ZooKeeper（待 T007 验证）。
- 不使用 MWAA 或 Step Functions 作为调度后端。

## 历史理由与后果（仅作历史记录）

- 国内用户熟悉 DolphinScheduler，采用 Apache 2.0 许可，能省下数月的调度开发量。
- MWAA 有固定的环境费用，对中小企业偏贵；Step Functions 不具备补数据、运维中心等数据调度语义。
- 用 RDS 托管元数据库，省去备份和高可用的运维工作，而且成本可控。
- 需要自研 StarRocks 任务类型，等待异步作业完成。
- DolphinScheduler 的数据质量模块依赖 Spark，改为自研基于 SQL 的质量规则。
- DolphinScheduler 的界面曾计划短期直接暴露给用户，长期由 dwlle-web 封装；该界面决策已由 ADR-0010 取代。
