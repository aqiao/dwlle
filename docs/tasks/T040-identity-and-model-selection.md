# T040：OIDC 与首个模型提供方选型冻结

状态：已完成
日期：2026-11-04

## 目标

冻结第一周剩余身份与模型选型，形成明确、可部署和可验证的决策记录，不提前宣称 OIDC 或 AI 功能已实现。

## 范围

- OIDC Broker 选择 Keycloak `26.8.1`，记录制品版本和 SHA256。
- 首个 ModelProvider 选择 Amazon Bedrock，Global 初始模型使用账号中状态为 ACTIVE 的 `anthropic.claude-sonnet-5-5`。
- 通过新 ADR 记录 Keycloak 部署与 JWT 验证边界、Bedrock IAM 权限、只读 AI 和中国区后续适配方式。
- 更新架构文档中的身份和模型选型。

## 非目标

- 不部署 Keycloak，不实现登录、JWT 验证或 RBAC。
- 不调用模型收费接口，不实现 AI 诊断或第二种模型提供方。

## 验收标准

1. 新 ADR 明确 Keycloak 与 Bedrock 版本、使用边界及未实施范围。
2. Keycloak 制品进入 `versions.json` 并通过 SHA256 校验。
3. 架构文档不再有 OIDC Broker 或首个模型提供方的待选型表述。
4. 在 `task/T040-identity-and-model-selection` 分支以 `T040:` 开头提交。

## T040 交付说明

### 完成内容

- 新增 ADR-0016，固定 Keycloak `26.8.1` 和 Global 初始模型 `anthropic.claude-sonnet-5-5`。
- 明确 OIDC/JWT、应用 RBAC、Bedrock IAM、只读 AI 和中国区后续模型适配边界。
- 更新架构组件表，同步当前 Keycloak、DolphinScheduler、SeaTunnel、Trino、Polaris 与模型版本。
- Keycloak 官方 Maven 制品已进入 `versions.json`。

### 验收标准核对

- [x] 标准 1 —— ADR-0016 明确版本、部署契约和未实施范围。
- [x] 标准 2 —— `scripts/stage-artifacts` 输出 `Verified keycloak 26.8.1`，SHA256 为 `4e2740b181faa2ea623a1c2ecf00855935311e546046e2f857615a47ed24cbe8`。
- [x] 标准 3 —— 架构身份行固定 Keycloak 26.8.1，AI 行固定 Bedrock 与 Sonnet 5.5；无待选型表述。
- [x] 标准 4 —— 在指定分支以 `T040: freeze identity and model selection` 提交。

### 偏离任务说明之处

GitHub 下载连接不稳定，改用文件内容相同的 Keycloak 官方 Maven Central 制品，版本和文件大小一致。

### 发现的问题 / 需要设计方决定的事

无。Bedrock ACTIVE 状态只证明模型可用性，实际调用权限、配额和费用仍需后续 AI 任务验证；本任务未调用收费接口。
