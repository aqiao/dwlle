# T0001：Alpha OIDC 认证、集成与 Keycloak EKS 部署

状态：已完成
日期：2026-11-08

## 目标

依据 Alpha 开发计划和 ADR-0016，交付 Keycloak 26.8.1 私网部署、Authorization Code + PKCE、API JWKS 校验、应用内 Admin/Developer/Viewer 权限与审计，并在真实 AWS 环境验证认证主链路。

## 范围

- 在现有私有 EKS 中部署 Keycloak 26.8.1，使用独立 RDS PostgreSQL `keycloak` schema 和私网 ClusterIP Service。
- Keycloak 镜像进入 `versions.json`、离线制品和 ECR 不可变 digest 部署链路，运行时不从公网下载。
- 通过 CDK 在 Secrets Manager 生成 Keycloak 管理员和 Alpha 测试用户凭据，并授予 bastion 最小只读权限。
- 幂等创建 `dwlle` Realm、`dwlle-web` Public Client、`dwlle-api` Client Scope 和 Alpha 测试用户。
- Client 强制 S256 PKCE，默认绑定 `Included Custom Audience=dwlle-api`，关闭 Full Scope Allowed、Direct Access Grants 和自助注册。
- dwlle-web 实现登录、OIDC 回调、state/nonce 校验、登出和 Bearer API 请求。
- dwlle-api 实现 JWKS 签名、issuer、audience、iat/exp 校验，以及本地 Tenant/Workspace RoleBinding、成员管理、关键写操作和越权审计。
- 通过 SSM 私网转发执行真实 Authorization Code + PKCE 和 FastAPI/RBAC 集成验证。
- 补充部署、配置、验证文档及自动化测试。

## 非目标

- 不配置生产 TLS、公网入口、固定外部 hostname、生产级 HA 或多区域部署。
- 不对 dev-cn 做真实部署；仅执行两分区 synth。
- 不接入 OpenMetadata、DolphinScheduler 原生管理界面的 SSO。
- 不将 Keycloak/Token 中的角色作为 dwlle 应用权限来源。
- 除 OIDC 和 Workspace 选择器外的既有原型页面仍可使用模拟数据，不扩大本任务业务范围。

## 验收标准

1. Keycloak 26.8.1 在 dev-global 私有 EKS 中以 RDS schema 持久化，Pod 健康，Service 不暴露公网。
2. Realm、Client、PKCE、audience 和测试用户可重复配置，凭据不出现在仓库或部署日志中。
3. 前端具备 OIDC 登录、回调和登出流程，API 请求不再使用 `X-Tenant-Id`。
4. API 正确验证真实 Keycloak JWT，三种应用角色、成员管理和跨租户拒绝有核心路径测试。
5. 真实登录表单 + Authorization Code + PKCE 能获得 `aud=dwlle-api` Token，并调用 `/auth/me` 和 Workspace API。
6. 部署可重复执行，现有 Trino/SeaTunnel 数据平面验证不回退。
7. Python、前端、CDK 检查及两分区 synth 通过，npm 安全审计无已知漏洞。
8. 在 `docs/tasks/` 保留任务范围和实际交付结果。

## T0001 交付说明

### 完成内容

- 新增 Keycloak Kubernetes Deployment/Service、离线 ARM64 镜像记录和 ECR digest 注入。Service 类型为 ClusterIP，未创建公网 LoadBalancer 或 Ingress。
- CDK 新增 Keycloak 管理员和 Alpha 用户 Secret、输出及 bastion 只读授权；另补充命名空间内 `pods/portforward` 权限，未引入 `system:masters`。
- 部署时通过 Amazon Linux 官方仓库安装 PostgreSQL 客户端，幂等执行 `CREATE SCHEMA IF NOT EXISTS keycloak`。
- Realm 初始化使用带引号的扁平 OIDC 属性键，适配 Keycloak 26.8.1 的 `kcadm` 行为；audience 使用专用 Client Scope 和 custom audience，避免依赖不存在的资源服务器 Client。
- Keycloak 单副本使用 `Recreate`，避免滚动更新额外占用资源。SeaTunnel 演示 Job 的调度请求降为 512Mi，资源上限保持 2Gi。
- 后端新增用户、RoleBinding、AuditEvent 模型和 `/auth/me`、Workspace 成员管理接口；OIDC 默认 JWKS 路径修正为 `/protocol/openid-connect/certs`。
- 前端新增 PKCE 登录页、回调处理、会话清理、真实用户与角色展示。
- 新增 `deploy/aws/verify-keycloak.sh`，通过真实 Keycloak 登录表单执行 PKCE、nonce、JWKS、FastAPI 和 RBAC 验证，退出时自动清理转发及临时文件。
- `Dwlle-dev-global-DataPlane` 为 `UPDATE_COMPLETE`；最终 Keycloak Pod 为 `1/1 Running`。

### 验收标准核对

- [x] 标准 1 —— Keycloak 使用 ECR digest `sha256:e1c1331f4a3e826016bdee2193335ed21685f0fd075c70bcb4d8fa7eeba9e1b4`，RDS `CREATE SCHEMA` 成功，最终 Pod `1/1 Running`，Service 为 ClusterIP。
- [x] 标准 2 —— Secrets Manager 生成两个 Keycloak Secret；最终 SSM `b67b26a1-7b92-4ecd-9d1f-f1af72715ccf` 为 `Success`，重复执行显示 schema 已存在且 Realm/Client 配置成功。Direct Access Grants 和 Full Scope Allowed 均关闭。
- [x] 标准 3 —— `cd web && npm run build && npm run lint && npm test`：17 项测试通过，覆盖 PKCE、state/nonce、过期会话、登出和 Bearer 请求头。
- [x] 标准 4 —— `cd services/api && uv run ruff check . && uv run mypy app && uv run pytest`：22 项测试通过，覆盖率 92%，覆盖签名、issuer、audience、过期 Token、三种角色、成员管理、跨租户拒绝和审计。
- [x] 标准 5 —— `AWS_PROFILE=global_admin deploy/aws/verify-keycloak.sh dev-global`：真实登录表单和 PKCE 返回 `iss=http://127.0.0.1:18080/realms/dwlle`、`aud=dwlle-api`、`azp=dwlle-web`；`RS256` 与 Realm JWKS kid 匹配；最终输出 `Real Keycloak JWT verification passed: /auth/me=200 workspace=201 invalid-token=401`。
- [x] 标准 6 —— 最终 SSM `b67b26a1-7b92-4ecd-9d1f-f1af72715ccf` 为 `Success`；Keycloak rollout、Realm 初始化、Polaris setup 和 SeaTunnel Job 均完成，Trino 返回 `"1","page_view","101"`。
- [x] 标准 7 —— `infra` build/lint/7 项测试及 Global、中国区 synth 通过；`web` 的 `npm --userconfig=/dev/null audit` 返回 `found 0 vulnerabilities`；Shell 语法、离线制品 SHA256 和 `git diff --check` 通过。
- [x] 标准 8 —— 本文件记录任务范围、非目标、验证命令、实际结果和未实施边界。

### 偏离任务说明之处

- 用户最初给出的分支名包含空格，Git 不接受，因此使用符合仓库规范的 `feature/T0001-oidc-auth-integration`。
- Audience 使用 `Included Custom Audience=dwlle-api`，而不是 `Included Client Audience`。后者是对 Keycloak Client 的查找，当前没有独立 `dwlle-api` Client，使用 custom audience 符合实际资源服务器语义。
- 新增 Keycloak 后节点资源不足，SeaTunnel 演示 Job 的调度请求从 1Gi 降为 512Mi；未扩大节点规模，未改变 Job 资源上限。
- 本机 npm 配置中的失效代理导致 `npx cdk deploy` 和首次 `npm audit` 失败。CDK 使用本地二进制直接执行，npm audit 使用临时 `--userconfig=/dev/null`，未修改用户全局配置。

### 发现的问题 / 需要设计方决定的事

- 当前使用 Keycloak 本地 `alpha-admin` 用户验证受邀用户主链路。尚未提供企业上游 OIDC Provider 的 issuer、client、凭据和用户映射，因此不宣称上游企业 IdP 联调完成。
- 当前私网 HTTP、动态 hostname 和本地 Redirect URI 仅用于内部 Alpha。正式入口需要另行确定 TLS、固定 hostname、私网 DNS/Ingress 和实际 Web Origin。
- 真实 Keycloak 登录表单、PKCE 和 API 链路已验证；Vite 页面中的 PKCE 行为由前端单元测试覆盖，本次未执行真实浏览器驱动的端到端测试。
- Keycloak 与 Polaris 均为单副本，生产 HA、升级、恢复演练和定期 Secret 轮换需要后续任务。
