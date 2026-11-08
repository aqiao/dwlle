# dwlle Beta 开发计划

版本：v1.0（2026-11-08） · 状态：撰写中（待批准）
计划窗口：2026-12-01～2026-12-31
关联文档：[架构设计](ARCHITECTURE.md)、ADR-0001～0017（含取代关系与各文件现行声明）
上一阶段：[Alpha 开发计划](PROJECT_PLAN_ALPHA.md) · 下一阶段：[Preview 开发计划](PROJECT_PLAN_PREVIEW.md)

## 1. 阶段目标

在 Alpha 控制平面和 Trino/DS 基础上，交付完整数据接入与血缘闭环：

> DataSourceAsset → SeaTunnel 全量/追加接入 → Polaris/Iceberg raw 表 → Trino curated 表与质量检查 → OpenMetadata 唯一权威血缘 → dwlle-web 查询与展示

Beta 同时完成 Polaris 自研产品界面、OpenMetadata 内部管理入口、持久化与恢复，以及真实 AWS 环境的全流程集成测试。

### 1.1 完成定义

- P0 功能全部通过第 7 节验收。
- OpenMetadata 是唯一权威 LineageEdge 存储，dwlle 不存在可独立修改的权威血缘副本。
- Workflow 声明血缘、Trino SQL 解析血缘和内部管理员人工修正在同一模型下工作。
- Polaris、OpenMetadata 元数据库和搜索索引具备明确的持久化、备份与恢复路径。
- 标准链路可重复部署和运行，部署无公网下载，测试与生产环境绑定隔离。
- Alpha 已有 Workflow 和 DataAsset 可按兼容策略升级，不要求重新创建全部定义。

## 2. 前置条件与资源

### 2.1 Alpha 出口检查

- Alpha P0 验收完成，或未验收项已明确记录且经评审不阻塞 Beta。
- DataAsset、DataAssetBinding、WorkflowVersion 和 Run 标识稳定。
- dwlle QualityRule/QualityResult 已可用，Trino 执行路径明确。
- Alpha 未建立独立权威血缘库；如存在实验性血缘数据，必须先清理或标记为非权威来源。

### 2.2 资源假设

- 平台工程师 1 名全职：SeaTunnel、Polaris、OpenMetadata、Kubernetes、持久化和恢复。
- 产品工程师 1 名全职：DataAsset、血缘适配器、自研界面、权限和 API。
- 设计/评审/验收投入约 0.2 人月，重点评审血缘冲突、租户隔离和升级兼容。

## 3. 功能边界

### 3.1 P0：Beta 必须完成

| 领域 | 包含范围 | 完成定义 |
|---|---|---|
| SeaTunnel 接入 | MySQL/PostgreSQL 全量和追加写入 S3 Iceberg | 失败可重试，重复执行不产生非预期重复数据 |
| Polaris 产品化 | 持久化 Catalog、自研配置与资产视图、DataAsset 映射 | 重启后表元数据不丢失；dwlle 资产与 Catalog 标识一致 |
| 标准 Workflow | SeaTunnel、Trino SQL、质量检查节点和内置全流程模板 | 从模板创建并运行 raw/curated 全链路成功 |
| DataAsset 环境绑定 | 数据源、raw/curated Dataset 的测试/生产物理绑定 | 跨 Environment 发布不混用连接、路径或密钥 |
| OpenMetadata 部署 | OpenMetadata 2.0.5、元数据库、搜索索引、离线制品 | 可重复部署；重启和恢复后血缘可用 |
| 血缘初始化 | Workflow 显式输入输出、Trino SQL 解析结果写入 OpenMetadata | Alpha Workflow 可初始化血缘，无重复资产和重复边 |
| 血缘权威 | OpenMetadata 唯一权威 LineageEdge 存储 | dwlle PostgreSQL 不存在可独立修改的权威 LineageEdge |
| 血缘读取 | DataAssetService 为 dwlle-web、REST、MCP 提供权限化查询 | 客户不接触 OpenMetadata 管理凭证；缓存可从 OpenMetadata 重建 |
| 公共 REST 与 MCP | 承接并补齐 Alpha P1 的只读 MCP，统一权限、Scope 和审计 | REST/MCP 越权被拒绝，审计保留 actor/agent/scopes；Alpha 未完成部分在 Beta 补齐 |
| 人工修正 | 内部管理员通过 OpenMetadata 原生 UI 修正血缘 | SSO/RBAC/审计生效；自动同步不覆盖或删除人工修正 |
| 血缘同步 | 稳定资产映射、来源识别、幂等写入、冲突复核 | 重复同步结果一致；冲突有记录且不自动覆盖 |
| 数据质量 | dwlle 管理规则与结果，Trino 执行；可选同步只读结果 | 质量失败阻断下游；OpenMetadata 不成为第二质量权威 |
| 内部管理入口 | OpenMetadata SSO、受控 RBAC、网络隔离和审计 | 普通用户和客户管理员不能访问原生 UI |
| 可观测性 | 接入行数、同步延迟、冲突数、血缘查询失败和组件指标 | 故障可定位到 Workflow、DataAsset 或同步任务 |
| 运维恢复 | Polaris/OpenMetadata 数据库备份、索引重建和恢复演练 | 恢复后资产映射和血缘一致，缓存可重建 |

### 3.2 P1：仅在 P0 不延期时完成

- S3 CSV/Parquet FileAsset 登记、Schema 和预览。
- 文件到 Dataset 的表级血缘。
- 字段级血缘技术验证，不作为正式承诺。
- 血缘同步指标看板和冲突处理工作台。
- 第二种通知渠道和更多质量告警模板。

### 3.3 明确不做

- 实时 CDC、Flink、Kafka、Spark 默认执行路径。
- 跨 Tenant 直接血缘或 Workflow 引用。
- 公开共享市场、Solution 实际公开售卖和自动升级。
- 完整数据地图、跨版本影响分析和自动修复。
- 未经评审的双向血缘同步或 dwlle 第二权威血缘库。

## 4. 里程碑

| 里程碑 | 日期 | 出口条件 |
|---|---|---|
| B0：接口与迁移设计冻结 | 12-04 | 资产映射、血缘来源、人工修正和 Alpha 升级策略评审通过 |
| B1：组件兼容性打通 | 12-10 | SeaTunnel → Polaris/Iceberg → Trino 手动链路成功；OpenMetadata 可写入查询 |
| B2：持久化与产品集成完成 | 12-17 | Polaris/OpenMetadata 可重复部署；自研资产和血缘页面可用 |
| B3：全流程闭环完成 | 12-24 | 标准 Workflow、质量、血缘、人工修正和权限链路通过集成测试 |
| B4：功能冻结 | 12-28 | P0 完成，之后只修复阻断缺陷和文档 |
| B5：Beta 验收 | 12-31 | 端到端、恢复、隔离、同步冲突和重复部署验收通过 |

## 5. 工作安排

### 5.1 设计、供应链与兼容性（12-01～12-10）

- 冻结 DataAsset、Polaris、OpenMetadata 标识映射和血缘来源模型。
- 将 OpenMetadata 镜像、digest、制品和 sha256 纳入 `versions.json` 与离线预置流程。
- 验证 SeaTunnel Zeta 全量/追加、失败恢复和 Iceberg 写入。
- 验证 Polaris 持久化、Trino 查询和重启恢复。
- 验证 OpenMetadata 血缘写入、查询、人工修正和权限模型。

**停止线：** 12-10 仍无法完成手动数据链路或 OpenMetadata 基本血缘读写时，暂停 UI 扩张，先复审组件兼容和范围。

### 5.2 持久化、接入与资产映射（12-11～12-17）

- 完成 SeaTunnel 任务封装、重试和幂等验证。
- 完成 Polaris 自研配置与资产视图。
- 完成 OpenMetadata 元数据库、索引、备份和离线部署。
- 实现 DataAsset 与 Polaris/OpenMetadata 的稳定映射。
- 实现 Alpha Workflow/DataAsset 的兼容升级和血缘初始化。

### 5.3 血缘同步、质量与全流程（12-18～12-24）

- 实现 Workflow/Trino SQL 血缘的幂等写入。
- 实现 DataAssetService 权限化血缘读取和缓存重建。
- 实现内部管理员 SSO、人工修正保护和冲突复核。
- 完成全流程内置模板、质量阻断和只读质量结果同步。
- 完成同步指标、日志、告警和排障入口。

### 5.4 恢复、安全与验收（12-25～12-31）

- 完成 Polaris/OpenMetadata 重启、备份恢复和索引重建。
- 完成多租户、跨 Environment、越权和原生 UI 访问测试。
- 在干净 AWS 环境重复部署并执行第 7 节验收。
- 完成 Preview 试运行手册、已知限制和未验收项清单。

## 6. 工程质量门槛

- 延续 Alpha 的构建、lint、类型检查、自动化测试和两分区 synth 要求。
- SeaTunnel 包装、Polaris 持久化、OpenMetadata 适配器和冲突保护必须有核心路径测试。
- 血缘同步测试至少覆盖重复执行、资产改名、Workflow 回滚、人工修正、OpenMetadata 重启和缓存重建。
- 测试不得仅验证 dwlle 页面，还必须核对 OpenMetadata 中的权威血缘。
- 所有新组件、镜像和制品进入 `versions.json`，部署不得从公网下载。

## 7. Beta 端到端验收

| # | 操作 | 预期结果 |
|---|---|---|
| 1 | 在干净 AWS 环境部署 Beta 候选 | 所有制品离线获取，Polaris/OpenMetadata 持久化配置正确 |
| 2 | 创建 DataSourceAsset 并运行全流程模板 | 生成 SeaTunnel → Trino SQL → 质量检查 Workflow |
| 3 | 执行全量和追加接入 | raw/curated 表正确，重试和重复执行符合幂等约定 |
| 4 | 重启 Polaris 并查询表 | Catalog 元数据不丢失，Trino 查询正常 |
| 5 | 查看 DataAsset 与血缘 | dwlle 展示正确的表级上下游，DataAsset 映射一致 |
| 6 | 直接核对 OpenMetadata | 权威血缘与 dwlle 展示一致，不存在第二份可写 dwlle 血缘库 |
| 7 | 修改 Workflow 并重复同步 | 自动血缘幂等更新，不产生重复资产或重复边 |
| 8 | 内部管理员在 OpenMetadata 修正血缘后再次同步 | 人工修正保留，冲突有审计且不自动覆盖 |
| 9 | 普通用户和客户管理员尝试访问 OpenMetadata 原生 UI | 访问被拒绝；内部管理员可通过 SSO 和受控 RBAC 使用 |
| 10 | 通过 REST/MCP 查询血缘并检查权限与审计 | 权限取交集且越权被拒绝，审计保留 actor/agent/scopes，不暴露 OpenMetadata 管理凭证 |
| 11 | 将质量规则制造为失败 | 下游停止，dwlle 质量结果正确；可选 OpenMetadata 副本只读 |
| 12 | 删除 dwlle 血缘缓存并重建 | 缓存从 OpenMetadata 完整恢复，不影响权威血缘 |
| 13 | 恢复 Polaris/OpenMetadata 元数据库并重建索引 | 资产映射和血缘可查询，恢复步骤可重复 |
| 14 | 使用租户 B 或错误 Environment 访问资产 | 越权和错误资源绑定被拒绝并记录审计 |
| 15 | 检查成本、日志、制品和卸载 | 成本可解释，无敏感日志和公网下载，保留策略符合配置 |

## 8. 风险与应对

| 风险 | 早期信号 | 应对 |
|---|---|---|
| SeaTunnel/Polaris 兼容不足 | B1 手动链路未通 | 缩减连接器范围或复审执行引擎，不自研替代 Catalog |
| 资产映射不稳定 | 改名或迁移后出现重复资产和断血缘 | 使用稳定 ID 和显式映射，停止依赖显示名称拼接 |
| 自动同步覆盖人工修正 | 同步后管理员修改消失 | 阻断发布，修复来源识别与冲突保护 |
| dwlle 形成第二权威血缘 | API 直接读写本地 LineageEdge | 统一改为 OpenMetadata 权威，删除或只读化本地副本 |
| OpenMetadata 运维复杂 | 恢复失败、索引不一致、成本过高 | 缩减非核心采集范围，完成恢复演练并如实发布成本 |
| Beta 范围膨胀 | 字段级血缘/FileAsset 影响 P0 | 移至 P1 或后续阶段 |

## 9. 阶段交付物

- SeaTunnel 标准接入模板、Polaris 产品化配置和自研资产界面。
- OpenMetadata 离线部署、血缘适配器、权限化读取和内部管理入口。
- 血缘初始化、人工修正保护、冲突复核和缓存重建能力。
- 全流程自动化测试、恢复演练、两分区 synth 和 Beta 验收结果。
- 部署、升级、备份恢复、故障处理和 Preview 试运行手册。
- 成本基线、已知限制和未验收项清单。
