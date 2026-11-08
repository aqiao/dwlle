# 架构与 ADR 一致性复核报告（第二轮）

## 摘要结论

本次只完整审阅 `docs/ARCHITECTURE.md`、`docs/adr/README.md` 及 `docs/adr/0001-0017`，未查阅任务、计划、README、代码、部署文件或先前审查报告。发现 **2 项仍会改变实现对象关系或安装生命周期的现行文档冲突**，均集中在 ADR-0014 与架构/ADR-0011 的 Workspace、Environment、Scenario 和 Solution 表述。

上一轮重点的四项均已得到实质处理：

1. **ADR-0003 历史指令：已处理。** 现行有效约束明确 DS 运行于 Kubernetes 数据平面、仅由 dwlle 单向编译、DS UI 不向客户开放、不会交付 StarRocks 专属节点；Docker Compose/App 节点、共享 RDS 的具体历史部署方案和客户 DS UI 被划为不得直接实施的历史记录。保留的 RDS PostgreSQL 与 JDBC registry 约束也已单列。
2. **ADR-0004 Superset：已处理。** Superset 部署、Embedded SDK 和 guest token 均被明确降为历史或未来另建 ADR 的可选方案；现行约束要求自研 React/Monaco/Trino SQL IDE、禁止 iframe，并规定 Superset 不必装且不是默认客户路径。
3. **ADR-0011/0012/0013 术语、服务、身份和导航：大部分已处理，但 ADR-0014 留有本报告所列两项对象关系冲突。** ADR 索引和各 ADR 的现行声明已明确 Project/Pipeline 仅为历史术语，当前为 Workspace/Workflow；服务名、`tenant + workspace + actor + agent + scopes` 身份上下文以及三项主导航均已明确。
4. **ADR-0010 SeaTunnel Alpha 范围：已处理。** ADR-0010 的现行范围与架构阶段表一致，Alpha 是 Trino SQL 与质量检查，SeaTunnel 属于 Beta；原先包含 SeaTunnel 的首版节点文字已明确为不可实施的历史记录。

除下列两项外，当前有效 ADR 与架构对控制面/数据面、分区兼容和离线制品、安全与数据保留、DolphinScheduler 与自有 UI、SQL/BI、身份权限、OpenMetadata 唯一血缘权威、REST/MCP 边界及阶段范围的表述没有发现可由这些文档直接证实的实质冲突。

## 证据与发现

### 1. [高] Solution 安装的目标对象相互矛盾

**文件与行号**

- `docs/adr/0014-workspace-terminology.md:23`
- `docs/ARCHITECTURE.md:22, 165, 168, 172-174`
- `docs/adr/0011-solution-scenario-pipeline.md:14-18`（现行有效约束第 4、5 条）

**相互冲突的证据**

- ADR-0014:23 的已接受“决策”规定：Solution 是 Workspace 级共享模板，安装是在指定 **Tenant 中创建或升级 Workspace 实例**。
- 架构将 Solution 定义为锁定 Scenario、Workflow 和组件版本的 **Workspace 级可共享模板**（165、181）；安装过程则是检查、审批、**环境绑定**和部署验证（22、172），模板生命周期是“安装到指定环境 → 工作空间企业实例”（174）。
- ADR-0011 的现行有效约束进一步规定，Solution 安装时由目标管理员绑定和批准 **环境、资源、DataAssetBinding、SecretRef 和角色**，而不是创建或升级 Workspace。

**实际影响**

实施者无法确定安装 API、数据库聚合根和权限检查是以“新建/升级 Workspace”为结果，还是在既有 Workspace 的指定 Environment 创建企业实例。前者会让安装流程意外创建或改变协作边界、成员关系、环境与基础设施；后者符合架构和 ADR-0011 的环境绑定与凭据隔离模型。这是资源边界与授权对象的实质差异。

**最小文档修复建议**

修改 ADR-0014:23，使其与架构和 ADR-0011 一致：Solution 是 Workspace 级模板，安装在指定既有 Workspace 的目标 Environment 创建或升级企业实例，并由目标管理员完成环境、资源、DataAssetBinding、SecretRef 和角色绑定。若产品实际要允许“从 Solution 新建 Workspace”，应另列为显式可选工作流，定义其成员、环境、资源和权限初始化规则，而不是以当前一句话隐含改变默认安装语义。

### 2. [中] ADR-0014 的“统一领域层级”仍把 Environment 放在 Scenario/Workflow 的父链上

**文件与行号**

- `docs/adr/0014-workspace-terminology.md:14-20, 27`
- `docs/adr/0015-workflow-terminology.md:13-15`
- `docs/ARCHITECTURE.md:15, 21-22, 151-165, 190-198`
- `docs/adr/0011-solution-scenario-pipeline.md:10-18`

**相互冲突的证据**

- ADR-0014:14 将“统一领域层级”写为 `Tenant → Workspace → Environment → Scenario → Pipeline → TaskNode`；ADR-0015:13-15 又将同一顺序替换为 `Tenant → Workspace → Environment → Scenario → Workflow → TaskNode`。
- 架构:15、21 表示三层业务抽象为 `Tenant、Workspace、Scenario`，Environment 是 Workspace 内的开发、测试、生产运行上下文；架构对象图:151-165 也将 Environment 和 Scenario 都置于 Workspace 下，并将 WorkflowVersion 置于 Scenario 下。
- ADR-0011 的现行约束:10-18 同样规定 Workspace 是边界、Environment 是 Workspace 内运行上下文，Scenario 组织 Workflow；其顶部现行声明还明确“当前三层业务抽象为 Tenant、Workspace、Scenario，Workflow 是执行对象，Environment 是运行上下文”。
- ADR-0014:27 声称自己是历史 ADR 的“最新术语基线”，因此其旧层级不会自然被实施者忽略。

**实际影响**

按 ADR-0014/0015 的箭头实现，会把 Scenario 与 Workflow 放入某个 Environment，进而使业务协作对象和其版本定义依赖开发、测试或生产环境。按架构/ADR-0011 实现，则 Scenario/Workflow 定义属于 Workspace，Environment 只在发布、资源/密钥绑定和运行时选择。两种模型会产生不同的主键归属、REST 路由、发布与跨环境复用规则，也会影响避免测试/生产密钥混用的实现。

**最小文档修复建议**

在 ADR-0014:14 和 ADR-0015:13 将“领域层级”改为能够表达并列从属关系的现行模型，例如 `Tenant → Workspace → {Environment, Scenario → Workflow → TaskNode}`，并在 ADR-0014 中把“最新术语基线”的范围限制为 Project→Workspace 的术语替换。这样保留两份 ADR 的命名决策，同时把对象归属、定义与环境绑定分离统一到架构和 ADR-0011。

## 已核实的一致性证据

- **控制面与数据面：** 架构:14、42-61 将自研控制平面与 Kubernetes 开源数据平面分离；ADR-0009:19-55 作出同一决定，并限定 AWS 是首个基础设施适配器。
- **分区、离线制品与安全保留：** ADR-0001:5 仅保留 aws/aws-cn 兼容、无硬编码分区 ARN/域名与双分区 synth；ADR-0006:9-15 要求制品经 artifacts bucket/ECR、禁止公网 curl；架构:250-259、283-286 对应规定 Secrets Manager、无公网管理入口、默认保留数据卷/S3/RDS 与预置制品。
- **DolphinScheduler 与客户 UI：** ADR-0003:5-15、ADR-0010:10-17 与架构:123-125、214-224 一致地规定 DS 是后台受控执行引擎，客户使用自研 UI，DS 定义不反向同步，DS UI 仅限内部管理员。
- **SQL/BI：** ADR-0004:10-14 与架构:87-88、114-115、250-256 一致地规定自研 SQL IDE、Trino 限制、Workspace 权限校验、无 iframe，且 Superset 并非默认路径。
- **身份、API/MCP：** ADR-0012:11-18 和架构:215-233 一致采用公共 `/api/v1`、共享应用服务、语义化 MCP 白名单和交集权限的统一身份上下文；ADR-0016:13-21 与架构:90、247-255 一致采用 Keycloak 仅做 OIDC 身份、dwlle 管理 Workspace 角色。
- **OpenMetadata：** ADR-0017:12-24 与架构:237-245、276-281 一致规定 OpenMetadata 是 LineageEdge 唯一权威，dwlle 只通过受控适配器和可重建缓存访问，QualityRule/QualityResult 仍由 dwlle 权威管理。
- **阶段边界：** 架构:68-76 与 ADR-0010:6-17 一致规定 Alpha 的 Trino SQL/质量检查和 Beta 的 SeaTunnel；架构:76、ADR-0017:33-34 也一致规定 Alpha 不建立独立权威血缘库、Beta 验证 OpenMetadata 端到端路径。

## 结论与建议

应先修正上述两处 ADR-0014 表述，再将其作为后续实现和任务分解的基线。修复不需要改变已确定的架构，只需让 ADR-0014/0015 的层级图和 Solution 安装句子对齐架构与 ADR-0011 的现行模型。

仅凭本次允许审阅的架构与 ADR 文本，无法判断这些文档是否已被代码、API、数据库模型、阶段计划或部署清单正确实现，也无法判断 Superset 的未来外链集成、跨 Workspace 共享或“从模板创建 Workspace”是否会被产品选择为后续能力；这些事项不在本次审查可证实的范围内。
