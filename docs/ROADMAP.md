# 路线图

当前基线：[架构设计](ARCHITECTURE.md)、ADR-0001～0017（含取代关系与各文件现行声明） 和 [阶段开发计划](PROJECT_PLAN.md)。

> 原 StarRocks 存算一体路线已由 ADR-0009 取代，原 T001～T003 任务保留作历史记录，不再直接作为新平台实施任务。`phase1/` 是独立业务项目，不属于当前平台的代码基础或交付范围。

## 阶段路线

| 阶段 | 时间 | 目标 | 实施依据 |
|---|---|---|---|
| Alpha | 2026-11-01～2026-11-30 | 自研控制平面、DolphinScheduler 工作流、Trino 查询、基础质量检查与只读 AI 失败诊断 | [Alpha 开发计划](PROJECT_PLAN_ALPHA.md) |
| Beta | 2026-12-01～2026-12-31 | SeaTunnel/Polaris 全流程、OpenMetadata 唯一权威血缘和端到端集成 | [Beta 开发计划](PROJECT_PLAN_BETA.md) |
| Preview | 2027-01-01～2027-01-31 | 邀请制试运行、反馈处理、升级恢复、发布准备、网站与社区建设 | [Preview 开发计划](PROJECT_PLAN_PREVIEW.md) |
| GA | 2027-02-01～2027-02-20 | 根据 Preview 验收证据完成上线评审 | Preview Go/No-Go 输出 |

详细 P0/P1、资源、里程碑、工作安排和验收以各阶段文档为准，本路线图不复制月度实施任务。

## 跨阶段架构约束

- 自研 SaaS 控制平面和全部客户界面，DS/OpenMetadata 原生 UI 仅限内部管理员。
- dwlle Workflow 单向编译到 DS，不做定义双写。
- DataSource、File、Dataset 统一使用 DataAsset 业务身份，并通过 DataAssetBinding 绑定环境资源。
- OpenMetadata 是 LineageEdge 唯一权威存储，dwlle 缓存必须可重建。
- dwlle 是 QualityRule/QualityResult 权威来源，Trino 执行 SQL 质量检查。
- 部署不从公网下载，所有第三方组件进入版本与制品清单。

## 后续候选方向

以下能力不自动进入当前阶段 P0，须根据阶段验收和真实反馈单独评审：

1. Scenario 更完整的跨 Workflow 数据契约、SLA 和失败影响分析。
2. Solution 实际安装、升级和公开共享市场。
3. MCP 草稿与审批写操作、Webhook 和事件订阅。
4. 跨账号/客户 VPC 部署、多区域和生产级高可用。
5. 更多数据源、FileAsset 实际接入和字段级血缘。
6. 补数据、子工作流和复杂依赖等高级调度 UI。
7. Spark/Flink/CDC 和外部平台适配。
8. 经审批的低风险自动修复。

## 每个任务的流程

1. 设计方编写任务说明 `docs/tasks/Txxxx-*.md`，明确所属阶段、范围和验收标准；历史 `Txxx-*.md` 文件不强制重命名。
2. 编码 agent 阅读 AGENTS、现行架构、已接受 ADR 和任务说明。
3. 按[架构术语与规范](ARCHITECTURE.md#133-github-分支命名)创建任务分支并小步提交，提交信息使用英文并以 `Txxxx:` 开头；历史分支与任务文档中的旧格式不强制回填。
4. 完成自动化测试、两分区 synth 和任务验收后，再进行代码评审。
5. 涉及真实 AWS 的任务必须在目标账号部署验证；未实测项如实记录。
6. 任务范围必须归属一个阶段；跨阶段依赖和未验收项在对应阶段计划中显式记录。
