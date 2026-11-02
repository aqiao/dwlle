# dwlle · 对味

AWS 首发、平台中立的 AI 原生数据开发平台。自研 SaaS 控制平面和全部客户界面，以 DolphinScheduler、SeaTunnel、Trino 和 Iceberg 构成开源数据平面，为中小企业提供接入、开发、调度、查询、质量、血缘和 AI 辅助运维的一站式体验。

> 状态：内部 Alpha 实施准备（2026-11）。当前基线为 ADR-0009、ADR-0010 和 11 月项目计划，尚无可运行平台代码。

## 文档导航

| 文档 | 内容 |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 整体架构、组件、部署形态、分区（aws / aws-cn）差异 |
| [docs/adr/](docs/adr/) | 架构决策记录（ADR），已定决策及理由 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 阶段计划与任务列表 |
| [docs/PROJECT_PLAN_2026-11.md](docs/PROJECT_PLAN_2026-11.md) | 2026 年 11 月内部 Alpha 范围与倒排计划 |
| [docs/tasks/](docs/tasks/) | 可交给编码 agent 执行的任务说明 |
| [AGENTS.md](AGENTS.md) | 编码 agent（Kimi Code 等）必须遵守的规则 |

## 协作方式

- 设计与评审：Claude（Claude Code）
- 编码实现：Kimi Code，按 `docs/tasks/` 中的任务说明执行，遵守 `AGENTS.md`
- 决策变更：先写/改 ADR，再改代码
