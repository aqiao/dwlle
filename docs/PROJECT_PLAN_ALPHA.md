# dwlle Alpha 开发计划

版本：v2.0（2026-11-08） · 状态：撰写中（待重新批准）
计划窗口：2026-11-01～2026-11-30
关联文档：[架构设计](ARCHITECTURE.md)、ADR-0001～0017（含取代关系与各文件现行声明）
上一阶段：无 · 下一阶段：[Beta 开发计划](PROJECT_PLAN_BETA.md)

## 1. 阶段目标

在真实 AWS 账号中交付一套可演示、可重复部署、代码可继续迭代的内部 Alpha，跑通：

> OIDC 登录 → 配置 DataSourceAsset → 创建并发布 Workflow → Trino 查询/CTAS → SQL 质量检查 → DS 定时运行 → 查看 DataAsset、日志和运行状态 → 失败后 AI 只读诊断

Alpha 聚焦自研控制平面、DolphinScheduler 和 Trino。可以为 Trino 查询及 CTAS 部署后台 Iceberg Catalog，但不交付 Polaris 自研管理界面、SeaTunnel 批量接入或 OpenMetadata 血缘。

Alpha 不是生产级 SaaS，不开放自助注册和付费，不承诺生产高可用、跨云、跨账号、实时处理或自动修复。

### 1.1 完成定义

- P0 功能全部通过第 7 节验收，不接受仅页面或接口可用。
- 新环境可按文档重复部署，部署脚本幂等，第三方制品不从公网拉取。
- 关键路径有自动化测试，两个 AWS 分区均可 `cdk synth`。
- 无未处理的明文密钥、公开数据桶、公网管理端口或高危安全问题。
- 提供部署手册、演示脚本、已知限制、成本基线和回滚/恢复说明。
- 不建立 dwlle 权威血缘库，不以自研血缘实现替代 Beta 的 OpenMetadata 集成。

## 2. 资源与决策前提

### 2.1 资源假设

- 平台工程师 1 名全职：AWS/IaC、Kubernetes、开源组件和可观测性。
- 产品工程师 1 名全职：FastAPI、React、Workflow、OIDC 和 AI 工具层。
- 设计/评审/验收投入约 0.2 人月。

编码 agent 可以提高实现速度，但不能替代 AWS 部署、组件兼容、安全和恢复验证。若资源不成立，必须重新评审范围或日期，不得默认省略安全与端到端验收。

### 2.2 决策门槛

- ADR-0001～0017（含取代关系与各文件现行声明） 中与 Alpha 相关的决策作为实施约束。
- Keycloak、Bedrock 和后台 Iceberg Catalog 使用已锁定选型。
- 11-08 前完成 DS、Trino、后台 Catalog 和 Keycloak 的基础兼容性验证。
- 任何范围调整不得把 OpenMetadata 血缘或 SeaTunnel 全流程隐式塞回 Alpha P0。

## 3. 功能边界

### 3.1 P0：Alpha 必须完成

| 领域 | 包含范围 | 完成定义 |
|---|---|---|
| AWS 部署 | 单 AWS Global Region、同账号控制/数据平面、EKS、RDS PostgreSQL、S3、ECR | 新环境按手册部署成功；Global/中国区配置均可 synth |
| 租户与环境 | Tenant、Workspace、Environment；每客户独立数据平面 | 两个租户的产品元数据隔离通过；测试/生产绑定不混用 |
| 认证与权限 | Keycloak 对接一个 OIDC Provider；Admin/Developer/Viewer | 登录、登出、JWT 校验和关键 API 权限测试通过 |
| 自研 UI | 工作台、DAG、SQL IDE、DataAsset、运行中心和管理页 | 核心流程无需 DS 原生 UI、iframe 或深链接 |
| 分层模型 | Scenario/Solution 领域模型与只读原型 | 不影响 Workflow 主链路，不实现生产 Scenario 调度或 Solution 实际安装 |
| 公共接口 | `/api/v1`、OpenAPI、Controller 与 Application Service 分层 | 核心资源统一权限与审计，Web 不调用特权领域接口 |
| DataAsset | DataSourceAsset、DatasetAsset 统一模型；FileAsset 仅预留类型 | DataSource 可配置和测试；Dataset 可查看 Schema/预览；统一资产 ID |
| 环境绑定 | DataAssetBinding、SecretRef、InfrastructureBinding | 同一 WorkflowVersion 可切换 Environment，不复制密钥或物理资源定义 |
| Workflow | Trino SQL、质量检查节点；简单依赖；定时、手动、重试、超时 | dwlle 定义版本化并单向编译 DS；发布、运行和回滚可用 |
| SQL | Trino SELECT、CTAS、结果网格、查询历史 | 查询超时和结果行数限制生效；SQL 可保存为 Workflow 节点 |
| 数据质量 | dwlle 管理非空、唯一、行数阈值、新鲜度规则，Trino 执行 | 结果可见，失败阻止下游；QualityRule/Result 只以 dwlle 为准 |
| 运行中心 | Workflow/任务状态、开始结束时间、重试、受控日志查看 | DS 状态同步一致，长任务不阻塞 API |
| 监控告警 | CPU/内存、任务失败、运行时长、表行数阈值 | 注入故障后产生告警，并能定位到运行实例 |
| AI 诊断 | 失败摘要、最多三个根因候选、证据引用、修复建议 | 只读、脱敏、可反馈；模型不可用时保留规则错误摘要 |
| 内置模板 | 一个“Trino CTAS → 质量检查”模板 | 可从模板创建并运行 Workflow，不依赖市场功能 |
| 运维 | 制品锁定、日志采集、RDS 备份、资源限制、卸载/保留策略 | 完成一次恢复验证和重复部署验证 |

### 3.2 P1：仅在 P0 不延期时完成

- Workflow JSON 导出/导入及兼容性检查。
- Logo、主题色等静态 UI 配置。
- Superset 外链或只读嵌入。
- 第二种模型提供方。
- 简单的数据量趋势图和运行时长趋势图。
- Scenario 只读分组、跨 Workflow 依赖和数据契约展示。
- 只读 FastMCP 工具，包括 `workflow.*`、`run.*`、`data_asset.get_schema` 和已有诊断查询。

P1 不进入 Alpha 核心验收，不因完成 P1 而接受 P0 缺陷。

### 3.3 明确留到后续阶段

- SeaTunnel 批量接入、完整 raw/curated 接入链路。
- Polaris 自研产品界面和完整资产治理。
- OpenMetadata 部署、血缘初始化、血缘查询及人工修正。
- 独立 dwlle 权威 LineageEdge 存储。
- FileAsset 实际接入和文件血缘。
- 生产级 Scenario 调度、Solution 实际安装/升级及公开共享市场。
- 实时 CDC、Flink、Kafka、Spark 默认执行路径。
- MCP 写操作、自动修复、自动扩容和容量预测。
- 多区域、生产级高可用、跨账号/客户 VPC 和中国区实测。

## 4. 里程碑

| 里程碑 | 日期 | 出口条件 |
|---|---|---|
| A0：架构与选型冻结 | 11-03 | Alpha P0 冻结；Catalog/OIDC/模型选型明确 |
| A1：基础技术链路打通 | 11-08 | DS、Trino、后台 Catalog 健康；Trino 查询与 CTAS 成功 |
| A2：AWS 与身份可部署 | 11-15 | EKS/RDS/S3/ECR 和核心组件可重复部署；OIDC 可用 |
| A3：产品闭环可用 | 11-22 | 自研 UI 创建、发布、运行 Workflow；SQL、质量、DataAsset、日志可用 |
| A4：功能冻结 | 11-25 | P0 代码完成；AI 诊断接入；之后只修复缺陷和文档 |
| A5：Alpha 验收 | 11-30 | 端到端、隔离、安全、恢复和重复部署验收通过 |

## 5. 工作安排

### 5.1 基础选型与工程骨架（11-01～11-08）

- 冻结 Alpha 范围、组件版本和 `versions.json` 制品清单。
- 建立后端、前端、基础设施工程骨架及 CI。
- 搭建最小网络、EKS、RDS、S3、ECR。
- 部署 DS、Trino、Keycloak 和后台 Catalog。
- 验证 Trino SELECT/CTAS、DS 基础执行和日志采集。
- 建立 Tenant/Workspace/Environment/DataAsset/Workflow/Run 初版模型。

**停止线：** 11-08 仍不能完成 Trino 查询和 CTAS 时，不进入大规模 UI 开发，先解决 Catalog/Trino 兼容问题。

### 5.2 AWS、身份与资产基础（11-09～11-15）

- 完成核心组件可重复部署和 DS client 契约测试。
- 完成 OIDC、三种角色、审计和公共 API 权限。
- 完成 DataSourceAsset 配置、连接测试、SecretRef 和 DataAssetBinding。
- 接入组件指标、任务日志和基础告警。
- 建立最小资源与成本基线。

### 5.3 Workflow、SQL、质量与运行中心（11-16～11-22）

- 实现中立 Workflow Schema、版本、校验和 DS 编译器。
- 实现手动运行、定时、重试、回滚和状态同步。
- 实现 SQL IDE、查询限制和保存节点。
- 实现四类 SQL 质量规则及失败阻断。
- 实现 DatasetAsset Schema/预览和受控日志。
- 完成内置模板和自研 UI 闭环演示。

### 5.4 AI、稳定性与验收（11-23～11-30）

- 完成失败上下文收集、脱敏、只读诊断和反馈。
- 完成租户隔离、安全、资源限制和成本检查。
- 完成 RDS 恢复、重复部署和发布候选验证。
- 完成部署、运维、演示、已知限制和 Beta 交接文档。

## 6. 工程质量门槛

基础设施任务按仓库规范执行：

```bash
cd infra
npm ci
npm run build
npm run lint
npm test
npx cdk synth -c env=dev-global
npx cdk synth -c env=dev-cn
```

同时要求：

- 遍历 synth 模板，确认不存在字面量 `arn:aws:`。
- Python 通过 ruff、mypy strict 和 pytest；前端通过 lint、类型检查和 vitest。
- DS client、Workflow 编译器、OIDC/RBAC、SQL 限制和 DataAssetBinding 有核心路径测试。
- Shell 脚本使用 `set -euo pipefail`、幂等，并输出 `[dwlle]` 前缀日志。
- 所有资源带 `Project=dwlle`、`Env=<envName>`，客户数据资源按配置保留。
- 新增第三方组件、镜像和模型依赖必须进入版本与制品清单。

## 7. Alpha 端到端验收

| # | 操作 | 预期结果 |
|---|---|---|
| 1 | 在干净 AWS 环境部署发布候选 | 无公网下载；部署可重复；失败有明确日志 |
| 2 | 租户 A 用户经 OIDC 登录 | 获得 Workspace 角色；无权限 API 被拒绝 |
| 3 | 创建 DataSourceAsset 并绑定测试 Environment | 凭据只在 Secrets Manager，连接测试成功 |
| 4 | 从内置模板创建 Workflow | 包含 Trino SQL/CTAS 和质量检查节点，不要求 SeaTunnel |
| 5 | 发布并手动运行 | 目标 Iceberg 表生成，重复运行符合幂等约定 |
| 6 | 设置定时并执行重试和版本回滚 | DS 执行正确，dwlle 状态和审计一致 |
| 7 | 切换生产 Environment 发布同一版本 | 重新绑定生产资源，不复用测试 SecretRef |
| 8 | 查询目标表并查看 DatasetAsset | SQL 限制生效，Schema 和预览正确，不要求血缘 |
| 9 | 将非空或唯一规则制造为失败 | 下游停止，质量结果和告警可见 |
| 10 | 注入错误 SQL 或错误连接并点击 AI 诊断 | 显示摘要、证据、候选原因和建议；不自动修复 |
| 11 | 用租户 B 访问租户 A 的 API/对象 | 所有越权请求被拒绝且有审计 |
| 12 | 恢复产品元数据库和后台 Catalog 并再次部署 | 产品数据可恢复，CTAS 表仍可读取，脚本幂等，无重复资源 |
| 13 | 检查成本、日志和卸载 | 成本可解释，无敏感日志，保留策略符合配置 |

### 7.1 不适用项与 Beta 交接

- **MCP**：Alpha 仅作为 P1 可选能力，不纳入 P0 核心验收；未实施或未验收部分交接 Beta。若 Alpha 已交付 P1 MCP，则仍须验证统一权限与审计。
- **OpenMetadata**：部署、血缘初始化与查询、人工修正、SSO 和恢复均为 Alpha 不适用项，交接 Beta。
- **Polaris 产品化**：自研管理界面、完整资产治理和完整生产恢复演练为 Alpha 不适用项，交接 Beta；Alpha 部署的后台 Catalog 仍须按第 12 项验证基础恢复和 CTAS 表可读性。

上述不适用项不构成 Alpha P0 缺陷，但必须进入 Beta 交接清单，不得标记为已实施或已验收。

## 8. 风险与应对

| 风险 | 早期信号 | 应对 |
|---|---|---|
| Trino/Catalog 集成超预期 | A1 查询或 CTAS 未通 | 停止 UI 扩张；复审后台 Catalog，不提前引入 OpenMetadata |
| DS 双向同步复杂 | 用户需要直接修改 DS 定义 | 坚持 dwlle 单向编译，DS 只做受控排障 |
| 环境绑定泄漏测试资源 | 生产运行引用测试 SecretRef | 阻断发布并补充 DataAssetBinding 隔离测试 |
| EKS/常驻组件成本过高 | A2 最小成本超出预期 | 调整资源池和规格，如实发布成本 |
| AI 幻觉或泄露 | 建议无证据、上下文含敏感值 | 强制证据引用、脱敏和只读工具；不达标则标为实验功能 |
| Alpha 范围重新膨胀 | 出现 SeaTunnel/OpenMetadata P0 任务 | 移至 Beta，除非重新评审架构和日期 |

## 9. 阶段交付物

- 可部署的后端、前端、数据平面配置和 AWS CDK 代码。
- 锁定的组件/镜像版本及离线制品。
- Trino/质量 Workflow 模板和可复现演示数据。
- 自动化测试、AWS 端到端验收结果和两分区 synth 结果。
- 部署、升级/回滚、备份恢复和故障处理手册。
- 最小运行成本基线、已知限制和 Beta 交接清单。
- 未验收项清单，不以“完成”掩盖未验证能力。
