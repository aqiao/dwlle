# T041 提交 `a4b46ca` 只读复审报告

## 摘要结论

本次复审未发现能够由提交内容、任务说明、已接受 ADR 或本地可复现命令直接证实的 T041 新问题。此前报告中的 4 项问题均已在 `a4b46ca` 中形成对应修复：部署入口不再在缺少镜像时执行公网 `docker pull`，Bastion 不再映射到 `system:masters`，配置/Secret/镜像变更通过 Pod template 摘要和 ECR digest 触发工作负载更新，一次性 Job 在重新应用前删除，且回归测试覆盖这些约束。

本报告仅复核 T041 及 `a4b46ca` 的变更，未审核 T032～T040 继承代码，也未读取或审核未跟踪的 `sessionmanager-bundle.zip` 和 `sessionmanager-bundle/`。未执行 AWS、SSM、Docker 推送或部署，因此无法独立验证真实账号中的资源状态、镜像推送结果、Pod Identity、RDS 密码实际值、Kubernetes 运行时 RBAC 或 SeaTunnel/Trino 链路。

## 证据

### 此前问题 1：公网镜像回退已修复

**文件和行号：**

- `deploy/aws/deploy-data-plane.sh:11-12` 调用 `scripts/stage-artifacts --verify-only` 和 `scripts/stage-images --verify-only`。
- `deploy/aws/deploy-data-plane.sh:34-39` 从本地已校验的镜像归档执行 `docker load`，未包含公网拉取回退。
- `scripts/stage-images:17-30` 只有在不带 `--verify-only` 的显式制品准备阶段才执行 `docker pull`，并按 `versions.json` 的归档 SHA-256 校验；部署入口使用 verify-only，不会进入该分支。

**验证结果：**

`infra/test/data-plane.test.ts` 的“deployment entry points require local verified artifacts without public fallbacks”测试同时读取本地部署入口和私网脚本，断言不存在 `docker pull`、`pip install`、`wget`、`curl`，并断言部署入口必须执行两个 verify-only 校验及 `docker load`。本地测试通过。

**结论：**

该修复满足 ADR-0006 对部署入口只使用预置制品、ECR 和 artifacts bucket 的边界。`stage-images` 中的公网拉取属于显式制品准备步骤，而不是私网安装脚本或部署入口的隐式回退。

### 此前问题 2：Bastion 的 `system:masters` 已移除

**文件和行号：**

- `infra/lib/stacks/base-stack.ts:255-257` 将 Bastion role 映射到 `dwlle-deployers`，不再映射到 `system:masters`。
- `infra/lib/stacks/base-stack.ts:75-151` 预置 `dwlle` Namespace、Role 和 RoleBinding。Role 的资源范围限定为 `dwlle` 命名空间，覆盖部署脚本实际使用的 ConfigMap、Secret、ServiceAccount、Service、Pod 读取、Pod 日志/exec、Deployment 和 Job 操作。
- `infra/test/base-stack.test.ts:40-42` 断言模板包含 `dwlle-deployers` 和 `pods/exec`，且不包含 `system:masters`。

**验证结果：**

`npm test` 通过，包含两分区的 Base stack 模板测试；测试中的 `system:masters` 断言通过。未执行 AWS 或 `kubectl auth can-i`，所以未独立复验运行时身份映射。

**结论：**

此前的全局集群超级管理员问题已由代码层面的命名空间 Role/RoleBinding 替代。当前 Role 仍允许部署脚本在 `dwlle` 内执行所需操作，但不再授予跨命名空间的 `system:masters` 权限。

### 此前问题 3：配置、Secret 和镜像变更已连接到 Pod 更新

**文件和行号：**

- `deploy/aws/remote-data-plane.sh:38-40` 计算 RDS Secret 和 Polaris Secret 摘要。
- `deploy/aws/remote-data-plane.sh:51-63` 计算三份配置清单摘要，并将镜像 digest、配置摘要和 Secret 摘要替换进清单。
- `deploy/aws/manifests/dolphinscheduler.yaml:15-18` 使用 DS 配置和 RDS Secret 摘要；镜像使用 `__REPOSITORY_URI__@__DS_IMAGE_DIGEST__`。
- `deploy/aws/manifests/polaris.yaml:25-28` 使用 Polaris 配置和 Polaris Secret 摘要；`deploy/aws/manifests/trino.yaml:28-31` 使用 Trino 配置和 Polaris Secret 摘要。
- `deploy/aws/remote-data-plane.sh:69-75` 在应用 Deployment 前删除旧的 `polaris-setup` Job，并等待三项 Deployment rollout；`remote-data-plane.sh:78-80` 再应用包含 Job 的 Polaris 清单并等待 Job 完成。
- `deploy/aws/remote-data-plane.sh:92-94` 每次执行前删除 SeaTunnel 一次性 Job，再重新创建并等待完成。

**验证结果：**

`infra/test/data-plane.test.ts` 的“configuration, secret, and image changes reach running pods”测试逐一检查三项 Deployment 的配置/Secret 摘要占位符、远程脚本中的摘要计算和替换，并检查 Job 删除发生在清单应用前。该测试通过。测试同时断言清单使用 ECR digest，而非 `:latest`。

**结论：**

相同 tag 的远端镜像内容不会再成为 Pod 的唯一更新依据，部署时会先推送镜像并查询 ECR digest，再把 digest 写入 Pod template。ConfigMap/Secret 的摘要变化也会改变 Pod template；一次性 Job 则在重复执行时显式删除后重建。因此此前“apply 成功但仍运行旧 Pod/旧 Job”的代码路径已被移除。

### 此前问题 4：回归测试已补充

**文件和行号：**

- `infra/test/data-plane.test.ts:17-30` 覆盖完整部署入口的离线制品校验和公网回退禁止条件。
- `infra/test/data-plane.test.ts:32-51` 覆盖配置、Secret、镜像 digest、摘要替换和 Job 重建顺序。
- `infra/test/base-stack.test.ts:40-42` 覆盖 Bastion Kubernetes group 和 namespace RBAC 关键内容。
- `infra/test/data-plane.test.ts:53-67` 覆盖 artifacts/images 版本、digest 和 SHA-256 格式。

**结论：**

此前测试只检查私网脚本的问题已修复为同时检查完整入口、远程脚本、部署清单和 Base stack 生成模板。测试仍属于静态/CDK 模板测试，不能替代真实 Kubernetes API 级别的更新和授权验证；这一点属于未验证项，不足以构成 `a4b46ca` 的代码缺陷。

## T041 范围内其他检查

- **Shell 错误处理和引用：** `deploy/aws/deploy-data-plane.sh`、`deploy/aws/remote-data-plane.sh`、`scripts/stage-artifacts`、`scripts/stage-images` 均以 `set -euo pipefail` 开头；变量路径和 AWS/Kubernetes 参数使用双引号，关键命令失败会中止。`bash -n` 对四个脚本通过。
- **重复执行和失败处理：** 本地入口对制品缺失或 SHA-256 不匹配会在推送和 SSM 前失败；远程脚本对旧 Job 采用显式删除、等待 rollout/Job 完成，并对 Trino 查询结果做精确校验。未执行真实 SSM，因此只确认代码路径。
- **IAM 和信任关系：** Bastion 仍只附加 `AmazonSSMManagedInstanceCore`、artifacts 读取、数据库 Secret 读取和目标集群 `eks:DescribeCluster`；数据平面使用 Pod Identity 角色，独立存储角色信任数据平面角色，代码未发现新的 `Action: *`、`Resource: *`、`arn:aws:` 或硬编码 `amazonaws.com`。
- **Kubernetes 配置生效：** Deployment 的摘要注解和 digest 引用会进入 Pod template；ConfigMap/Secret 本身仍通过 `kubectl apply` 更新，依赖它们的 Deployment 因摘要变化滚动更新。Seatunnel Job 每次重建并重新挂载 ConfigMap。
- **数据资源 RETAIN：** `infra/lib/stacks/base-stack.ts:22-25` 仅在配置明确为 `destroy` 时使用 DESTROY，否则使用 RETAIN；S3、ECR、RDS 均使用该策略。没有发现 `a4b46ca` 放宽数据资源删除策略。
- **分区兼容：** `base-stack.ts` 使用 `cdk.Aws.URL_SUFFIX`、CDK ARN 属性或资源属性，没有新增 `arn:aws:` 或 `amazonaws.com` 字面量。两个分区的 synth 均成功。

## 验证命令及结果摘要

以下命令均为本地只读检查、构建或测试；没有执行 AWS、SSM、Docker 推送、部署或破坏性操作：

- `git -C /Users/aqiao/Learning/dwlle show --stat --oneline --decorate --no-renames a4b46ca`：确认复审提交为 `a4b46ca`，变更包含部署脚本、Kubernetes 清单、Base stack、测试、制品脚本和版本清单。
- `git -C /Users/aqiao/Learning/dwlle status --short`：确认工作区只有未跟踪的 `.agents/`、`sessionmanager-bundle.zip`、`sessionmanager-bundle/`；后两者未读取或审核。
- `bash -n /Users/aqiao/Learning/dwlle/deploy/aws/deploy-data-plane.sh /Users/aqiao/Learning/dwlle/deploy/aws/remote-data-plane.sh /Users/aqiao/Learning/dwlle/scripts/stage-artifacts /Users/aqiao/Learning/dwlle/scripts/stage-images`：通过。
- `git -C /Users/aqiao/Learning/dwlle diff --check 896a924^ 896a924`：通过。
- `npm run build`（工作目录 `/Users/aqiao/Learning/dwlle/infra`）：通过。
- `npm run lint`（工作目录 `/Users/aqiao/Learning/dwlle/infra`）：通过；ESLint 和 Prettier 通过。
- `npm test`（工作目录 `/Users/aqiao/Learning/dwlle/infra`）：通过，2 个 suite、6 项测试。CDK 输出了配置中的 hardcoded AMI warning，但没有测试失败；该 warning 属于既有配置方式，未作为 T041 新问题报告。
- `npx cdk synth -c env=dev-global`（工作目录 `/Users/aqiao/Learning/dwlle/infra`）：退出码 0。
- `npx cdk synth -c env=dev-cn`（工作目录 `/Users/aqiao/Learning/dwlle/infra`）：退出码 0。

## 未验证项与建议

未执行真实 AWS API、SSM、`kubectl`、Docker 推送或部署，因此以下内容只由此前交付说明或代码声明，未在本次复审独立验证：真实 EKS/RDS/S3/ECR 资源状态；私有端点和网络连通性；Pod Identity 与 STS 凭据下发；ECR digest 对应的已推送镜像；RDS Secret 的实际字符集；SeaTunnel 写入和 Trino 查询；运行时 Pod UID、rollout revision 和 `kubectl auth can-i` 结果。

建议在下一次具备 AWS 测试窗口时按任务说明重新运行真实部署和重复执行验证，重点保留 Pod UID、镜像 digest、摘要注解以及跨命名空间 `kubectl auth can-i` 结果。当前未发现需要在本提交中追加的 T041 代码修复。

## 结论

在限定的 T041 审核范围内，`a4b46ca` 已实质修复此前报告的四项问题。本地构建、lint、测试、Shell 语法检查、diff 检查和 `aws`/`aws-cn` 两分区 synth 均通过；没有发现新的可证实问题。
