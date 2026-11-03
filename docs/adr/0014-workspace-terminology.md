# 0014 将 Project 统一命名为 Workspace

状态：已接受
日期：2026-11-03

## 背景

ADR-0011 中的 Project 不仅是一组 Pipeline，还包含成员权限、数据源、密钥、环境和基础设施。与 DolphinScheduler 的逻辑项目组相比，Project 容易让用户误解为简单的流程目录。Workspace 更能表达独立数据工作空间的运行与治理边界。

当前导航还使用“我的工作空间”，如果仅替换 Project 而不调整导航，会产生新的术语冲突。

## 决策

1. **领域层级统一为 `Tenant → Workspace → Environment → Scenario → Pipeline → TaskNode`。**
   - Tenant：客户企业。
   - Workspace：独立的数据工作空间，包含权限、数据源、密钥、环境、基础设施、配额和审计。
   - Environment：Workspace 内的开发、测试、生产环境。
   - Scenario：Workspace 内的业务逻辑组。
   - Pipeline：Scenario 内的具体数据流程。

2. **一个 Tenant 可以有多个 Workspace。** 同一用户可在不同 Workspace 中具有不同角色，Workspace 之间默认不共享数据源、权限或运行资源。

3. **Solution 是 Workspace 级共享模板。** 安装 Solution 是在指定 Tenant 中创建或升级 Workspace 实例，不是简单导入流程文件。

4. **界面导航“我的工作空间”改为“日常工作”。** 工作台用于汇总，Workspace 的创建、权限和环境配置归入“工作空间管理”。“新建工作空间”是管理员低频操作，“新建场景”是日常高频操作。

5. **API 与代码术语同步。** 新接口使用 `/api/v1/workspaces`、`WorkspaceService` 和 `workspace` 上下文；公共身份上下文由 `project` 调整为 `workspace`。历史 ADR 不改写，以本 ADR 为最新术语基线。

6. **不改变现有技术边界与本月计划。** 本次调整术语、文档和原型，不增加生产级 Workspace 管理功能。

## 理由

- Workspace 比 Project 更准确地表达独立运行与治理边界。
- Scenario 继续承担类似 DolphinScheduler 项目的逻辑分组职责，概念更清晰。
- 同步调整导航、API 和 Solution 语义可避免只改名称造成的新冲突。

## 后果（含代价与风险）

- 后续实现需要统一数据库字段、API 路径、服务名、前端文案和测试，不能只替换界面文字。
- 历史文档中的 Project 保留原义，阅读时需以 ADR-0014 为最新定义。
- Workspace 与 Environment 的边界必须保持：Environment 是同一 Workspace 的配置与资源实例，不是另一个业务 Workspace。
