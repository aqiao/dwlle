# T001 CDK 骨架、配置、网络与存储桶

分支：`task/T001-cdk-skeleton` · 依赖：无 · 预计：3~5 小时

## 目标
搭建 `infra/` CDK 应用的骨架。同一份代码要能对 `dev-global`（如 us-east-1）和 `dev-cn`（如 cn-northwest-1）两个环境 synth 出网络和 S3 存储桶。后续所有 Stack 都在这个骨架上扩展。

## 范围

### 1. 工程初始化
- 在 `infra/` 下创建 CDK v2 TypeScript 项目：Node.js 22，开启 `strict`，配置 ESLint + Prettier + jest。
- `package.json` 中提供以下 scripts：`build`、`lint`、`test`、`synth:global`、`synth:cn`。
- 在根目录创建 `.gitignore`，忽略 `node_modules`、`cdk.out`、`*.js`（`jest.config.js` 除外）、`*.d.ts`。

### 2. 配置（`infra/lib/config/`）
用 zod 定义并校验以下 schema。CDK 启动时通过 `-c env=<name>` 读取 `infra/config/<name>.json`；不传参数或文件不存在时，报错并退出。

```ts
interface DwllerConfig {
  envName: string;                 // 例如 "dev-cn"，只允许 [a-z0-9-]
  account: string;                 // 12 位数字
  region: string;
  availabilityZones: [string, string]; // 恰好 2 个，必须以 region 开头
  vpcCidr: string;                 // 默认 "10.80.0.0/16"
  natGateways: 0 | 1;              // 默认 1
  removalPolicy: "retain" | "destroy"; // 默认 "retain"
  tags?: Record<string, string>;
  starrocks: {                     // T003 使用；T001 只需完成 schema 校验
    instanceType: string;          // 例如 "r7g.2xlarge"
    cpuArch: "arm64" | "x86_64";   // 必须与 instanceType 匹配：Graviton 机型（第一段以 "g" 结尾，如 r7g、m7g、c7g）用 arm64
    dataVolumeGiB: number;         // >= 100
    dataVolumeIops?: number;       // gp3，默认 3000
    dataVolumeThroughput?: number; // gp3，单位 MiB/s，默认 125
  };
}
```

- 导出 helper `isChinaRegion(region)`，判断 region 是否以 `cn-` 开头。**只在需要做业务分支时使用**；ARN 和域名仍然一律使用 `Aws.PARTITION` 和 `Aws.URL_SUFFIX`。
- 提供两个示例配置：
  - `config/dev-global.json`：us-east-1，AZ 为 us-east-1a / us-east-1b
  - `config/dev-cn.json`：cn-northwest-1，AZ 为 cn-northwest-1a / cn-northwest-1b
  - 两者的 `account` 都用占位值 `"000000000000"`，并在 README 中说明如何替换。

### 3. `NetworkStack`（`Dwller-<env>-Network`）
- VPC：使用配置中的 CIDR 和 AZ（直接传 `availabilityZones`，不使用 `maxAzs`，避免 lookup）。
  - 子网：public /24 ×2，private-with-egress /22 ×2
  - NAT Gateway 数量取自 `natGateways`；为 0 时，私有子网改为 `PRIVATE_ISOLATED`
- 创建 S3 Gateway Endpoint，关联到所有私有子网的路由表。
- 安全组：
  - `AppSg`：App 节点使用，本任务不开放任何入站规则
  - `StarRocksSg`：只允许来自 `AppSg` 的 TCP 9030（MySQL 协议）、8030（FE HTTP）、8040（BE HTTP）入站
  - 两个安全组的出站都保持默认
- 以 public readonly 属性暴露：`vpc`、`appSg`、`starRocksSg`。

### 4. `StorageStack`（`Dwller-<env>-Storage`）
创建三个 bucket，**不指定 bucketName**，由 CDK 生成名称，避免全局重名：

| ID | 用途 | 版本控制 | 生命周期 |
|---|---|---|---|
| `ArtifactsBucket` | 安装包、镜像 tar | 开启 | 非当前版本 90 天后删除 |
| `BackupBucket` | StarRocks 逻辑备份 | 开启 | 非当前版本 30 天后删除 |
| `LandingBucket` | 用户上传的待导入文件 | 关闭 | 未完成的分段上传 7 天后清理 |

- 三个 bucket 都要求：`BlockPublicAccess.BLOCK_ALL`、`enforceSSL: true`、`BucketEncryption.S3_MANAGED`。
- `RemovalPolicy`：
  - `BackupBucket` 和 `LandingBucket` 遵循配置
  - `ArtifactsBucket` 固定使用 `RETAIN`
  - 只有配置为 `destroy` 时，才允许开启 `autoDeleteObjects`
- 把三个 bucket 的名称写入 SSM 参数：`/dwller/<envName>/bucket/{artifacts,backup,landing}`。

### 5. `bin/dwller.ts`
- 加载配置，按顺序创建 NetworkStack 和 StorageStack。
- `env` 使用配置中的 account 和 region。
- 用 `Tags.of(app)` 打上标签：`Project=dwller`、`Env=<envName>`，以及配置中的 `tags`。

### 6. 测试（`infra/test/`）
- `config.test.ts` 需覆盖以下场景：
  - 合法配置通过校验
  - AZ 数量不等于 2 时报错
  - AZ 与 region 不匹配时报错
  - `cpuArch` 与 `instanceType` 不匹配时报错
- `network.test.ts` 需断言：
  - 恰好 2 个 public 子网和 2 个私有子网
  - 存在 S3 Gateway Endpoint
  - `StarRocksSg` 的入站规则只引用 `AppSg`，且只开放 3 个端口
- `storage.test.ts` 需断言：
  - 3 个 bucket 都开启了 BlockPublicAccess 和加密
  - 3 个 bucket 都有强制 SSL 的 bucket policy
  - `BackupBucket` 在 retain 配置下 `DeletionPolicy` 为 `Retain`
- `partition.test.ts`：分别用 dev-global 和 dev-cn 配置 synth 所有 Stack，递归遍历模板 JSON，断言任何字符串值中都不出现 `arn:aws:`。

### 7. 文档
新增 `infra/README.md`，说明以下内容：
- 前置条件
- 如何新建环境配置
- synth 和 deploy 命令
- 首次在某个账号和区域部署前需要执行 `cdk bootstrap`。中国区的 bootstrap 命令写法与 Global 区相同，只是账号和区域不同。

## 不在范围内
EC2、RDS、IAM 角色（T003 及以后的任务会做），CI 流水线，VPC Flow Logs。

## 验收标准
1. 在 `infra/` 下，`npm ci && npm run build && npm run lint && npm test` 全部通过。
2. `npx cdk synth -c env=dev-global` 和 `npx cdk synth -c env=dev-cn` 都能成功，且不需要 AWS 凭证。可以在清空 `AWS_PROFILE` 和凭证环境变量后运行来验证。
3. 不传 `-c env`，或传入不存在的 env 时，进程以非 0 状态退出，并输出可读的错误信息。
4. 全仓库执行 `grep -rn "arn:aws:" infra/lib infra/bin` 无结果。
5. 满足 AGENTS.md §3 的所有硬性规则。
6. 在 PR 描述中附上交付说明（模板见 AGENTS.md §6）。

## 给评审的关注点
- 是否误用了 `maxAzs` 或任何 lookup
- 安全组规则是否过宽
- 生命周期规则和 RemovalPolicy 是否与上表一致
