# 0014 将 Project 统一命名为 Workspace

状态：已接受（Solution 安装与对象关系以现行声明为准）
日期：2026-11-03

> 现行架构声明（2026-11-08）：本 ADR 的命名决策是将 Project 统一为 Workspace，不再使用原来的线性箭头定义对象归属。Solution 默认安装到既有 Workspace 的目标 Environment，不默认新建 Workspace。原决策中的 Solution 安装目标和 `Environment → Scenario` 层级仅保留作历史记录，不得直接实施。

## 现行有效约束

1. 文档、代码和接口使用 Workspace，包括 `/api/v1/workspaces`、WorkspaceService 和 `workspace` 身份上下文；历史 ADR 中的 Project 保留原义。
2. 一个 Tenant 可以有多个 Workspace，同一用户可在不同 Workspace 中具有不同角色；Workspace 之间默认不共享数据源、权限或运行资源。
3. 对象关系统一为：

   ```text
   Tenant
   └─ Workspace
      ├─ Environment
      └─ Scenario
         └─ WorkflowVersion
            └─ Component / TaskNode
   ```

   Environment 与 Scenario 并列属于 Workspace。Scenario/WorkflowVersion 保存业务和技术定义，Environment 只在发布、部署和运行时提供资源与密钥绑定。
4. Solution 是 Workspace 级共享模板。默认安装是在指定既有 Workspace 的目标 Environment 中创建或升级企业实例，由目标管理员完成环境、资源、DataAssetBinding、SecretRef 和角色绑定，不复制源模板的密钥或实际授权。
5. 默认安装不新建 Workspace，也不改变既有 Workspace 的成员关系与权限边界。若未来允许从 Solution 新建 Workspace，必须作为独立工作流另行定义成员、环境、资源和权限初始化规则。
6. 界面导航使用“日常工作”；Workspace 的创建、权限、环境、基础设施和开发者工具归入 Workspace 设置，个人账户与界面偏好归入个人设置。

## 背景

ADR-0011 中的 Project 不仅是一组 Pipeline，还包含成员权限、数据源、密钥、环境和基础设施。与 DolphinScheduler 的逻辑项目组相比，Project 容易让用户误解为简单的流程目录。Workspace 更能表达独立数据工作空间的运行与治理边界。

当前导航还使用“我的工作空间”，如果仅替换 Project 而不调整导航，会产生新的术语冲突。

## 历史决策（不得直接实施）

1. 曾将领域层级写为 `Tenant → Workspace → Environment → Scenario → Pipeline → TaskNode`，并把 Environment 置于 Scenario 父链。
2. 一个 Tenant 可以有多个 Workspace，Workspace 之间默认不共享数据源、权限或运行资源。
3. Solution 是 Workspace 级共享模板，安装曾表述为在指定 Tenant 中创建或升级 Workspace 实例。
4. 界面导航“我的工作空间”改为“日常工作”，Workspace 管理归入工作空间管理。
5. 新接口使用 `/api/v1/workspaces`、WorkspaceService 和 `workspace` 上下文，本 ADR 曾作为所有对象关系的最新术语基线。
6. 原调整曾限定不改变当时的技术边界与月度计划。

## 历史理由与后果（仅作历史记录）

- Workspace 比 Project 更准确地表达独立运行与治理边界。
- Scenario 继续承担类似 DolphinScheduler 项目的逻辑分组职责。
- 同步调整导航、API 和 Solution 语义可避免只改名称造成的新冲突。
- 后续实现需要统一数据库字段、API 路径、服务名、前端文案和测试，不能只替换界面文字。
- Environment 是同一 Workspace 的配置与资源实例，不是另一个业务 Workspace。
