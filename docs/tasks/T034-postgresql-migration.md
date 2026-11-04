# T034：控制平面切换 PostgreSQL

状态：已完成
日期：2026-11-04

## 目标

将控制平面从本地 SQLite 切换到本地 PostgreSQL，验证真实数据库连接、迁移和 API 行为，为后续 RDS PostgreSQL 部署保持同一驱动路径。

## 范围

- 使用本机 `127.0.0.1:5432` PostgreSQL，创建 `dwlle` 数据库。
- 增加 psycopg 驱动，默认连接改为 `postgresql+psycopg`。
- 初始化 SQLAlchemy 表结构，并迁移 SQLite 中已有 Workspace 数据且保持幂等。
- 保留测试环境 SQLite 隔离，不影响单元测试。
- 更新启动文档并实际验证 PostgreSQL 中的 Workspace 数据与 API。

## 非目标

- 不部署 RDS、不实现数据库高可用或正式迁移框架。
- 不修改 Scenario/Workflow 以外的数据模型。

## 验收标准

1. `dwlle` 数据库存在且后端使用 `postgresql+psycopg` 连接。
2. 已有 Workspace 数据迁移成功，重复迁移不重复插入。
3. `uv run pytest`、ruff、mypy 通过，真实 API 可创建和读取 PostgreSQL 数据。
4. 在 `task/T034-postgresql-migration` 分支提交，提交信息以 `T034:` 开头。

## 交付说明

### 完成内容

- 创建本地 PostgreSQL `dwlle` 数据库，默认连接改为 `postgresql+psycopg`。
- 增加 psycopg 驱动并修正 SQLite 专用连接参数的兼容性。
- 提供幂等 SQLite 数据迁移脚本，已有 Workspace 数据成功迁移。
- 更新启动文档，真实 API 可创建和读取 PostgreSQL 数据。

### 验收标准核对

- [x] 标准 1 —— 本地 PostgreSQL 18.6 中 `dwlle` 数据库已创建并连接成功。
- [x] 标准 2 —— 首次迁移 1 条，第二次迁移 0 条，无重复数据。
- [x] 标准 3 —— 5/5 测试通过，ruff 无错误，mypy 无问题；真实 API 创建并读取 2 条 Workspace。
- [x] 标准 4 —— 在指定任务分支提交。

### 偏离任务说明之处

无。

### 发现的问题 / 需要设计方决定的事

生产环境需通过 Secrets Manager 注入 PostgreSQL 凭据，当前本地 `aqiao` 连接仅用于开发。
