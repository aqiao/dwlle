# AWS 数据平面部署

本目录用于真实 AWS 环境的最小数据平面部署。流程为：本地校验制品并推送 ECR → 清单上传 artifacts bucket → SSM 在私网管理节点执行部署。

## 前置条件

- 已部署 `Dwlle-<envName>-DataPlane`，输出包含 Cluster、ECR、S3、bastion 和 RDS Secret。
- 本机有对应账号的 AWS Profile、Docker 和 Docker Compose。
- bastion 的 SSM Agent 在线，私有 EKS 节点与 RDS 已就绪。

## 部署与验证

```bash
AWS_PROFILE=global_admin deploy/aws/deploy-data-plane.sh dev-global
```

脚本会部署 DolphinScheduler、Polaris、Trino，执行 SeaTunnel 批任务，并检查 Trino 返回 `"1","page_view","101"`。最后输出 SSM 命令 ID、组件日志和查询结果。重复执行会重建一次性 Job，SeaTunnel 使用 `DROP_DATA`，不会追加重复示例记录。

部署清单在 `manifests/`，本地入口为 `deploy-data-plane.sh`，私网执行入口为 `remote-data-plane.sh`。数据库和 Polaris 凭据只在执行时读取或生成，不写入仓库、清单或日志。

EKS Pod Identity 为 Polaris 提供服务身份，独立的 `IcebergStorageRole` 仅持有数据桶读写权限并信任该服务身份。Polaris 通过 STS `AssumeRole` 向 SeaTunnel 和 Trino 下发短期 S3 凭据，组件不使用静态 AWS 密钥。

当前 Polaris 使用内存元数据，仅用于第一周技术验证；生产持久化、HA、OIDC 和客户入口不在本任务范围。

## 清理

本任务不提供自动清理。RDS、S3 和 ECR 按环境配置默认 `RETAIN`，不得为了重试部署直接删除。CloudFormation stack 更新失败时应先检查资源状态和 SSM 日志。
