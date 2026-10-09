# T002 版本清单与安装包准备脚本

分支：`task/T002-artifact-staging` · 依赖：T001 · 预计：2~4 小时

## 目标
实现 ADR-0006：所有第三方安装包统一记录在 `versions.json` 中，由 `scripts/stage-artifacts` 下载、校验并上传到目标环境的 artifacts bucket。部署时，EC2 只从 S3 获取安装包。

## 范围

### 1. `versions.json`（仓库根目录）
```json
{
  "schemaVersion": 1,
  "components": {
    "starrocks": {
      "version": "<x.y.z>",
      "artifacts": {
        "arm64":  { "filename": "...", "source": "https://...", "sha256": "..." },
        "x86_64": { "filename": "...", "source": "https://...", "sha256": "..." }
      }
    }
  }
}
```
- 本任务只登记 `starrocks`。DolphinScheduler、Superset 等组件在各自的任务里再加。
- StarRocks 版本选官网**最新的稳定版 3.x**。`source` 填官方下载地址。`sha256` 优先与官方发布的校验值核对；官方没有发布时，填下载后计算出的值，并在交付说明中注明。
- 如果官方没有提供 arm64 安装包，`arm64` 项留空，在交付说明里写明。这关系到 ARCHITECTURE Q1，需要设计方决定。

### 2. `scripts/stage-artifacts`（Python，兼容 3.9 及以上，只依赖标准库和 boto3）
提供两个子命令：

```
stage-artifacts download [--component starrocks] [--arch arm64|x86_64|all]
stage-artifacts upload   --env dev-cn [--profile <aws-profile>] [--component ...] [--arch ...]
```

- **download**：把安装包下载到 `.artifacts-cache/<component>/<version>/<arch>/<filename>`，然后校验 sha256，校验失败就删除文件并报错。本地已有文件且校验通过的，直接跳过。
  - 这个子命令可以在任何能访问公网的机器上运行。
- **upload**：
  - 从 `infra/config/<env>.json` 读取 region。
  - 从 SSM 参数 `/dwller/<env>/bucket/artifacts` 读取 bucket 名称。
  - 上传到 `s3://<bucket>/components/<component>/<version>/<arch>/<filename>`，并把 sha256 写入对象 metadata `x-amz-meta-sha256`。
  - 对象已存在且 metadata 中的 sha256 一致时，跳过上传。
  - 大文件使用分段上传（boto3 的 `upload_file` 默认支持）。
- 中国区的使用场景：先在一台能访问公网的机器上执行 `download`，再用中国区的凭证 `--profile` 执行 `upload`。整个过程只涉及本地文件中转，不做跨分区的 S3 复制。
- 输出日志以 `[dwller]` 为前缀；任何失败都以非 0 状态退出。
- 把 `.artifacts-cache/` 加入 `.gitignore`。

### 3. 供 CDK 使用的辅助函数
在 `infra/lib/config/versions.ts` 中实现以下函数：
- 读取并校验 `versions.json`（用 zod）
- `artifactKey(component, arch)`：返回 S3 key，供 T003 的 user data 使用

### 4. 测试
- Python（pytest，放在 `scripts/tests/`）：
  - versions.json 的结构校验
  - sha256 不一致时报错
  - upload 时对已存在的对象做跳过判断（用 moto 或 stub 模拟 S3）
- TypeScript：测试 `artifactKey` 的输出格式。

### 5. 文档
在 `scripts/README.md` 中说明 Global 区和中国区两种使用流程，以及升级组件的步骤：修改 `versions.json`，然后依次执行 download 和 upload。

## 不在范围内
容器镜像的准备流程（随 T007 / T009 设计）、CI 流水线。

## 验收标准
1. `stage-artifacts download --component starrocks --arch all` 能完成下载并通过校验；第二次运行全部跳过。
2. 在已部署 T001 的账号中执行 `upload`，对象出现在正确的 key 下，且带有 sha256 metadata；重复执行时全部跳过。在 dev-global 和 dev-cn 中至少验证其一，并写明验证的是哪一个。
3. pytest 和 `infra/` 的 `npm test` 全部通过。
4. 脚本里没有硬编码的 bucket 名称、region 或账号。

## 给评审的关注点
- sha256 校验能否被绕过，例如下载失败后留下了半截文件
- 中国区流程是否真正可行
