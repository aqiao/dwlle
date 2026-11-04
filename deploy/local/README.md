# 本地数据平面验证

验证 PostgreSQL → SeaTunnel Zeta → Apache Iceberg → Trino 的最小数据链路，并启动 DolphinScheduler 独立服务。Polaris 仅使用内存元数据，本环境只用于功能验证。凭据通过环境变量提供，不写入仓库。

## 准备

安装 Docker 和 Docker Compose，准备本地 PostgreSQL 中的 `dwlle`、`dolphinscheduler` 两个数据库，然后在仓库根目录设置：

```bash
export RUSTFS_ACCESS_KEY=<本地访问密钥>
export RUSTFS_SECRET_KEY=<本地访问密钥>
export POLARIS_CLIENT_SECRET=<本地客户端密钥>
export LOCAL_POSTGRES_JDBC_URL=jdbc:postgresql://host.docker.internal:5432/dwlle
export LOCAL_POSTGRES_USER=<本地数据库用户>
export LOCAL_POSTGRES_PASSWORD=<本地数据库密码>
export DOLPHINSCHEDULER_JDBC_URL=jdbc:postgresql://host.docker.internal:5432/dolphinscheduler
```

本地数据库允许空密码时，也必须显式执行 `export LOCAL_POSTGRES_PASSWORD=`。Compose 中的 `host.docker.internal` 访问宿主机 PostgreSQL，不适用于 Linux 宿主机直接部署。

## 启动与验证

```bash
deploy/local/start.sh
deploy/local/verify.sh
```

启动脚本先通过 `scripts/stage-artifacts` 校验固定版本制品，再等待 RustFS、Polaris、Trino 和 DolphinScheduler 健康。DolphinScheduler 使用官方 `upgrade-schema.sh` 幂等初始化 PostgreSQL 表。SeaTunnel 及其 JDBC、Iceberg 连接器、PostgreSQL 驱动从本地 `artifacts/` 构建验证镜像，不在容器内联网安装。

验证脚本创建 `demo` 命名空间（如不存在），执行 JDBC → Iceberg 批任务，并检查 Trino 返回 `"1","page_view","101"`。重复执行会先清空再写入示例表数据，不会追加重复行。

可访问以下管理界面：

- Trino：http://localhost:8080
- DolphinScheduler：http://localhost:12345/dolphinscheduler/ui/
- RustFS Console：http://localhost:9001

## 清理

```bash
deploy/local/cleanup.sh
```

该命令删除本地数据平面容器及 RustFS 数据卷，不修改宿主机 PostgreSQL 数据库。Polaris 内存元数据随容器删除，下次启动会重新初始化 Catalog。
