# 0010 客户可见界面全部由 dwlle 自研

状态：已接受（阶段范围由架构与阶段计划覆盖）
日期：2026-11-02

> 现行架构声明（2026-11-08）：现行可执行约束单独列于下节。原文首版节点类型和 2026 年 11 月范围仅保留作历史记录，不得直接实施；当前 Alpha 为 Trino SQL 和质量检查，SeaTunnel 属于 Beta，后续节点由架构和阶段计划决定。

## 现行有效约束

1. 客户可见界面 100% 由 dwlle-web 提供，包括 Workspace、DataAsset、Workflow DAG、SQL IDE、质量、运行中心、日志、告警、AI 诊断和管理页面。
2. 不使用 iframe，不向客户提供 DS 或 OpenMetadata 深链接，不要求客户登录开源产品完成任何产品流程。
3. DS 原生 UI 仅限内部管理员紧急排障；OpenMetadata 原生 UI 仅限内部管理员受控血缘管理。普通用户和客户管理员无直接访问权限。
4. 所有 DS API 调用集中在 dwlle-api 的 DS client，前端不直接访问 DS，DS Token 不下发到浏览器。
5. dwlle WorkflowVersion 是定义事实来源，由编译器单向生成 DS 工作流，DS 定义不反向同步。
6. 基础 DAG 支持串行、并行分支、汇合、节点配置、校验、草稿、版本、发布和回滚。
7. 节点配置由组件注册表中的参数 Schema、输入输出约束和引擎要求驱动，前后端共用校验规则。
8. 节点交付范围由阶段计划决定：Alpha 为 Trino SQL 和质量检查，SeaTunnel 为 Beta。复杂依赖、子工作流、补数据、复杂日历和 Worker 分组属于扩展能力。

## 背景

ADR-0008 为缩短 MVP 周期，将 DAG 画布、复杂依赖、补数据和告警等操作留在 DolphinScheduler 原生界面。新的产品要求是所有客户可见界面均由 dwlle 提供，以保证统一交互、权限、审计、AI 运维和 UI 定制能力。

DolphinScheduler 的 UI 与调度引擎可以分离。自研 UI 不意味着重新实现调度能力，也不意味着首版必须复刻 DS 的全部功能。

## 历史决策（不得直接实施）

1. 客户可见界面 100% 由 dwlle-web 提供，包括项目、数据源、Pipeline DAG、SQL IDE、数据资产、质量、运行中心、日志、告警、AI 诊断和管理页面。
2. DolphinScheduler 只作为后台执行引擎，不使用 iframe，不向客户提供 DS 深链接。
3. DS 原生 UI 仅限内部管理员紧急排障。
4. 所有 DS API 调用集中在 dwlle-api 的 DS client。
5. dwlle Pipeline 是定义事实来源，由编译器单向生成 DS 工作流。
6. 首版自研简单 DAG，节点曾限定为 SeaTunnel、Trino SQL、质量检查和通知等 P0 类型。
7. 节点配置由组件元数据驱动。
8. 复杂能力曾被排除在 2026 年 11 月 Alpha 之外。

## 历史理由与后果（仅作历史记录）

- 自研 UI 是统一体验、AI 辅助和后续组件市场的必要基础。
- 保持 DS 在后台可复用成熟调度能力，同时避免两套权限、审计和定义来源。
- 自有 Workflow 编译器必须处理版本映射、状态一致性和 DS API 升级。
- DS 管理员的紧急修改可能造成定义漂移，必须尽量禁止并建立恢复流程。
- 本 ADR 取代 ADR-0008；其中 dwlle-web 主路径和 DS client 集中封装原则被保留并强化。
