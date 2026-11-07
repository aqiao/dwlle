# T042：基础设施、后端与前端 CI 质量门禁

状态：进行中
日期：2026-11-06

## 目标

建立 GitHub Actions CI，在 Pull Request 和 main 分支推送时自动检查基础设施、FastAPI 后端和 React 前端，确保构建、lint、测试和类型检查可重复执行，并持续验证 AWS Global/中国区两个分区的 CDK synth。

## 范围

### 公共约束

- 使用 GitHub Actions，Pull Request、main 分支推送和手动触发均可运行。
- 使用锁文件安装依赖，运行失败时返回非零状态并明确显示失败步骤。
- 遵循最小权限，不配置 AWS 凭据，不执行真实部署。
- Node.js 使用 22 LTS，Python 使用 3.12。

### 基础设施

- 在 `infra/` 执行 `npm ci`、build、独立类型检查、lint 和 Jest。
- 分别执行 `npx cdk synth -c env=dev-global` 和 `npx cdk synth -c env=dev-cn`。
- 保持模板安全约束测试，包括生成模板不得包含字面量 `arn:aws:`。
- 基础设施相关部署输入发生变化时，现有部署约束测试仍须通过。

### FastAPI 后端

- 在 `services/api/` 使用 `uv sync --frozen --extra dev` 安装锁定依赖。
- 执行 `uv build`、`uv run ruff check .`、`uv run mypy app` 和 `uv run pytest`。
- mypy 保持 strict，测试无需连接真实 AWS 或生产数据库。

### React 前端

- 在 `web/` 执行 `npm ci`、build、lint 和 Vitest。
- 独立执行 TypeScript 类型检查，不得仅依赖 Vite 转译。
- 前端检查无需连接真实后端服务。

## 非目标

- 不部署或销毁真实 AWS 资源，不实测中国区。
- 不执行本地或 AWS 数据平面端到端测试，不构建和推送部署镜像。
- 不配置分支保护规则、发布流程或 CD 部署。

## 验收标准

1. Pull Request、main 分支推送和手动触发可以运行 CI，任一必需检查失败时工作流失败。
2. 基础设施的依赖安装、build、独立类型检查、lint、test 及 Global/CN 两种 synth 全部在 CI 中执行并通过。
3. FastAPI 后端的锁定依赖安装、build、ruff、mypy strict 和 pytest 全部在 CI 中执行并通过。
4. React 前端的依赖安装、build、独立类型检查、lint 和 test 全部在 CI 中执行并通过。
5. 测试遍历生成模板并确认不存在字面量 `arn:aws:`，CI 不需要 AWS 凭据。
6. 在 `task/T042-cicd-foundation` 分支提交，提交信息以 `T042:` 开头。

## T042 交付说明

### 完成内容

- 新增 GitHub Actions `Infrastructure`、`FastAPI` 和 `React` 三个独立 Job，支持 Pull Request、main 分支推送和手动触发，权限仅为 `contents: read`。
- Infrastructure 使用 Node.js 22 和 npm 锁文件缓存，依次执行依赖安装、build、独立类型检查、lint、Jest 及 Global/CN 两种 synth。
- FastAPI 使用 Python 3.12 和 uv 锁文件缓存，执行锁定依赖安装、`uv build`、ruff、mypy strict 和 pytest。
- React 使用 Node.js 22 和 npm 锁文件缓存，执行依赖安装、build、独立类型检查、lint 和 Vitest。
- 在基础设施和前端工程中新增 `npm run typecheck`，并将后端 `dist/` 构建产物加入 `.gitignore`。

### 验收标准核对

- [ ] 标准 1 —— 已在工作流中定义三类触发器和失败传播；尚未推送 GitHub，实际 Actions 触发仍待验证。
- [x] 标准 2 —— 在 `infra/` 依次执行 `npm ci && npm run build && npm run typecheck && npm run lint && npm test && npx cdk synth -c env=dev-global && npx cdk synth -c env=dev-cn`，全部成功；2 个 suite、6 项测试通过。
- [x] 标准 3 —— 使用独立 Python 3.12.14 环境执行 `uv sync --frozen --extra dev`、`uv build`、ruff、mypy 和 pytest，全部成功；12 项测试通过，覆盖率 94%。
- [x] 标准 4 —— 在 `web/` 执行 `npm ci && npm run build && npm run typecheck && npm run lint && npm test`，全部成功；1 个测试文件、12 项测试通过。
- [x] 标准 5 —— 现有测试分别检查 Global/CN 模板不包含字面量 `arn:aws:`；本地 synth 未使用 AWS 凭据。
- [ ] 标准 6 —— 当前分支为 `task/T042-cicd-foundation`，变更尚未提交。

### 偏离任务说明之处

无范围偏离。三个 Job 均已实现并完成本地命令验证；尚未提交或推送，真实 GitHub Actions 未运行。工作流格式已通过 Prettier 解析检查；当前环境没有 `actionlint`。

### 发现的问题 / 需要设计方决定的事

- 测试和 synth 仍输出现有的 CDK `W9010` AMI 可移植性警告，但不影响检查结果；本任务未修改基础设施实现。
- FastAPI 测试输出现有的 Starlette `httpx` 弃用警告，不影响测试通过，后续随依赖升级处理。
