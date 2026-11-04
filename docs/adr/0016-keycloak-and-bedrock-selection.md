# 0016 Keycloak OIDC 与 Amazon Bedrock 首个模型提供方

状态：已接受
日期：2026-11-04

## 背景

第一周需要冻结 OIDC Broker 和首个模型提供方。现有架构只保留了 Keycloak 或等价实现，以及可替换的 ModelProvider，尚不足以形成可部署契约。首版必须同时保持 OIDC/模型可替换性和只读 AI 边界，不能把 AWS 专有运行时变成产品协议。

## 决策

1. **OIDC Broker 固定为 Keycloak `26.8.1`。**
   - 部署在 EKS，使用独立 PostgreSQL schema，配置与备份纳入现有 RDS 运维。
   - dwlle-web 使用 Authorization Code + PKCE；dwlle-api 通过 JWKS 校验 issuer、audience、签名和过期时间。
   - OIDC 只负责身份，Tenant/Workspace 成员关系和 Admin/Developer/Viewer 角色仍由 dwlle 管理。
   - 首版仅一个上游 OIDC Provider，不开放自助注册；DS 管理账号与 dwlle 用户身份分离。

2. **首个 ModelProvider 为 Amazon Bedrock。**
   - Global 初始模型固定为 `anthropic.claude-sonnet-5-5`，部署时通过配置注入，不在代码中拼接 ARN。
   - 通过 EKS workload identity 最小化授予目标模型的调用权限，不使用长期访问密钥，不强制引入 AgentCore。
   - 首版只实现只读诊断，模型只能通过 dwlle-api 的受控工具获取脱敏上下文，不直接访问数据引擎或执行修复。
   - 模型升级需单独评估并更新版本记录，不跟随浮动别名自动变更。

3. **中国区使用独立模型适配任务。**
   - 月末只实测 Global 的 Bedrock 提供方，不宣称该模型在中国区可用。
   - 后续通过 `openai_compatible` 实现接入中国区批准的模型端点，凭据由 Secrets Manager 注入，不改变 dwlle 工具与诊断协议。

4. **选型与实施分开验收。**
   - 本 ADR 只冻结部署契约，不代表 Keycloak 登录、JWT 验证或 AI 诊断已经实现。
   - Keycloak 制品纳入 `versions.json` 和离线预置流程，部署不得临时从公网下载。

## 理由

- Keycloak 同时提供 OIDC/SAML 生态和企业 SSO 集成能力，且可自托管，不绑定云身份服务。
- Bedrock 可通过 IAM 提供模型调用，减少首版密钥管理和外部模型账号依赖；模型 ID 经 Global 账号查询为 ACTIVE。
- 显式区分 Global 与中国区模型实现，避免为了分区兼容而虚构统一模型能力。

## 后果（含代价与风险）

- 需要运维 Keycloak、其数据库 schema、升级和备份，并处理上游 IdP 与用户角色的映射。
- Bedrock 会产生按量模型费用，需要访问开通、配额和成本检查；ACTIVE 不代表所有账号无需额外配置即可调用。
- 第二模型提供方会增加实现与测试成本，但在 P0 完成前不实施。
