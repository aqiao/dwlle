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

- 工作台：运行指标、资源使用、最近运行和 AI 运维洞察。
- Pipeline：列表筛选 → 选择 Pipeline → DAG 编辑 → 发布。
- 运行中心：失败实例 → 节点状态与日志 → AI 只读诊断。
- SQL 工作台：库表树、SQL 编辑、模拟查询结果和执行历史。
- 数据资产：Schema、质量评分和表级血缘。
- 数据源：连接健康状态与添加连接表单。

## 检查

```bash
npm run build
npm run lint
npm test
npm audit
```
