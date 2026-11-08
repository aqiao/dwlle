# AWS 数据平面部署

本目录用于真实 AWS 环境的最小数据平面部署。流程为：本地校验制品并推送 ECR → 清单上传 artifacts bucket → SSM 在私网管理节点执行部署。

## 前置条件

- 已部署 `Dwlle-<envName>-DataPlane`，输出包含 Cluster、ECR、S3、bastion 和 RDS Secret。
- 本机有对应账号的 AWS Profile、Docker 和 Docker Compose。
- bastion 的 SSM Agent 在线，私有 EKS 节点与 RDS 已就绪。

## 制品准备与部署验证

首次准备或主动更新制品时，在可联网的开发机显式执行：

```bash
scripts/stage-artifacts
scripts/stage-images
```

这两个准备命令将第三方文件和镜像保存到 `artifacts/`，并按 `versions.json` 校验版本、上游 digest 和 SHA256。部署入口只执行 `--verify-only` 校验和本地 `docker load`，缺少制品会直接失败，不会从公网回退下载。

```bash
AWS_PROFILE=global_admin deploy/aws/deploy-data-plane.sh dev-global
```

脚本会部署 DolphinScheduler、Polaris、Trino 和 Keycloak，执行 SeaTunnel 批任务，并检查 Trino 返回 `"1","page_view","101"`。最后输出 SSM 命令 ID、组件日志和查询结果。重复执行会重建一次性 Job，SeaTunnel 使用 `DROP_DATA`，不会追加重复示例记录。

部署清单在 `manifests/`，本地入口为 `deploy-data-plane.sh`，私网执行入口为 `remote-data-plane.sh`。数据库和 Keycloak 凭据由 Secrets Manager 生成并注入，Polaris 凭据只在执行时生成；这些敏感值不写入仓库、清单或日志。Kubernetes 使用 ECR 不可变镜像 digest；ConfigMap 和 Secret 摘要写入 Pod template，内容变化会触发滚动更新。

## Keycloak

- 版本固定为 `26.8.1`，以单副本 Deployment 和私网 `ClusterIP` Service 运行，不创建公网 LoadBalancer 或 Ingress。
- 使用现有 RDS PostgreSQL 实例中的独立 `keycloak` schema，元数据由 RDS 备份覆盖。
- 自动创建 `dwlle` Realm、`dwlle-web` Public Client 和默认绑定的 `dwlle-api` Client Scope；Scope 使用 `Included Custom Audience=dwlle-api`，Client 强制 S256 PKCE、关闭 Full Scope Allowed，不开放自助注册。
- 当前 Redirect URI/Web Origin 仅包含本地 `127.0.0.1:5173` 和 `localhost:5173`，接入正式 dwlle-web 域名时必须改为实际地址。
- 为私有环境验收创建 `alpha-admin` 测试用户。用户和管理员密码由 Secrets Manager 生成，部署时同步到 `keycloak-alpha-user`、`keycloak-admin` Kubernetes Secret，不经过 SSM 输出。
- Client 仅开放标准 Authorization Code + PKCE，Direct Access Grants 保持关闭。实测脚本通过真实登录表单完成授权码交换；接入约定的一个上游 OIDC Provider 是后续环境配置项。
- 私网 HTTP 仅用于当前内部 Alpha。正式入口必须配置 TLS、固定 hostname 和受控私网访问，不能将当前 Service 直接暴露到公网。

## OIDC/JWT 实测

部署完成后执行：

```bash
AWS_PROFILE=global_admin deploy/aws/verify-keycloak.sh dev-global
```

该脚本通过 SSM 将私网 Keycloak 转发到本地，使用 Alpha 测试用户获取真实 Token，再启动使用临时 SQLite 数据库的 FastAPI，验证 `/auth/me`、Tenant Admin Workspace 创建和无效 Token 拒绝。密码和 Token 不打印到终端；退出时自动关闭转发、取消远程 SSM 命令并删除临时文件。

EKS Pod Identity 为 Polaris 提供服务身份，独立的 `IcebergStorageRole` 仅持有数据桶读写权限并信任该服务身份。Polaris 通过 STS `AssumeRole` 向 SeaTunnel 和 Trino 下发短期 S3 凭据，组件不使用静态 AWS 密钥。bastion 通过 `dwlle-deployers` 组和命名空间 Role 部署，不具有集群管理员权限。

当前 Polaris 使用内存元数据，仅用于第一周技术验证；生产持久化、HA 和客户入口不在本任务范围。

## 清理

本任务不提供自动清理。RDS、S3 和 ECR 按环境配置默认 `RETAIN`，不得为了重试部署直接删除。CloudFormation stack 更新失败时应先检查资源状态和 SSM 日志。
