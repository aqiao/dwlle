# T041：AWS 基础设施与数据平面部署验证

状态：已完成
日期：2026-11-04

## 目标

在真实 dev-global AWS 账号中部署并验证最小基础设施及 DS、SeaTunnel、Trino、Polaris 数据平面，完成第一周剩余的云端验证。

## 范围

- 修复 RDS PostgreSQL 区域版本不可用问题，版本通过环境配置管理。
- 部署 VPC、私有 EKS、RDS、S3、ECR 和无公网 IP 的 SSM 管理节点。
- 通过 artifacts bucket 和 ECR 提供部署制品，节点运行时不得从公网下载。
- 部署 DolphinScheduler、Polaris、Trino，执行 SeaTunnel 批任务并查询 Iceberg 表。
- 配置 EKS Pod Identity、独立 Iceberg 目录访问角色及 Polaris STS 短期凭据下发。
- 通过 SSM 在私网管理节点执行部署、日志和健康检查，记录实际结果。

## 非目标

- 不部署 Keycloak 或实现 OIDC，不实现生产级 Polaris 持久化、HA、自动扩缩容。
- 不实测 dev-cn，不删除 RETAIN 数据资源，不修改历史 ADR。

## 验收标准

1. dev-global Base stack 部署成功，RDS 使用区域支持版本，EKS/ECR/S3 可通过 AWS API 查询。
2. DS、Polaris、Trino 在私有 EKS 中健康，运行时不访问公网制品源。
3. SeaTunnel 批任务写入 Iceberg 后 Trino 可查询预期记录，组件日志可读取。
4. CDK build/lint/test 与两分区 synth 通过，在 `task/T041-aws-data-plane-deployment` 分支以 `T041:` 开头提交。

## T041 交付说明

### 完成内容

- `Dwlle-dev-global-DataPlane` 已达到 `UPDATE_COMPLETE`；EKS 1.36 为 `ACTIVE`，仅开启私网端点；RDS PostgreSQL 16.15 为 `available`，bastion 无公网 IP 并通过 SSM 管理。
- 固定版本镜像已推送 ECR，部署脚本和 kubectl 已上传 artifacts bucket。私网执行脚本仅从 S3、ECR 和 Secrets Manager 获取部署输入。
- DS、Polaris、Trino 已部署到 EKS。EKS Pod Identity 提供服务身份，独立 `IcebergStorageRole` 持有数据桶权限；Polaris 通过 STS `AssumeRole`/`TagSession` 向 SeaTunnel 和 Trino 下发短期 S3 凭据，无静态 AWS 密钥。
- SeaTunnel 已从 RDS 查询示例记录并写入 Iceberg，Trino 查询返回 `"1","page_view","101"`。完整部署脚本重复执行成功，最终 `count(*)` 为 `1`。
- 临时 `ds-debug` Pod 已删除；最终 DS、Polaris、Trino 均为 `1/1 Running`，`polaris-setup` 和 `seatunnel-jdbc-iceberg` 均为 `Complete`。

### 验收标准核对

- [x] 标准 1 —— `AWS_PROFILE=global_admin npx cdk deploy -c env=dev-global --require-approval never`：stack 为 `UPDATE_COMPLETE`；AWS API 确认 RDS 16.15、私有 EKS、ECR 和 S3 均存在。
- [x] 标准 2 —— SSM `c59d3e01-9030-4a15-9ec6-e15108eb27ae`：三个常驻组件均 `1/1 Running`；部署日志确认制品来自 artifacts bucket 和 ECR。
- [x] 标准 3 —— SSM `25ec8b85-6d84-40dd-987e-de2fb992b9e3`：真实链路成功并返回预期记录；完整入口 `AWS_PROFILE=global_admin deploy/aws/deploy-data-plane.sh dev-global` 再次执行，SSM `b11dc5d8-8366-4883-89ed-cf501723fe53` 为 `Success`；最终 SSM `c59d3e01-9030-4a15-9ec6-e15108eb27ae` 返回 `count(*) = 1`，两个 Job 均 `Complete`，组件日志可读取。
- [x] 标准 4 —— `npm run build`、`npm run lint`、`npm test` 通过（2 个 suite、6 项测试）；`npx cdk synth -c env=dev-global` 和 `npx cdk synth -c env=dev-cn` 均成功。`scripts/stage-artifacts --verify-only`、`scripts/stage-images --verify-only`、shell/YAML 语法检查、`git diff --check` 通过；当前分支为 `task/T041-aws-data-plane-deployment`。

### Kiro IDE 独立审核与修复

- Kiro 提出的 4 项发现均经代码复核确认：部署入口公网镜像回退、bastion 的 `system:masters`、配置/Secret/同标签镜像不触发更新，以及对应测试缺口。
- 公网下载现在只存在于显式制品准备步骤；部署入口只校验并加载本地制品。镜像使用 ECR digest，ConfigMap/Secret 摘要写入 Pod template。
- CDK 预置 `dwlle` Namespace、Role 和 RoleBinding，bastion 仅属于 `dwlle-deployers`。实测 `kubectl auth can-i get secrets -n kube-system` 为 `no`，`kubectl auth can-i update deployments.apps -n dwlle` 为 `yes`。
- 新增回归测试覆盖离线入口、不可变镜像、更新摘要、一次性 Job 重建顺序和 RBAC。
- 修复后的完整部署 SSM `c56bdb8b-9bb3-4f4e-ad64-d3cb2ed6b594` 为 `Success`，所有工作负载使用 ECR digest，配置和 Secret 摘要已写入 Pod template。
- 无变更第二次完整部署 SSM `6260a3a4-7a2c-4562-8145-f234304be438` 为 `Success`；最终 SSM `438a58a0-da0e-4954-8017-a173a67c3841` 确认 DS、Polaris、Trino 的 Pod UID 与部署前一致，`create pods` 和跨命名空间 Secret 访问均为 `no`，`count(*) = 1`，两个 Job 均为 `Complete`。

### 偏离任务说明之处

- 实际 stack 名为 `Dwlle-dev-global-DataPlane`，不是验收标准中的 `Dwlle-dev-global-Base`。这样可复用已导入的 RETAIN 制品资源，并避免与早期失败部署遗留资源混淆；基础设施范围不变。
- dev-cn 仅完成 synth，未进行真实部署，符合本任务非目标。

### 发现的问题 / 需要设计方决定的事

- 当前 Polaris 使用内存元数据，组件为单副本，仅适用于本周技术验证；生产持久化和 HA 仍需后续任务设计。
- 早期失败部署遗留的 VPC、RDS、S3、ECR 和旧日志组已由用户手动清理，本次修复未执行破坏性清理。
