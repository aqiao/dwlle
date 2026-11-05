# dwlle 基础设施

TypeScript CDK 基础设施骨架，支持 `dev-global` 和 `dev-cn` 配置。包含 VPC、私有 EKS、RDS PostgreSQL、S3 和 ECR，所有实例规格与区域均来自配置。

## 验证

```bash
cd infra
npm ci
npm run build
npm run lint
npm test
npx cdk synth -c env=dev-global
npx cdk synth -c env=dev-cn
```

`npm test` 还检查模板不包含字面量 `arn:aws:`、公共存储桶或开放安全组。部署到真实账号前需补充账号、AMI 架构和制品审核。

## 配置

- `config/dev-global.json`：AWS Global 开发环境。
- `config/dev-cn.json`：AWS 中国区开发环境。
- `lib/config/load.ts`：读取并校验配置，不使用账号 lookup。
- `lib/stacks/base-stack.ts`：创建网络与数据资源。

`versions.json` 与 `scripts/stage-artifacts` 用于第三方制品版本和 sha256 校验。当前 Trino CLI 制品已验证，DS/SeaTunnel 制品在数据平面任务中补充。
