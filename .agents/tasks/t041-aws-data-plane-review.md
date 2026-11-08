# T041 只读代码审核报告

## 摘要结论

审核对象仅为提交 `896a924`（`T041: deploy aws data plane`）新增或修改的文件；未审核其继承的 T032～T040 实现，也未审核未跟踪的 `sessionmanager-bundle.zip` 和 `sessionmanager-bundle/`。本次发现 4 个可由代码和可复现命令直接证实的问题：部署入口仍会从公网容器仓库拉取镜像；SSM 管理节点被映射为 Kubernetes `system:masters`；重复执行时 ConfigMap、Secret 和同标签镜像的变更不会触发相关 Pod 重启；现有测试没有覆盖上述本地下载路径和 Kubernetes 更新生效条件。

未执行 AWS 部署、SSM 命令或任何破坏性操作，因此没有对真实 AWS 账号当前资源状态、真实镜像拉取结果、Pod Identity 运行时行为、RDS 密码实际字符集和 SeaTunnel/Trino 真实链路作独立复验。报告中的部署运行时结论仅基于提交内容和本地可复现检查。

## 证据与发现

### [1][高] 部署入口违反离线制品要求，缺失镜像时直接从公网 Docker Registry 拉取

**文件和行号：**

- `deploy/aws/deploy-data-plane.sh:38-45`，`ensure_image` 在本地镜像不存在时执行 `docker pull`。
- 同文件 `:43-45` 使用 `trinodb/trino:484`、带 digest 的 `apache/polaris` 和 `alpine/curl` 作为公网镜像名；这些镜像随后才被重新 tag 并推送到 ECR。
- `deploy/aws/README.md` 的前置条件只要求本机有 Docker，并没有要求这些镜像已经通过受信制品流程提供给本机。

**问题证据：**

T041 要求通过 artifacts bucket 和 ECR 提供部署制品，且运行时不得从公网下载；ADR-0006 进一步明确安装脚本禁止使用公网下载源。当前流程在镜像不存在时执行 `docker pull`，因此首次运行或清理本地 Docker 缓存后会访问 Docker Hub 等公网仓库。该行为发生在上传到 ECR 之前，不能由 ECR 中的最终镜像引用抵消。

本地复现静态证据：

```text
$ grep -nE 'docker pull|ensure_image' deploy/aws/deploy-data-plane.sh
38:ensure_image() {
40:    docker pull "$1"
43:ensure_image trinodb/trino:484
44:ensure_image apache/polaris:1.8.0@sha256:...
45:ensure_image alpine/curl:8.23.0
```

**实际影响：**

在无公网访问、Docker Hub 不可达或中国区网络受限时，部署会在 ECR 推送和 SSM 私网部署之前失败；即使能访问公网，部署结果仍依赖外部 Registry 的可用性和本地缓存，不满足离线、可复现的部署前提。这个失败发生在私网节点之外，但会使 T041 的完整部署入口不能按任务要求工作。

**最小修复建议：**

移除 `ensure_image` 的公网 `docker pull` 路径。把 Trino、Polaris、curl 以及构建 DolphinScheduler/SeaTunnel 所需的基础镜像纳入预置制品流程，按 `versions.json` 校验摘要后从本地 artifacts 或已批准的内部 Registry 导入，再统一推送到 ECR。部署脚本只接受本地已验证镜像，缺失时明确失败，不尝试公网回退。

**验证方法：**

在无 Docker Registry 网络访问且本地无目标镜像的隔离环境运行入口，预期脚本只报告“缺少已验证本地制品”并在 ECR 推送前失败，不发出任何公网 pull 请求；补齐本地制品后，再执行 shell 语法检查、镜像推送和 SSM 部署。并增加单元测试覆盖 `deploy-data-plane.sh`，检查部署入口及其调用的 compose 构建脚本不含公网 `docker pull`/未批准 Registry 回退。

**置信度：** 高

### [2][高] SSM 管理节点被授予 Kubernetes `system:masters`，超出 T041 部署所需权限

**文件和行号：**

- `infra/lib/stacks/base-stack.ts:150-170`，创建 `BastionRole`，附加 `AmazonSSMManagedInstanceCore`，并通过 `cluster.awsAuth.addRoleMapping` 将该角色加入 `system:masters`。
- 同文件 `:181-194` 将该角色用于没有公网 IP 的 SSM bastion。

**问题证据：**

提交中的角色既可以通过 SSM 执行远程命令，又被 EKS aws-auth 映射到 Kubernetes 全局超级管理员组：

```text
cluster.awsAuth.addRoleMapping(bastionRole, {
  groups: ["system:masters"],
});
```

T041 的远程脚本只需要在 `dwlle` 命名空间创建和更新所列 Deployment、Service、ConfigMap、Secret、Job，并读取相关日志；代码没有证明需要全集群管理员权限。AGENTS.md 的硬性规则要求 IAM 遵循最小权限，架构文档也要求管理入口受控。

**实际影响：**

任何获得该 EC2 实例 SSM 执行能力的主体，都可以借助该实例的 IAM 身份对整个 EKS 集群执行任意 Kubernetes 管理操作，包括访问或修改其他命名空间的工作负载和 Secret。bastion 作为私网部署跳板，其被入侵或 SSM 权限配置错误后的影响范围因此扩大到整个集群，而非 T041 的 `dwlle` 数据平面命名空间。

**最小修复建议：**

不要把 bastion role 映射到 `system:masters`。为 T041 所需资源建立仅限 `dwlle` 命名空间的 Kubernetes `Role`/`RoleBinding`，只授予部署脚本实际使用的资源和动词；AWS IAM 侧保留必要的 SSM、EKS 描述、artifacts 读取和数据库 Secret 读取权限。若 EKS 初始引导确实需要更高权限，应使用一次性受控引导身份，不将长期 SSM 实例角色作为集群超级管理员。

**验证方法：**

对 `dev-global` 和 `dev-cn` synth 结果检查 `aws-auth` 映射不再包含 `system:masters`；使用 bastion role 运行 T041 远程脚本应能完成 `dwlle` 命名空间内资源操作，但对其他命名空间的 `get/list/exec` 被 Kubernetes RBAC 拒绝。运行 `npm test` 并新增针对角色映射和 RBAC 范围的模板测试。

**置信度：** 高

### [3][中] 重复执行不会可靠地使 ConfigMap、Secret 或同标签镜像的变更生效

**文件和行号：**

- `deploy/aws/remote-data-plane.sh:43-50`，通过 `kubectl apply` 更新 RDS Secret；仅在 `polaris-auth` 不存在时创建 Polaris Secret。
- 同文件 `:52-57` 应用 DolphinScheduler、Polaris 和 Trino manifests，并立即对三项 Deployment 执行 `rollout status`。
- 同文件 `:61-63` 再次应用 `polaris.yaml` 以创建 setup Job，但没有任何 Deployment 重启或变更触发机制。
- `deploy/aws/manifests/polaris.yaml:3-22`、`deploy/aws/manifests/trino.yaml:1-18` 定义由容器启动时读取的 ConfigMap；`deploy/aws/manifests/*:image` 使用固定 ECR tag，而非不可变 digest。

**问题证据：**

`kubectl apply` 更新 ConfigMap 不会改变 Deployment Pod template；已有 Pod 不会因 ConfigMap 内容变化而重新启动。通过 `secretKeyRef` 注入的环境变量也只在容器启动时读取，更新 `rds-dwlle` Secret 不会刷新正在运行的 DolphinScheduler/SeaTunnel/Trino 进程。与此同时，重复推送同一 ECR tag 不改变 Deployment YAML 中的 tag 字符串，Kubernetes 不会因为 tag 对应的远端内容变了而自动滚动更新。

因此脚本的“重复执行”只保证 apply 命令执行，不保证最新配置、凭据或镜像真正进入运行中的 Pod；后续 `rollout status` 可能只是确认旧 Pod 仍然 Ready。

**实际影响：**

配置、RDS 密码或镜像修复已上传后，重复执行可能继续使用旧配置、旧环境变量或旧镜像。尤其在 Secret 轮换或修复组件配置后，脚本会报告部署成功，但实际数据平面仍使用旧状态，导致部署验证结果与正在运行的版本不一致。

**最小修复建议：**

为由 ConfigMap/Secret 驱动的 Deployment 在 Pod template 加入内容摘要注解，或在成功 apply 后显式执行受控的 `kubectl rollout restart`，然后等待新 ReplicaSet 的 rollout；镜像使用 digest，或在镜像内容变化时写入新的不可变版本标识。对于 `polaris-auth` 的保留行为，应明确其只用于保持稳定凭据，并对其他 Secret 更新触发对应工作负载重启。不要只依赖 `rollout status` 判断更新已生效。

**验证方法：**

在 kind/minikube 或测试 EKS 中先运行脚本部署，再修改 Polaris/Trino ConfigMap、RDS Secret 和同 tag 镜像内容并再次运行；检查 Pod UID、ReplicaSet revision、容器启动时间和容器内实际配置，确认它们都发生了预期更新。新增 Kubernetes manifest/脚本测试，验证配置或 Secret 改变会导致 Pod template 变更或显式 rollout restart。

**置信度：** 高

### [4][中] 现有测试漏掉了实际违规路径，无法防止问题 1～3 回归

**文件和行号：**

- `infra/test/data-plane.test.ts:22-31` 只读取 `deploy/aws/remote-data-plane.sh` 和 `polaris.yaml`，检查 remote 脚本不含 `docker pull`、`https://`、`pip install`、`wget`。
- `deploy/aws/deploy-data-plane.sh:35-45` 的本地镜像构建和公网回退不在该测试读取范围内。
- `infra/test/data-plane.test.ts:8-19` 只检查 manifest 文本中没有 `:latest`，没有检查 image digest、rollout 触发机制、RBAC 范围或远程脚本重复执行后的 Pod 更新。
- `infra/test/base-stack.test.ts:10-48` 检查分区 ARN、S3 公共访问、RDS 私网/加密、AMI 和安全组 CIDR，但没有检查 bastion 的 Kubernetes group 是否为 `system:masters`，也没有验证数据平面角色只拥有必要权限。

**问题证据：**

本地测试实际通过，但仍同时接受了上述代码。可复现结果：

```text
$ cd /Users/aqiao/Learning/dwlle/infra && npm test -- --runInBand
Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
```

这说明测试只证明了 remote 脚本本身没有字符串 `docker pull`，不能证明完整部署入口没有公网拉取；也没有执行 Kubernetes API 级别的更新生效或 RBAC 约束验证。

**实际影响：**

后续修改可以再次引入公网下载、超级管理员映射或“apply 但不重启”的行为，而现有 T041 测试仍然通过。提交的绿色测试结果因此不足以支持离线部署、最小权限和重复执行三个关键验收风险。

**最小修复建议：**

将测试对象扩展到完整入口脚本和所有部署 manifest：静态测试禁止公网镜像回退；模板测试检查 bastion role 映射和 IAM 行为；用 YAML/模板测试确认 ConfigMap/Secret 变更能触发 Pod template 更新或脚本显式重启。对镜像使用 digest 或不可变发布标识加入断言。测试应继续保留现有两分区 `arn:aws:` 检查。

**验证方法：**

运行 `npm test -- --runInBand`，新增测试应在恢复 `docker pull`、`system:masters` 或删除 rollout 触发逻辑时失败；再运行两分区 synth，确认测试使用的资源引用仍能在 `aws` 和 `aws-cn` 分区生成。

**置信度：** 高

## 验证命令及结果摘要

以下命令均为只读检查或本地构建/测试，未执行 AWS 部署、SSM 命令和 Docker 推送：

- `git -C /Users/aqiao/Learning/dwlle show --stat --oneline --decorate --no-renames 896a924`：确认审核提交为 `896a924`，变更集中在 AWS 部署脚本、Kubernetes manifests、CDK stack、配置和 T041 测试。
- `git -C /Users/aqiao/Learning/dwlle show --format= --name-only 896a924`：确认审核文件范围；未跟踪的 `sessionmanager-bundle` 不在提交文件列表中。
- `git -C /Users/aqiao/Learning/dwlle status --short --branch`：当前分支为 `task/T041-aws-data-plane-deployment`；仅报告了未跟踪的 `sessionmanager-bundle.zip` 和 `sessionmanager-bundle/`，未读取或审核它们。
- `bash -n /Users/aqiao/Learning/dwlle/deploy/aws/deploy-data-plane.sh /Users/aqiao/Learning/dwlle/deploy/aws/remote-data-plane.sh`：通过。
- `git -C /Users/aqiao/Learning/dwlle diff --check 896a924^ 896a924`：通过。
- `npm run build`（`/Users/aqiao/Learning/dwlle/infra`）：通过。
- `npm run lint`（`/Users/aqiao/Learning/dwlle/infra`）：通过；ESLint 和 Prettier 均通过。
- `npm test -- --runInBand`（`/Users/aqiao/Learning/dwlle/infra`）：通过，2 个 suite、5 项测试；CDK 产生了硬编码 AMI 的 warning，但没有测试失败。
- `npx cdk synth -c env=dev-global >/dev/null && npx cdk synth -c env=dev-cn >/dev/null`（`/Users/aqiao/Learning/dwlle/infra`）：两个分区均退出码 0；两次 synth 都报告 CDK hardcoded AMI warning 和 feature flags 提示。

## 结论与建议优先级

优先修复问题 1，确保完整部署入口符合 ADR-0006 的离线制品边界；随后修复问题 2，将 SSM bastion 从全局 Kubernetes 超级管理员降权。问题 3 需要在脚本和 manifests 中建立明确的配置/Secret/镜像变更到 Pod 重启的机制。问题 4 应随前三项修复补充回归测试。上述建议均限定在 T041 的部署正确性、重复执行、失败处理、Shell/IAM/Kubernetes 配置和测试范围内。
