# dwlle Web 界面原型

11 月 Alpha 的高保真前端原型。OIDC 登录和 Workspace 选择器已接入 FastAPI，其他页面仍使用模拟数据，不连接 AWS、DolphinScheduler、Trino 或模型服务。

## 启动

需要 Node.js 22 LTS 或更高版本。

```bash
cd web
npm ci
npm run dev
```

打开终端输出的本地地址，默认是 `http://localhost:5173`。

## OIDC 配置

前端直接通过标准 OIDC 与 Keycloak `26.8.1` 交互，不依赖 Keycloak JS SDK。使用 Authorization Code + PKCE，回调校验 `state` 和 ID Token `nonce`，API 请求统一携带 Bearer Access Token。

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_OIDC_ISSUER` | `http://127.0.0.1:8080/realms/dwlle` | Keycloak Realm issuer |
| `VITE_OIDC_CLIENT_ID` | `dwlle-web` | Public Client ID |
| `VITE_OIDC_REDIRECT_URI` | 当前站点 origin | 必须加入 Keycloak Valid Redirect URIs |
| `VITE_OIDC_SCOPE` | `openid profile email` | OIDC scope |

Keycloak 的 `dwlle-web` Client 必须启用 PKCE（S256）、标准授权码流程，并配置当前站点的 Redirect URI 和 Web Origin。API 还必须配置 `DWLLE_OIDC_AUDIENCE=dwlle-api`，并在 Keycloak 中通过 Audience Mapper 将该 audience 加入 Access Token。

未认证时只显示登录页。退出登录会清除会话 Token，并在身份服务支持时调用 `end_session_endpoint`。Token 仅保存在当前标签页的 `sessionStorage`，过期或 API 返回 401 后需要重新登录。侧栏显示后端 `/auth/me` 返回的真实用户和本地应用角色。

## 原型路径

- 日常工作 / 工作台：运行指标、资源使用、最近运行和智能洞察。
- 日常工作 / 业务场景：只显示企业自有或已安装场景及其依赖、契约和 SLA。
- 日常工作 / 工作流：只显示企业实例，支持筛选 → DAG 编辑 → 发布。
- 方案市场 / 解决方案：官方与社区模板 → 兼容性检查 → 环境绑定 → 安装。
- 方案市场 / 场景模板、工作流模板：只读发现、评估和安装共享模板。
- 方案市场 / 已安装与更新：查看模板来源、本地实例版本和可升级内容。
- 运行中心：失败实例 → 节点状态与日志 → AI 只读诊断。
- SQL 工作台：库表树、SQL 编辑、模拟查询结果和执行历史。
- 数据资产：Schema、质量评分和表级血缘。
- 数据源：连接健康状态与添加连接表单。
- 工作空间设置（右上角）：公共 REST、FastMCP、共享应用服务、工具白名单和 Agent 安全边界。
- 个人设置（左下角）：真实用户信息、界面偏好和退出登录。

## 检查

```bash
npm run build
npm run lint
npm test
npm audit
```

## 企业品牌

品牌区不固定显示 dwlle 对味。示例企业名称与标识位于 `src/config/branding.ts`，可按实际企业修改；生产实现再由租户主题配置提供。

## 前后端联调

先启动 `services/api` 中的 FastAPI，再启动 Vite。开发服务器将 `/api` 代理到 `http://127.0.0.1:8000`。

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://127.0.0.1:5173/api/v1/workspaces
```

Workspace 选择器使用真实 API 数据；后端不可用时显示“后端不可用，显示演示数据”。该降级只用于现有原型页面，不能代替受保护 API 的权限校验。
