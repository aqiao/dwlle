import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, StatusBadge, Tag } from '../components/UI'

const tools = [
  { name: 'scenario.get_status', description: '获取场景整体状态与阻塞原因', scope: 'scenarios:read', type: '组合查询' },
  { name: 'workflow.get_definition', description: '读取指定版本的 工作流 定义', scope: 'workflows:read', type: '直接服务' },
  { name: 'run.get_logs', description: '获取脱敏并截断的运行日志', scope: 'runs:read', type: '直接服务' },
  { name: 'run.diagnose', description: '获取带证据的只读失败诊断', scope: 'diagnostics:read', type: '组合服务' },
  { name: 'dataset.get_lineage', description: '查询数据集上下游血缘', scope: 'datasets:read', type: '直接服务' },
]

export function Integrations({ onNotify }: { onNotify: (message: string) => void }) {
  const [tab, setTab] = useState('mcp')

  return (
    <div className="page integrations-page">
      <PageHeader eyebrow="开放集成" title="API 与 MCP" description="让外部应用和 AI Agent 通过统一权限与应用服务使用平台能力。" actions={<><Button icon="eye">查看开发文档</Button><Button variant="primary" icon="plus">创建服务账号</Button></>} />
      <div className="integration-endpoints">
        <Card className="endpoint-card"><div className="endpoint-icon rest"><Icon name="code" size={23} /></div><div className="endpoint-copy"><div><h2>公共 REST API</h2><StatusBadge status="success" label="v1 稳定通道" /></div><p>dwlle-web 与外部应用共用同一套领域接口</p><div className="endpoint-url"><code>https://api.dwlle.example/api/v1</code><button aria-label="复制 REST 地址" onClick={() => onNotify('REST 地址已复制')}><Icon name="copy" size={15} /></button></div><div className="endpoint-meta"><span>OpenAPI 3.1</span><span>OAuth 2.0</span><span>幂等键</span></div></div></Card>
        <Card className="endpoint-card"><div className="endpoint-icon mcp"><Icon name="sparkles" size={23} /></div><div className="endpoint-copy"><div><h2>FastMCP Server</h2><StatusBadge status="success" label="只读工具" /></div><p>语义化工具直接调用应用服务，无需组合 HTTP 请求</p><div className="endpoint-url"><code>https://api.dwlle.example/mcp</code><button aria-label="复制 MCP 地址" onClick={() => onNotify('MCP 地址已复制')}><Icon name="copy" size={15} /></button></div><div className="endpoint-meta"><span>Streamable HTTP</span><span>OAuth 2.0</span><span>工具白名单</span></div></div></Card>
      </div>
      <Card className="shared-service-card"><div className="shared-service-title"><Icon name="shield" size={20} /><div><h2>同一应用服务，同一权限边界</h2><p>REST Controller 与 FastMCP Tool 都是薄接入层，不直接访问数据库或执行引擎。</p></div></div><div className="shared-flow"><div><Icon name="code" size={17} /><span>REST Controller</span></div><span className="flow-plus">+</span><div><Icon name="sparkles" size={17} /><span>FastMCP Tools</span></div><Icon name="chevron" size={17} /><div className="application-service"><Icon name="layers" size={17} /><span>Application Services</span></div><Icon name="chevron" size={17} /><div><Icon name="shield" size={17} /><span>统一权限与审计</span></div></div><div className="context-list"><span>tenant</span><span>workspace</span><span>actor</span><span>agent</span><span>scopes</span></div></Card>
      <div className="integration-grid">
        <Card className="tool-list-card">
          <div className="integration-tabs"><button className={tab === 'mcp' ? 'active' : ''} onClick={() => setTab('mcp')}>MCP 工具白名单 <Tag>5</Tag></button><button className={tab === 'rest' ? 'active' : ''} onClick={() => setTab('rest')}>REST 核心资源 <Tag>7</Tag></button></div>
          {tab === 'mcp' ? <div className="tool-list">{tools.map((tool) => <div key={tool.name}><span className="tool-icon"><Icon name="sparkles" size={15} /></span><div><code>{tool.name}</code><p>{tool.description}</p></div><Tag>{tool.type}</Tag><code className="scope-code">{tool.scope}</code><button aria-label={`复制 ${tool.name}`}><Icon name="copy" size={14} /></button></div>)}</div> : <div className="tool-list">{['workspaces', 'scenarios', 'workflows', 'runs', 'datasets', 'diagnoses', 'solutions'].map((resource) => <div key={resource}><span className="tool-icon rest"><Icon name="code" size={15} /></span><div><code>/api/v1/{resource}</code><p>统一分页、错误码、Scope 和审计</p></div><Tag>REST</Tag><code className="scope-code">{resource}:read</code><button aria-label={`复制 ${resource}`}><Icon name="copy" size={14} /></button></div>)}</div>}
        </Card>
        <Card className="agent-access-card"><div className="card-header"><div><h2>Agent 安全边界</h2><p>默认最小权限，敏感操作人工确认</p></div><Icon name="shield" size={19} /></div><div className="access-policy-list"><div><Icon name="check" size={15} /><span><strong>只读查询</strong>场景、工作流、运行、资产和已有诊断</span><Tag tone="green">允许</Tag></div><div><Icon name="check" size={15} /><span><strong>创建草稿</strong>生成 工作流 或修复建议，不直接发布</span><Tag tone="blue">受限</Tag></div><div><Icon name="clock" size={15} /><span><strong>运行与安装</strong>需要用户明确确认和独立 Scope</span><Tag>需审批</Tag></div><div><Icon name="close" size={15} /><span><strong>高风险操作</strong>授权、删除、自动修复和云资源变更</span><Tag>禁止</Tag></div></div><div className="agent-note"><Icon name="alert" size={14} />日志和数据内容按不可信输入处理，防止提示词注入。</div></Card>
      </div>
      <Card className="service-account-card"><div className="card-header"><div><h2>服务账号</h2><p>用于外部应用和 Agent 的机器身份</p></div><Button size="small" icon="plus">新建账号</Button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>名称</th><th>类型</th><th>工作空间</th><th>Scopes</th><th>最近调用</th><th>状态</th></tr></thead><tbody><tr><td><strong>analytics-agent</strong></td><td><Tag tone="purple">AI Agent</Tag></td><td>零售经营分析</td><td><code>runs:read, diagnostics:read</code></td><td>8 分钟前</td><td><StatusBadge status="success" label="启用" /></td></tr><tr><td><strong>ci-publisher</strong></td><td><Tag>外部应用</Tag></td><td>零售经营分析</td><td><code>workflows:read, workflows:write</code></td><td>昨天 18:42</td><td><StatusBadge status="success" label="启用" /></td></tr></tbody></table></div></Card>
    </div>
  )
}
