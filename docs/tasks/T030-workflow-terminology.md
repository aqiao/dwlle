# T030：Workflow 术语与中文工作流界面

状态：已完成
日期：2026-11-03

## 目标

将 Pipeline 统一调整为 Workflow，同时确保所有用户可见界面文案统一使用中文“工作流”，并在 BACKLOG 记录国际化能力。

## 范围

- 接受 ADR-0015，明确 `Tenant → Workspace → Environment → Scenario → Workflow → TaskNode`。
- 更新现行架构、路线图、月底计划、README、原型说明和 BACKLOG。
- 代码符号、REST/MCP 示例和测试使用 Workflow。
- 导航、标题、按钮、统计、模板和安装记录等界面文字统一为中文“工作流”。
- 重命名相关页面文件，不改写历史 ADR，不改变运行逻辑。
- BACKLOG 增加国际化备忘，不进入当前计划。

## 验收标准

1. 文档/API 使用 Workflow，用户可见界面不再出现 Pipeline 或 Workflow 英文字样。
2. 页面文件与代码符号一致，导航为中文工作流。
3. BACKLOG 包含国际化功能记录且不影响当前计划。
4. build、lint、测试、Markdown 链接和 diff 检查通过。
5. 在 `task/T030-workflow-terminology` 分支提交，提交信息以 `T030:` 开头。

## 交付说明

### 完成内容

- 接受 ADR-0015，主架构升级为 v0.6，统一 Workflow 领域层级、REST/MCP 示例和指标定义。
- 页面文件改为 `Workflows.tsx` 与 `WorkflowEditor.tsx`，代码符号同步调整。
- 导航、标题、按钮、统计、模板和安装记录等界面文案统一为中文“工作流”。
- BACKLOG 新增国际化备忘，不改变当前计划。

### 验收标准核对

- [x] 标准 1 —— 浏览器和残留检查确认用户可见文案无 Pipeline/Workflow 英文字样。
- [x] 标准 2 —— 页面文件、代码符号和中文导航一致。
- [x] 标准 3 —— BACKLOG 已记录国际化，当前生产范围未变。
- [x] 标准 4 —— build 通过（32 modules），lint 无错误，10/10 测试通过，链接和 diff 检查通过。
- [x] 标准 5 —— 在指定任务分支提交。

### 偏离任务说明之处

无。

### 发现的问题 / 需要设计方决定的事

生产实现时需同步数据库字段、API 路径、MCP 工具和术语表，不能只替换前端文案。
