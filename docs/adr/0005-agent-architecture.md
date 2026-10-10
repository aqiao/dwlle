# 0005 Agent：AgentCore + 模型抽象 + 只经 API 工具访问数据
状态：已接受
日期：2026-10-09

## 背景
Agent 是核心差异化，需要同时在 Global 区（可用 Claude）和中国区（使用国内模型）运行。Agent 一旦直接操作客户数据库，风险很高。

## 决策
- Agent 运行时使用 Bedrock AgentCore（Runtime + Gateway）。
- 模型层抽象为 `ModelProvider` 接口，提供 `bedrock` 和 `openai_compatible` 两种实现，由部署配置选择。
- Agent **不直连数据库**，只能调用 dwlle-api 暴露的工具（以 MCP 形式经 AgentCore Gateway 提供）。
- 工具层强制执行以下约束：
  - 使用只读账号
  - 限制结果行数
  - 设置超时
  - 写操作只生成草稿，必须由用户确认后执行

## 理由
- 同一套 agent 代码可以在两个分区运行，客户可以自选模型和计费方式。
- 权限和审计集中在 API 层，便于做最小权限和操作留痕。

## 后果
- 待解决：AgentCore Runtime 如何访问私有 VPC 内的 dwlle-api（ARCHITECTURE Q3）。
- 待确认：中国区可用的模型清单（ARCHITECTURE Q4）。
- 不同模型的能力差异较大，需要建立 NL2SQL 评测集，逐个模型评估效果。
