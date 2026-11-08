# dwlle 开发计划

版本：v2.0（2026-11-08） · 状态：撰写中
关联文档：[架构设计](ARCHITECTURE.md)、ADR-0001～0017（含取代关系与各文件现行声明）

## 组织方式

开发计划按阶段拆分，不再以月份作为文档边界。架构文档维护阶段时间与能力方向，各阶段计划独立维护目标、范围、资源、里程碑、任务、风险、验收和交付物。

阶段计划中的日期必须与[架构阶段表](ARCHITECTURE.md#21-阶段与开发计划)保持一致。调整阶段时间或能力归属时，先更新架构及相关 ADR，再同步对应计划，不在单份计划中隐式改变其他阶段范围。

## 阶段文档

| 阶段 | 时间 | 核心目标 | 文档 |
|---|---|---|---|
| Alpha | 2026-11-01～2026-11-30 | 自研控制平面、DS 工作流、Trino 查询与基础质量闭环 | [PROJECT_PLAN_ALPHA.md](PROJECT_PLAN_ALPHA.md) |
| Beta | 2026-12-01～2026-12-31 | SeaTunnel/Polaris 全流程、OpenMetadata 唯一权威血缘与端到端集成 | [PROJECT_PLAN_BETA.md](PROJECT_PLAN_BETA.md) |
| Preview | 2027-01-01～2027-01-31 | 邀请制试运行、反馈处理、升级恢复和 GA 发布准备 | [PROJECT_PLAN_PREVIEW.md](PROJECT_PLAN_PREVIEW.md) |
| GA | 2027-02-01～2027-02-20 | 根据 Preview 证据完成正式上线评审 | 由 Preview Go/No-Go 评审产出 |

## 跨阶段约束

- 后一阶段开始前必须核对前一阶段验收结果和未验收项，不得默认继承“已完成”状态。
- 阶段 P0 是验收范围，P1 不得挤占 P0；扩大 P0 必须重新评审资源和时间。
- 客户可见功能统一通过 dwlle-web 或公共接口，DS/OpenMetadata 原生 UI 仅限内部管理员。
- dwlle Workflow 单向编译到 DS；OpenMetadata 是唯一权威血缘存储；dwlle 是质量规则与结果的权威来源。
- 所有阶段都遵守离线制品、最小权限、租户隔离、环境绑定、审计和可恢复要求。
- 各阶段未验收项必须显式交接，不能通过文档重命名或阶段切换视为完成。

## 状态说明

本次将原《2026 年 11 月内部 Alpha 项目计划书》拆分为阶段文档，并重新划分 SeaTunnel、Polaris 产品化和 OpenMetadata 的归属。Alpha v2.0、Beta v1.0、Preview v1.0 均需重新评审批准后，才能作为对应阶段的实施基线。
