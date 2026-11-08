# 0017 OpenMetadata 作为数据血缘唯一权威存储

状态：已接受
日期：2026-11-08

## 背景

架构同时引入 dwlle 业务资产目录和 OpenMetadata 后，如果两者都能独立保存和修改 LineageEdge，会出现血缘重复、同步冲突和界面结果不一致。Alpha 不提前建立独立血缘库，Beta 接入 OpenMetadata 时需要从 Workflow 定义和 Trino SQL 解析结果初始化血缘。

## 决策

1. **OpenMetadata 是 LineageEdge 的唯一权威存储。** 血缘创建、更新、删除、人工修正和冲突裁决均以 OpenMetadata 为准。
2. Workflow 显式输入输出和 Trino SQL 解析结果是血缘生成依据。dwlle 通过受控适配器将这些结果写入 OpenMetadata，不在产品 PostgreSQL 中维护另一份可独立修改的权威血缘。
3. dwlle 保存 DataAsset 业务身份、权限、负责人和环境绑定，并维护 DataAsset、Polaris 表标识与 OpenMetadata 实体标识的稳定映射。
4. dwlle-web、REST 和 MCP 通过 DataAssetService 查询血缘。dwlle 可以保存可重建的缓存或读取索引，但缓存不是权威来源。
5. 自动同步必须幂等并区分自动血缘与人工血缘，不得覆盖或删除内部管理员的人工修正；冲突保留审计并进入人工复核。
6. OpenMetadata 原生 UI 仅限内部管理员，通过 SSO、受控 RBAC 和审计使用；客户继续通过 dwlle-web 或公共接口使用血缘能力。
7. dwlle 仍是 QualityRule 和 QualityResult 的权威来源，Trino 执行 SQL 质量检查。同步到 OpenMetadata 的质量结果仅为只读展示副本。

## 理由

- 单一权威存储可以避免 dwlle 与 OpenMetadata 双写和数据漂移。
- 保留 dwlle 的业务资产和权限模型，可以同时满足内部血缘管理与统一客户体验。
- 明确人工修正保护和缓存可重建规则，可以降低自动同步覆盖人工工作的风险。
- 将血缘权威与质量权威分开，避免两个治理组件同时拥有相同领域的裁决权。

## 后果（含代价与风险）

- dwlle 需要实现 OpenMetadata 适配器、稳定资产映射、幂等同步、权限化查询和缓存重建。
- OpenMetadata 的元数据库、搜索索引、备份恢复和版本升级成为数据平面的关键运维范围。
- 自动血缘与人工血缘需要可识别的来源信息及冲突复核流程，不能简单覆盖同步。
- Alpha 不建立独立权威血缘库；Beta 必须验证 Workflow 和 SQL 血缘初始化、人工修正保护及端到端读取路径。
