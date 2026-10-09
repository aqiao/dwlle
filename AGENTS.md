# AGENTS.md：编码 agent 必读

本文件面向 Kimi Code 等编码 agent。动手前必须先读：
1. `docs/ARCHITECTURE.md`
2. `docs/adr/` 下所有状态为"已接受"的 ADR
3. 当前要执行的任务说明 `docs/tasks/Txxx-*.md`

## 1. 工作方式

- **只做任务说明里写的范围。** 发现任务说明有缺陷、遗漏或与 ADR 冲突时，停下来，在交付说明里写出问题，不要自作主张。
- **不得推翻 ADR。** 认为某条决策有问题时，在交付说明里提出，由设计方新建 ADR。
- 一个任务对应一个分支：`task/Txxx-简短描述`。提交要小，提交信息用英文，格式为 `Txxx: <动词开头的描述>`。
- 完成后逐条核对任务说明里的**验收标准**，并在交付说明中列出每一条的验证命令及输出摘要。未能验证的项要如实写明。

## 2. 仓库结构

```
dwller/
├── AGENTS.md
├── versions.json              # 所有第三方组件的版本与 sha256（ADR-0006）
├── infra/                     # CDK 应用（TypeScript）
│   ├── bin/dwller.ts
│   ├── config/<env>.json      # 环境配置，如 dev-global.json、dev-cn.json
│   ├── lib/config/            # 配置类型、加载与校验
│   ├── lib/stacks/            # 每个 Stack 一个文件
│   ├── lib/constructs/        # 可复用的 Construct
│   ├── assets/                # 随 CDK Asset 上传的脚本、配置模板
│   └── test/
├── scripts/                   # 运维/准备脚本，如 stage-artifacts
├── services/api/              # FastAPI 后端（阶段 2）
├── services/agent/            # Agent（阶段 3）
├── web/                       # 前端（阶段 2）
└── docs/
```

## 3. 硬性规则

### 3.1 分区兼容（ADR-0001）
- 禁止在代码中出现字面量 `arn:aws:`。ARN 一律用 `Stack.of(this).formatArn()`、`Aws.PARTITION`，或 CDK L2 提供的 `xxxArn` 属性。
- 禁止硬编码 `amazonaws.com`。需要拼接域名时使用 `Aws.URL_SUFFIX`；在 shell 脚本中，通过 IMDS 获取域名后缀或由 CDK 注入。
- 不得使用任何需要在 synth 时访问 AWS 账号的 lookup，例如 `Vpc.fromLookup`。AZ 等信息一律从配置文件读取。
- 实例类型、AMI 架构必须来自配置，不得写死。

### 3.2 不从公网下载（ADR-0006）
- user data 和安装脚本中，禁止使用 `curl`、`wget` 访问公网地址，也禁止使用 `pip install` 或 `docker pull` 拉取公网源。
- 允许的来源：
  - artifacts bucket
  - CDK Asset
  - ECR
  - Amazon Linux 官方 dnf 仓库
- 新增第三方组件时，必须同步更新 `versions.json`。

### 3.3 安全
- IAM 遵循最小权限。不得使用 `"Action": "*"` 或 `"Resource": "*"`；确实无法收窄时（部分服务不支持资源级权限），必须加注释说明原因。
- 禁止在代码、配置文件或 user data 中出现明文密码或密钥。一律使用 Secrets Manager：由 CDK 生成，实例运行时读取。
- 所有 EC2 不分配公网 IP，不开放 22 端口，管理一律通过 SSM。
- 安全组只允许必要的端口和来源安全组，禁止 `0.0.0.0/0` 入站。
- S3：阻止所有公共访问，强制 SSL，开启服务端加密。

### 3.4 数据安全
- 存放客户数据的资源（StarRocks 数据卷、backup bucket、RDS）必须设置 `RemovalPolicy.RETAIN`。只有当配置中 `removalPolicy` 为 `destroy` 时（仅限开发环境），才允许删除。

### 3.5 脚本
- Shell 脚本以 `set -euo pipefail` 开头，必须**幂等**（重复执行结果一致）。
- 关键步骤输出日志，并以 `[dwller]` 为前缀，方便在 CloudWatch 中检索。

## 4. 代码风格

- TypeScript：开启 `strict`，使用 ESLint + Prettier。导出的 Construct props 要写 TSDoc 注释。
- Python：使用 ruff 和 mypy（strict），所有代码带类型注解。
- 代码注释用英文，文档用中文。
- 命名：
  - 资源 ID 用 PascalCase
  - Stack 命名为 `Dwller-<envName>-<Name>`，例如 `Dwller-dev-cn-Network`
  - 所有资源打上 `Project=dwller`、`Env=<envName>` 标签

## 5. 测试与验收（每个任务都必须通过）

在 `infra/` 目录下：
```
npm ci
npm run build
npm run lint
npm test
npx cdk synth -c env=dev-global
npx cdk synth -c env=dev-cn
```
- 两个分区都必须能 synth 成功。
- 测试中必须包含一项检查：遍历生成的模板，确认不存在字面量 `arn:aws:`。

## 6. 交付说明模板

```
## Txxx 交付说明
### 完成内容
### 验收标准核对
- [x] 标准 1 —— 验证命令 / 结果摘要
- [ ] 标准 2 —— 未完成原因
### 偏离任务说明之处（如有）
### 发现的问题 / 需要设计方决定的事
```
