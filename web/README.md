# dwlle Web 界面原型

11 月 Alpha 的高保真前端原型。全部数据均为模拟数据，不连接后端、AWS、DolphinScheduler、Trino 或模型服务。

## 启动

需要 Node.js 22 LTS 或更高版本。

```bash
cd web
npm ci
npm run dev
```

打开终端输出的本地地址，默认是 `http://localhost:5173`。

## 原型路径

- 我的工作空间 / 工作台：运行指标、资源使用、最近运行和 AI 运维洞察。
- 我的工作空间 / 业务场景：只显示企业自有或已安装场景及其依赖、契约和 SLA。
- 我的工作空间 / Pipeline：只显示企业实例，支持筛选 → DAG 编辑 → 发布。
- 方案市场 / 解决方案：官方与社区模板 → 兼容性检查 → 环境绑定 → 安装。
- 方案市场 / 场景模板、Pipeline 模板：只读发现、评估和安装共享模板。
- 方案市场 / 已安装与更新：查看模板来源、本地实例版本和可升级内容。
- 运行中心：失败实例 → 节点状态与日志 → AI 只读诊断。
- SQL 工作台：库表树、SQL 编辑、模拟查询结果和执行历史。
- 数据资产：Schema、质量评分和表级血缘。
- 数据源：连接健康状态与添加连接表单。
- API 与 MCP：公共 REST、FastMCP、共享应用服务、工具白名单和 Agent 安全边界。

## 检查

```bash
npm run build
npm run lint
npm test
npm audit
```

## 企业品牌

品牌区不固定显示 dwlle 对味。示例企业名称与标识位于 `src/config/branding.ts`，可按实际企业修改；生产实现再由租户主题配置提供。
