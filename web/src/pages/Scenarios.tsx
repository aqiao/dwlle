import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Avatar, Button, Card, PageHeader, StatusBadge, Tag } from '../components/UI'

const scenarios = [
  { id: 'fulfillment', name: '订单履约分析', description: '从订单与库存接入到履约宽表和质量检查', status: 'failed' as const, workflows: 4, owner: '陈默', sla: '每天 06:00 前就绪' },
  { id: 'marketing', name: '营销效果分析', description: '活动投放、订单转化与营销日报', status: 'success' as const, workflows: 3, owner: '林夏', sla: '每天 08:30 前就绪' },
  { id: 'customer', name: '客户经营分析', description: '客户主数据、画像和生命周期分析', status: 'running' as const, workflows: 5, owner: '周宁', sla: '每小时更新' },
]

const workflowFlow = [
  { name: '订单每日入湖', engine: 'SeaTunnel', status: 'success', time: '02:00 · 12m', output: 'raw.shop_orders' },
  { name: '库存每日入湖', engine: 'SeaTunnel', status: 'success', time: '02:10 · 8m', output: 'raw.inventory' },
  { name: '履约宽表加工', engine: 'Trino SQL', status: 'failed', time: '04:00 · 4m', output: 'curated.fulfillment' },
  { name: '履约质量检查', engine: 'Quality', status: 'paused', time: '等待上游契约', output: 'quality.fulfillment' },
]

export function Scenarios({ onOpenWorkflow, onNotify }: { onOpenWorkflow: (id: string) => void; onNotify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState('fulfillment')
  const selected = scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0]

  return (
    <div className="page scenarios-page">
      <PageHeader eyebrow="日常工作" title="业务场景" description="围绕业务目标组织 工作流、数据契约和整体 SLA。" actions={<><Button icon="download">导入场景</Button><Button variant="primary" icon="plus">新建场景</Button></>} />
      <div className="scenario-workspace-bar"><div><span className="workspace-symbol"><Icon name="layers" size={19} /></span><div><span>所属工作空间</span><strong>零售经营分析</strong></div><Tag tone="blue">生产环境</Tag></div><div><span>场景</span><strong>3</strong><span>工作流</span><strong>12</strong><span>数据源</span><strong>3</strong></div></div>
      <div className="scenario-layout">
        <div className="scenario-list">
          {scenarios.map((scenario) => <button key={scenario.id} className={selectedId === scenario.id ? 'active' : ''} onClick={() => setSelectedId(scenario.id)}>
            <div className="scenario-list-top"><StatusBadge status={scenario.status} /><span>{scenario.workflows} 条 工作流</span></div><strong>{scenario.name}</strong><p>{scenario.description}</p><div className="scenario-list-meta"><span><Avatar name={scenario.owner} size="small" />{scenario.owner}</span><span><Icon name="clock" size={13} />{scenario.sla}</span></div>
          </button>)}
          <div className="scenario-list-tip"><Icon name="sparkles" size={16} /><p>场景回答“业务是否就绪”，工作流 回答“任务如何执行”。</p></div>
        </div>
        <div className="scenario-detail">
          <Card className="scenario-overview">
            <div className="scenario-title-row"><div><div className="scenario-title"><h2>{selected.name}</h2><StatusBadge status={selected.status} /></div><p>{selected.description}</p></div><div className="page-actions"><Button icon="settings">场景设置</Button><Button variant="primary" icon="play" onClick={() => onNotify(`${selected.name} 已加入运行队列（原型）`)}>运行场景</Button></div></div>
            <div className="scenario-kpis"><div><span>整体状态</span><strong className="text-danger">部分失败</strong></div><div><span>工作流</span><strong>2 成功 · 1 失败 · 1 阻塞</strong></div><div><span>业务 SLA</span><strong>{selected.sla}</strong></div><div><span>负责人</span><strong>{selected.owner}</strong></div></div>
          </Card>
          <Card className="scenario-flow-card">
            <div className="card-header"><div><h2>跨 工作流 依赖</h2><p>通过数据契约协调，而不只是上游任务成功</p></div><div className="scenario-legend"><span><i className="contract-dot" />数据契约</span><Button variant="ghost" size="small">编辑依赖</Button></div></div>
            <div className="scenario-flow">
              <div className="scenario-parallel">
                {workflowFlow.slice(0, 2).map((workflow) => <button className="scenario-workflow-node node-success" key={workflow.name} onClick={() => onOpenWorkflow('p-001')}><span className="scenario-node-icon"><Icon name="database" size={19} /></span><span><strong>{workflow.name}</strong><small>{workflow.engine} · {workflow.time}</small><code>{workflow.output}</code></span><StatusBadge status="success" /></button>)}
              </div>
              <div className="scenario-contract"><Icon name="shield" size={15} /><span><strong>数据契约</strong>orders + inventory 当天分区就绪，质量通过，新鲜度 &lt; 2h</span><Tag tone="green">已满足</Tag></div>
              <div className="scenario-downstream">
                {workflowFlow.slice(2).map((workflow) => <button className={`scenario-workflow-node node-${workflow.status}`} key={workflow.name} onClick={() => onOpenWorkflow('p-001')}><span className="scenario-node-icon"><Icon name={workflow.engine === 'Quality' ? 'quality' : 'sql'} size={19} /></span><span><strong>{workflow.name}</strong><small>{workflow.engine} · {workflow.time}</small><code>{workflow.output}</code></span><StatusBadge status={workflow.status as 'failed'} /></button>)}
              </div>
            </div>
          </Card>
          <div className="scenario-bottom-grid">
            <Card className="scenario-contracts-card"><div className="card-header"><div><h2>业务就绪条件</h2><p>场景完成需要满足的全部契约</p></div><Tag>3 项</Tag></div><div className="business-contract-list"><div><Icon name="check" size={15} /><span><strong>订单与库存数据已就绪</strong><small>当天分区存在且行数波动 &lt; 30%</small></span><Tag tone="blue">通过</Tag></div><div><Icon name="close" size={15} /><span><strong>履约宽表转换成功</strong><small>Join 阶段内存溢出，等待修复</small></span><Tag>失败</Tag></div><div><Icon name="clock" size={15} /><span><strong>12 项质量规则通过</strong><small>等待上游宽表生成</small></span><Tag>阻塞</Tag></div></div></Card>
            <Card className="scenario-impact-card"><div className="card-header"><div><h2>失败影响</h2><p>AI 根据场景血缘分析</p></div><Icon name="sparkles" size={18} /></div><div className="impact-summary"><span>1</span><p>个业务场景受影响</p></div><ul><li>履约日报无法按时生成</li><li>下游 3 个数据集暂停更新</li><li>订单与库存原始数据不受影响</li></ul><Button size="small" icon="sparkles">查看 AI 诊断</Button></Card>
          </div>
        </div>
      </div>
    </div>
  )
}
