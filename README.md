# dwller · 对味

部署在客户自己 AWS 账号里的 AI 原生数据开发平台。目标是让中小企业在 AWS 上获得接近 DataWorks / DataArts 的一站式体验：接入数据 → 开发 → 调度 → 查询 → 看板，并由 AI agent 降低每一步的门槛。

> 状态：设计阶段（2026-10）。尚无可运行代码。

## 文档导航

| 文档 | 内容 |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 整体架构、组件、部署形态、分区（aws / aws-cn）差异 |
| [docs/adr/](docs/adr/) | 架构决策记录（ADR），已定决策及理由 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 阶段计划与任务列表 |
| [docs/tasks/](docs/tasks/) | 可交给编码 agent 执行的任务说明 |
| [AGENTS.md](AGENTS.md) | 编码 agent（Kimi Code 等）必须遵守的规则 |

## 协作方式

- 设计与评审：Claude（Claude Code）
- 编码实现：Kimi Code，按 `docs/tasks/` 中的任务说明执行，遵守 `AGENTS.md`
- 决策变更：先写/改 ADR，再改代码
