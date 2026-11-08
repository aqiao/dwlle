# 0004 SQL IDE 与 BI：Superset 过渡 + 自研 IDE，不用 Hue
状态：已接受（部分被 0009、0016 调整）
日期：2026-10-09

> 现行架构声明（2026-11-08）：现行可执行约束单独列于下节。Superset 验证期部署、长期 Embedded SDK 嵌入和 guest-token 账号打通仅保留作历史或可选方案，不是现行产品契约；任何集成不得违反不使用 iframe 和客户界面自研的约束。

## 现行有效约束

- 使用 React、Monaco 和 Trino 方言建设自研 SQL IDE，支持查询、结果网格、历史及保存为 Workflow 节点。
- SQL 查询必须执行超时、扫描/结果限制和 Workspace 权限校验。
- 不使用 Hue。
- Superset 不是必装组件，也不是默认客户路径；是否提供外链或其他集成形式由阶段计划决定。
- 不使用 iframe。若未来需要新的 BI 嵌入或 guest-token 集成，必须另建 ADR 明确安全边界和客户路径。
- 当前 AI 基础能力仅为只读失败诊断；SQL IDE 内嵌 Agent、NL2SQL 评测和自动修复不是现行基础要求。

## 背景

StarRocks 开源版没有 Web SQL 编辑器。SQL IDE 是用户停留时间最长的地方，也是 agent 体验的主战场。

## 历史决策（不得直接实施）

- 验证期：部署 Superset，用 SQL Lab 作为临时的 ad hoc 查询工具。
- MVP 期：自研 SQL IDE（React + Monaco），内嵌 agent，并支持查询结果一键转成调度任务。
- BI 看板长期使用 Superset，通过 Embedded SDK 嵌入 dwlle-web。
- 不使用 Hue。

## 历史理由与后果（仅作历史记录）

- Hue 以 Hadoop 和 Oozie 为中心，技术栈老旧，难以嵌入 agent。
- 把 IDE 交给第三方会削弱产品差异化。
- Superset 曾作为 StarRocks 生态的 BI 候选。
- 自研 IDE 曾预计约 2～3 周可出首版。
- 曾计划通过 guest token 处理 Superset 嵌入时的账号打通；该方案不是现行要求。
