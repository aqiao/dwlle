# 0004 SQL IDE 与 BI：Superset 过渡 + 自研 IDE，不用 Hue
状态：已接受
日期：2026-10-09

## 背景
StarRocks 开源版没有 Web SQL 编辑器。SQL IDE 是用户停留时间最长的地方，也是 agent 体验的主战场。

## 决策
- 验证期：部署 Superset，用 SQL Lab 作为临时的 ad hoc 查询工具。
- MVP 期：自研 SQL IDE（React + Monaco），内嵌 agent，并支持"查询结果一键转成调度任务"。
- BI 看板长期使用 Superset，通过 Embedded SDK 嵌入 dwlle-web。
- 不使用 Hue。

## 理由
- Hue 以 Hadoop 和 Oozie 为中心，技术栈老旧，难以嵌入 agent，社区活跃度也在下降。
- 把 IDE 交给第三方，等于把产品差异化交出去。
- BI 不是差异化所在，Superset 社区活跃，官方支持 StarRocks。

## 后果
- 自研 IDE 预计约 2~3 周可出首版。
- 需要处理 Superset 与 dwlle 的账号打通（嵌入时使用 guest token）。
