# T038：升级数据平面组件到最新稳定版本

状态：已完成
日期：2026-11-04

## 目标

将本地验证环境中的 SeaTunnel、DolphinScheduler 和 Trino 升级到官方最新稳定版本，使用明确版本号而非 `latest`，并重新验证完整数据链路。

## 版本依据

- SeaTunnel `3.0.0`：Apache 最新非预发布版本，官方下载目录和 Docker 镜像均存在。
- DolphinScheduler `3.4.3`：Apache 最新非预发布版本，官方下载目录和 standalone 镜像均存在。
- Trino `484`：Trino 官方下载页标记的当前版本，服务端镜像和 CLI 均存在。

## 范围

- 更新 Compose 中的三个组件版本及配套 Trino CLI、SeaTunnel JDBC/Iceberg 连接器。
- 将 Polaris 镜像标签从 `latest` 明确为同一 digest 对应的 `1.8.0`，不改变实际镜像内容。
- 更新 `versions.json` 制品 URL 和 SHA256。
- 必要时适配新版本配置；不改变业务功能边界。
- 保持 DolphinScheduler 交互边界为 dwlle-api 内的 REST API client，不直接访问其数据库或复用其 UI。本任务只验证 API 可用性，不实现 Workflow 编译器。

## 验收标准

1. 三个组件均使用上述明确版本，配置中不使用 `latest`。
2. 新制品通过 SHA256 校验，启动脚本可重复运行。
3. SeaTunnel 连续两次写入后 Trino 仍返回同一条预期记录，DolphinScheduler UI 和 REST API 可访问。
4. Shell/Compose 静态检查通过，并在 `task/T038-latest-component-versions` 分支以 `T038:` 开头提交。

## T038 交付说明

### 完成内容

- SeaTunnel 升级为 `3.0.0`，配套 JDBC/Iceberg 连接器同步升级，PostgreSQL JDBC 驱动保持该版本要求的 `42.4.3`。
- DolphinScheduler 升级为 `3.4.3`，完成已有 PostgreSQL schema 升级。
- Trino 服务端及 CLI 升级为 `484`，Polaris 使用明确标签 `1.8.0` 和原 digest。
- 新组件制品均记录明确 URL 和 SHA256，不使用 `latest`。

### 验收标准核对

- [x] 标准 1 —— Compose 中 SeaTunnel、DolphinScheduler、Trino 分别为 `3.0.0`、`3.4.3`、`484`；配置搜索无旧版本号或 `latest`。
- [x] 标准 2 —— `scripts/stage-artifacts` 校验 6 个制品全部通过；重复执行 `deploy/local/start.sh` 后各服务健康。
- [x] 标准 3 —— 连续执行两次 `deploy/local/verify.sh` 均返回 `"1","page_view","101"`，最终 `count(*)` 为 `"1"`。DolphinScheduler UI 返回 HTTP 200；登录及带会话的项目列表 REST API 均返回 `code=0`，OpenAPI 为 3.4.3、共 201 个接口。
- [x] 标准 4 —— Shell 语法、Compose 配置、JSON 和 `git diff --check` 通过；在 `task/T038-latest-component-versions` 分支以 `T038: upgrade data plane components` 提交。

### 偏离任务说明之处

无功能性偏离。因官方镜像大层下载反复停滞，SeaTunnel 和 DolphinScheduler 使用经过 SHA256 校验的官方发行包及 Eclipse Temurin 8u462 构建本地验证镜像。DolphinScheduler 保留官方工作目录 `/opt/dolphinscheduler`，否则 3.4.3 UI 静态资源会返回 404。此构建方式不改变生产镜像决策。

### 发现的问题 / 需要设计方决定的事

无。DolphinScheduler Workflow 编译器仍按后续任务实现，统一封装在 dwlle-api 的 REST API client 中。
