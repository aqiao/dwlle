# T036：CDK 双分区基础设施与制品骨架

状态：已完成
日期：2026-11-04

## 目标

建立 TypeScript CDK 工程、双分区配置和安全约束测试，为 AWS Global/中国区部署提供可重复基础设施骨架。

## 范围

- 创建 `infra/` strict TypeScript、ESLint、Prettier 和 Jest 工程。
- 配置加载与校验，不使用需要账号查询的 lookup。
- 创建 VPC、私有子网、EKS、RDS PostgreSQL、S3 和 ECR。
- 实例类型、AMI 架构、区域和可用区均来自配置，支持 dev-global/dev-cn。
- 禁止硬编码分区 ARN/域名、公网 IP、开放安全组和公共存储桶。
- 数据资源默认 RETAIN，支持开发环境显式 destroy。
- 建立 `versions.json` 和制品校验脚本，所有第三方制品必须包含版本、URL 和 sha256。

## 验收标准

1. `npm ci`、build、lint、test 通过，Global/CN 均可 `cdk synth`。
2. 模板不包含字面量 `arn:aws:`，无公共入站和公共存储桶，RDS 加密且私网。
3. `versions.json` 与制品校验脚本可验证 sha256，配置错误会失败。
4. 在 `task/T036-infrastructure-foundation` 分支提交，提交信息以 `T036:` 开头。

## 交付说明

### 完成内容

- 新建 strict TypeScript CDK 工程、配置加载校验、ESLint/Prettier 和 Jest。
- 创建 VPC、私有 EKS、RDS PostgreSQL、S3 和 ECR，区域与规格全部来自配置。
- 使用官方 Kubernetes 1.36 layer，数据资源加密、私网和 RETAIN。
- 建立 `versions.json` 与制品校验脚本，Trino CLI 官方制品 sha256 验证通过。

### 验收标准核对

- [x] 标准 1 —— `npm ci`、build、lint、test 通过，Global/CN 均 synth 成功。
- [x] 标准 2 —— 两个分区模板均无字面量 `arn:aws:`，无公共入站；S3 阻止公共访问，RDS 加密且私网。
- [x] 标准 3 —— `scripts/stage-artifacts` 校验 Trino CLI sha256 成功，错误哈希会失败。
- [x] 标准 4 —— 在指定任务分支提交。

### 偏离任务说明之处

未部署真实 AWS 资源；本任务完成的是可合成基础设施骨架。

### 发现的问题 / 需要设计方决定的事

- `npm audit` 尚有 6 个低危和 3 个中危告警，来自 Jest 和 CDK 捆绑依赖；未采用会破坏兼容性的强制降级，后续随上游版本修复。
- DS/SeaTunnel 的制品及运行验证仍需在数据平面任务中完成。
