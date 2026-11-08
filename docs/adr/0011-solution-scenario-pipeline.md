# 0011 解决方案、业务场景与 Pipeline 三层抽象

状态：已接受（术语及三层表述由 0014、0015 与现行声明调整）
日期：2026-11-03

> 现行架构声明（2026-11-08）：现行可执行约束单独列于下节。原 Project/Pipeline 三层模型、跨项目限制和阶段日期仅保留作历史记录，不得直接实施。当前三层业务抽象为 Tenant、Workspace、Scenario，Workflow 是执行对象，Environment 是运行上下文。

## 现行有效约束

1. 三层业务抽象为 Tenant、Workspace、Scenario，不支持 Scenario 嵌套。
2. Workspace 是业务协作、权限与资源治理边界；Environment 是 Workspace 内的运行上下文；Scenario 组织 Workflow、跨 Workflow 依赖、数据契约和 SLA。
3. Workflow 是 Scenario 下可独立版本化、发布和执行的技术对象，包含技术节点、引擎、重试和质量配置。
4. Solution 是 Workspace 级版本化模板，锁定 Scenario、Workflow 和组件版本，不复制正在运行的企业实例。
5. 定义与环境绑定分离。安装 Solution 时必须由目标管理员绑定并批准环境、资源、DataAssetBinding、SecretRef 和角色，不复制原作者凭据或实际授权。
6. Scenario 默认引用同一 Workspace 内已发布的 WorkflowVersion。跨 Workspace 引用必须显式共享、使用不可变版本并独立授权，不继承源 Workspace 的密钥或资源权限。
7. 跨 Workspace 数据协作优先通过 DataAsset 和数据契约表达；跨 Tenant 直接引用不属于核心领域协议。
8. Scenario 整体状态默认取生产 Environment，其他 Environment 的状态在场景详情中查看。
9. 具体 Scenario/Solution 交付范围以阶段计划为准，DS 不直接理解三层模型。

## 背景

只复用单个 Pipeline 无法完整交付一个业务目标。真实场景通常需要多条 Pipeline 协作，并依赖数据源、权限、基础设施和运行环境。直接复制完整项目可能泄露密钥、扩大权限或绑定原作者环境。

## 历史决策（不得直接实施）

1. 曾使用 Project、Scenario、Pipeline 作为固定三层产品模型。
2. Solution 曾定义为项目级版本化模板，包含 Scenario/Pipeline 版本引用及资源需求。
3. 安装 Solution 时由目标用户绑定环境、云资源、数据源、密钥和角色。
4. Scenario 曾定义为包含整体状态、跨 Pipeline 依赖、SLA、失败影响和数据血缘的业务边界。
5. 场景曾只允许引用同一项目内的 PipelineVersion，首版不允许跨项目引用。
6. 默认向业务用户展示 Scenario，向工程师提供 Pipeline 编辑器，向管理员提供 Project/环境绑定。
7. 原阶段安排为 Alpha 预留 Scenario/Solution，再依次实现场景、Solution 安装和共享市场。

## 历史理由与后果（仅作历史记录）

- 三层分别解决运行治理、业务协作和技术执行，比单纯增加 Pipeline 数量更适合业务复用。
- Solution 与环境绑定分离可降低凭据泄露和权限扩大风险。
- 数据契约比单纯任务成功依赖更能覆盖补数据、重试和部分成功。
- Scenario/Solution 的版本、依赖和兼容性模型会增加控制平面复杂度。
- Solution 安装必须提供权限、成本和基础设施审查，不是简单导入 JSON。
