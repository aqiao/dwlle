# T037：SeaTunnel、Iceberg 与 Trino 数据链路验证

状态：已完成
日期：2026-11-04

## 目标

在本地 Docker 环境验证 PostgreSQL 数据经 SeaTunnel 写入 Iceberg，再由 Trino 查询，确认开源数据平面核心链路可用。

## 范围

- 使用 RustFS 提供 S3 兼容对象存储，Apache Polaris 提供 Iceberg REST Catalog。
- 使用 SeaTunnel Zeta 执行 JDBC → Iceberg 批任务。
- 使用 Trino 通过 REST Catalog 查询 Iceberg 表。
- 凭据只通过环境变量注入，不写入仓库。
- 提供启动、验证和清理脚本，日志以 `[dwlle]` 为前缀且幂等。
- 为 DS、SeaTunnel、Trino 固定版本并校验制品哈希。

## 验收标准

1. SeaTunnel 批任务成功写入 Iceberg 表，Trino 可查询预期记录。
2. RustFS、Polaris、Trino 配置不包含仓库明文密码，重复执行不产生重复数据。
3. 文档包含启动、验证和清理方法，脚本可重复运行。
4. 在 `task/T037-data-plane-validation` 分支提交，提交信息以 `T037:` 开头。

## T037 交付说明

### 完成内容

- 新增 RustFS、Polaris、Trino、DolphinScheduler 及 SeaTunnel 本地验证环境。
- 提供 `start.sh`、`verify.sh`、`cleanup.sh`，分别负责制品校验与服务启动、端到端验证、环境清理。
- SeaTunnel 使用本地校验制品构建镜像，内置 JDBC/Iceberg 连接器和 PostgreSQL 驱动，不在容器内联网安装。
- DolphinScheduler 通过官方 `upgrade-schema.sh` 幂等初始化 PostgreSQL。
- `versions.json` 固定 Trino、DolphinScheduler、SeaTunnel、连接器及 JDBC 驱动的版本与 SHA256；staging 支持保留指定文件名。

### 验收标准核对

- [x] 标准 1 —— 连续执行两次 `deploy/local/verify.sh`，均输出 `Verified Trino result: "1","page_view","101"`；随后查询 `SELECT count(*) FROM polaris.demo.events` 返回 `"1"`。
- [x] 标准 2 —— 配置中的数据库与 Polaris 凭据均来自环境变量；两次批任务后仍只有一条预期记录。`scripts/stage-artifacts` 校验 6 个制品全部通过。
- [x] 标准 3 —— `deploy/local/cleanup.sh` 后重新执行 `deploy/local/start.sh` 可完整重建；再次执行启动脚本仍全部健康，DolphinScheduler UI 返回 HTTP 200。`bash -n`/`sh -n` 与 `git diff --check` 通过。
- [x] 标准 4 —— 在 `task/T037-data-plane-validation` 分支以 `T037: validate local data plane` 提交。

### 偏离任务说明之处

无功能性偏离。因官方 SeaTunnel 镜像大层下载长时间无进展，且其 `openjdk:8` 基础标签已下架，本地验证镜像改用 Eclipse Temurin 8u462 与已校验的 SeaTunnel 官方发行包构建。该方式只影响本地验证，不改变生产制品决策。

### 发现的问题 / 需要设计方决定的事

当前 Polaris 使用内存元数据，SeaTunnel 使用单容器 local 模式，仅用于功能验证。生产持久化、集群部署和 DolphinScheduler Workflow 编译器不在本任务范围内。
