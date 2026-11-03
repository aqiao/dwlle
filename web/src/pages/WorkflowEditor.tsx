import { useMemo, useState } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { Button, StatusBadge, Tag } from '../components/UI'

interface WorkflowEditorProps {
  workflowId: string
  onBack: () => void
  onNotify: (message: string) => void
}

interface DagNode {
  id: string
  title: string
  subtitle: string
  type: string
  icon: IconName
  x: number
  y: number
  status: 'success' | 'running' | 'failed' | 'draft'
}

const initialNodes: DagNode[] = [
  { id: 'source', title: '读取业务订单', subtitle: 'MySQL · shop_orders', type: 'mysql', icon: 'database', x: 70, y: 205, status: 'success' },
  { id: 'ingest', title: '订单批量入湖', subtitle: 'SeaTunnel · 全量 / 追加', type: 'seatunnel', icon: 'layers', x: 330, y: 205, status: 'success' },
  { id: 'transform', title: '标准订单转换', subtitle: 'Trino SQL · dwd_orders', type: 'trino', icon: 'sql', x: 590, y: 205, status: 'running' },
  { id: 'quality', title: '订单质量检查', subtitle: '非空 · 唯一 · 行数', type: 'quality', icon: 'quality', x: 850, y: 205, status: 'draft' },
  { id: 'notify', title: '运行结果通知', subtitle: '企业微信 · 数据运营群', type: 'notify', icon: 'bell', x: 590, y: 410, status: 'draft' },
]

const edges = [
  ['source', 'ingest'], ['ingest', 'transform'], ['transform', 'quality'], ['transform', 'notify'],
]

const library = [
  { category: '数据接入', items: [
    { type: 'mysql', title: 'MySQL 读取', subtitle: '批量读取业务库', icon: 'database' as IconName },
    { type: 'postgresql', title: 'PostgreSQL 读取', subtitle: '批量读取业务库', icon: 'database' as IconName },
    { type: 'seatunnel', title: 'SeaTunnel 入湖', subtitle: '写入 S3 Iceberg', icon: 'layers' as IconName },
  ] },
  { category: '数据开发', items: [
    { type: 'trino', title: 'Trino SQL', subtitle: '查询与数据转换', icon: 'sql' as IconName },
    { type: 'quality', title: '数据质量检查', subtitle: '非空、唯一和阈值', icon: 'quality' as IconName },
  ] },
  { category: '通用', items: [
    { type: 'notify', title: '结果通知', subtitle: '邮件或企业微信', icon: 'bell' as IconName },
  ] },
]

export function WorkflowEditor({ workflowId, onBack, onNotify }: WorkflowEditorProps) {
  const [nodes, setNodes] = useState(initialNodes)
  const [selectedId, setSelectedId] = useState('transform')
  const [search, setSearch] = useState('')
  const [published, setPublished] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [configOpen, setConfigOpen] = useState(true)
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0]

  const visibleLibrary = useMemo(() => library.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())),
  })).filter((group) => group.items.length > 0), [search])

  const addNode = (item: { type: string; title: string; subtitle: string; icon: IconName }) => {
    const id = `${item.type}-${nodes.length + 1}`
    const node: DagNode = { ...item, id, x: 330 + (nodes.length % 3) * 80, y: 45, status: 'draft' }
    setNodes((current) => [...current, node])
    setSelectedId(id)
    setConfigOpen(true)
    onNotify(`已添加「${item.title}」节点`)
  }

  const publish = () => {
    setPublished(true)
    setShowPublish(false)
    onNotify('工作流 v9 发布成功（原型）')
  }

  return (
    <div className="editor-page">
      <div className="editor-header">
        <div className="editor-title">
          <button className="icon-button" aria-label="返回 工作流 列表" onClick={onBack}><Icon name="back" /></button>
          <div><div className="editor-name"><h1>电商订单每日入湖</h1><StatusBadge status={published ? 'success' : 'draft'} label={published ? '已发布 v9' : '草稿有修改'} /></div><p>零售经营分析 / 订单履约分析 · ID: {workflowId} · 自动保存于 09:42:18</p></div>
        </div>
        <div className="editor-actions">
          <Button icon="eye">预览</Button>
          <Button icon="play" onClick={() => onNotify('已创建一次手动运行（原型）')}>试运行</Button>
          <Button variant="primary" icon="check" onClick={() => setShowPublish(true)}>发布 工作流</Button>
          <button className="icon-button" aria-label="更多编辑器操作"><Icon name="more" /></button>
        </div>
      </div>
      <div className="editor-meta">
        <div><span>工作空间</span><strong>零售经营分析</strong></div><div><span>场景</span><strong>订单履约分析</strong></div><div><span>环境</span><strong><i className="env-dot" />生产环境</strong></div><div><span>调度</span><strong><Icon name="calendar" size={14} />每天 02:00</strong></div><div><span>负责人</span><strong>陈默</strong></div>
        <button onClick={() => onNotify('调度设置已打开（原型）')}><Icon name="settings" size={15} />调度设置</button>
      </div>
      <div className={`editor-workspace ${configOpen ? '' : 'config-collapsed'}`}>
        <aside className="component-panel">
          <div className="panel-heading"><strong>组件库</strong><Tag>{library.reduce((sum, group) => sum + group.items.length, 0)}</Tag></div>
          <label className="component-search"><Icon name="search" size={16} /><input aria-label="搜索组件" placeholder="搜索组件" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="component-list">
            {visibleLibrary.map((group) => (
              <div className="component-group" key={group.category}>
                <div className="component-category">{group.category}<Icon name="arrowDown" size={13} /></div>
                {group.items.map((item) => (
                  <button className="component-item" key={item.type} onClick={() => addNode(item)}>
                    <span className={`component-icon component-${item.type}`}><Icon name={item.icon} size={18} /></span>
                    <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                    <Icon name="plus" size={15} />
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="component-tip"><Icon name="sparkles" size={15} /><span>不知道如何选择？<button>让 AI 帮你编排</button></span></div>
        </aside>

        <section className="dag-area" aria-label="工作流 DAG 编辑器">
          <div className="canvas-toolbar">
            <div><button className="active" aria-label="选择模式"><Icon name="workflow" size={16} /></button><button aria-label="连线模式"><Icon name="link" size={16} /></button><span /></div>
            <div><button aria-label="撤销"><Icon name="back" size={16} /></button><button aria-label="刷新画布"><Icon name="refresh" size={16} /></button><span /><button aria-label="全屏"><Icon name="eye" size={16} /></button></div>
          </div>
          <div className="dag-canvas">
            <div className="dag-canvas-inner">
              <svg className="dag-edges" width="1120" height="600" aria-hidden="true">
                <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#9aa9c7" /></marker></defs>
                {edges.map(([fromId, toId]) => {
                  const from = nodes.find((node) => node.id === fromId)
                  const to = nodes.find((node) => node.id === toId)
                  if (!from || !to) return null
                  const x1 = from.x + 184
                  const y1 = from.y + 43
                  const x2 = to.x
                  const y2 = to.y + 43
                  const middle = (x1 + x2) / 2
                  return <path key={`${fromId}-${toId}`} d={`M${x1} ${y1} C${middle} ${y1},${middle} ${y2},${x2} ${y2}`} fill="none" stroke="#9aa9c7" strokeWidth="1.8" markerEnd="url(#arrow)" />
                })}
              </svg>
              {nodes.map((node) => (
                <button
                  key={node.id}
                  className={`dag-node ${selectedId === node.id ? 'dag-node-selected' : ''} dag-node-${node.status}`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => { setSelectedId(node.id); setConfigOpen(true) }}
                >
                  <span className={`dag-node-icon component-${node.type}`}><Icon name={node.icon} size={20} /></span>
                  <span className="dag-node-copy"><strong>{node.title}</strong><small>{node.subtitle}</small></span>
                  <span className={`node-state node-state-${node.status}`}>{node.status === 'success' ? <Icon name="check" size={12} /> : node.status === 'running' ? <span className="mini-spinner" /> : <Icon name="edit" size={11} />}</span>
                  <span className="node-port node-port-left" /><span className="node-port node-port-right" />
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-status"><span><i className="status-dot-success" />已验证 4 个节点</span><span>共 {nodes.length} 个节点 · {edges.length} 条依赖</span></div>
          <div className="canvas-controls"><button aria-label="放大"><Icon name="plus" size={16} /></button><span>100%</span><button aria-label="缩小">−</button><button aria-label="适应画布"><Icon name="zoom" size={16} /></button></div>
          <div className="mini-map"><div className="mini-map-flow"><i /><i /><i /><i /></div><span /></div>
        </section>

        {configOpen && <aside className="config-panel">
          <div className="config-heading"><div><strong>节点配置</strong><Tag tone="blue">{selected.type}</Tag></div><button className="icon-button" aria-label="关闭节点配置" onClick={() => setConfigOpen(false)}><Icon name="close" size={17} /></button></div>
          <div className="config-selected-node"><span className={`component-icon component-${selected.type}`}><Icon name={selected.icon} size={20} /></span><div><strong>{selected.title}</strong><small>{selected.id}</small></div></div>
          <div className="config-tabs"><button className="active">基本配置</button><button>运行设置</button><button>输出</button></div>
          <div className="config-form">
            <label>节点名称<input value={selected.title} onChange={(event) => setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, title: event.target.value } : node))} /></label>
            {selected.type === 'trino' ? <>
              <label>Trino 连接<select><option>trino-production</option><option>trino-dev</option></select></label>
              <label>目标 Catalog<select><option>iceberg</option><option>hive</option></select></label>
              <label>SQL 语句<textarea className="sql-config-input" defaultValue={'CREATE TABLE iceberg.curated.dwd_orders AS\nSELECT\n  order_id,\n  customer_id,\n  amount,\n  updated_at\nFROM iceberg.raw.shop_orders\nWHERE amount >= 0'} /></label>
              <div className="form-row"><label>超时时间<div className="input-suffix"><input defaultValue="300" /><span>秒</span></div></label><label>结果行数<div className="input-suffix"><input defaultValue="1000" /><span>行</span></div></label></div>
            </> : selected.type === 'quality' ? <>
              <label>目标数据表<select><option>iceberg.curated.dwd_orders</option></select></label>
              <div className="quality-rule-list"><div><Icon name="check" size={15} /><span>order_id 非空</span><button aria-label="删除规则"><Icon name="close" size={13} /></button></div><div><Icon name="check" size={15} /><span>order_id 唯一</span><button aria-label="删除规则"><Icon name="close" size={13} /></button></div><div><Icon name="check" size={15} /><span>行数波动 &lt; 30%</span><button aria-label="删除规则"><Icon name="close" size={13} /></button></div></div>
              <Button icon="plus" size="small">添加质量规则</Button>
            </> : <>
              <label>数据源连接<select><option>{selected.type === 'mysql' ? 'mysql-shop-production' : '默认连接'}</option></select></label>
              <label>执行模式<select><option>追加写入</option><option>全量覆盖</option></select></label>
              <label>目标数据表<input defaultValue="iceberg.raw.shop_orders" /></label>
              <label>任务描述<textarea defaultValue={selected.subtitle} /></label>
            </>}
            <div className="config-divider" />
            <div className="toggle-row"><div><strong>失败时重试</strong><small>节点失败后自动重试</small></div><button className="toggle toggle-on" aria-label="关闭失败重试"><span /></button></div>
            <div className="form-row"><label>重试次数<select><option>3 次</option><option>1 次</option></select></label><label>重试间隔<select><option>60 秒</option><option>300 秒</option></select></label></div>
          </div>
          <div className="config-footer"><Button variant="ghost" size="small">删除节点</Button><Button variant="primary" size="small" onClick={() => onNotify('节点配置已保存')}>保存配置</Button></div>
        </aside>}
      </div>
      {showPublish && <div className="modal-backdrop" role="presentation" onClick={() => setShowPublish(false)}>
        <section className="modal publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={(event) => event.stopPropagation()}>
          <div className="modal-icon success"><Icon name="check" size={26} /></div>
          <h2 id="publish-title">发布 工作流 v9</h2><p>发布后将按照“每天 02:00”的调度配置运行。</p>
          <div className="publish-checks"><div><Icon name="check" size={16} /><span>节点结构校验通过</span><strong>{nodes.length} 个节点</strong></div><div><Icon name="check" size={16} /><span>数据源权限校验通过</span><strong>2 个连接</strong></div><div><Icon name="check" size={16} /><span>资源与超时限制已配置</span><strong>符合要求</strong></div></div>
          <label className="publish-note">版本说明<textarea defaultValue="优化标准订单转换逻辑，增加质量检查。" /></label>
          <div className="modal-actions"><Button onClick={() => setShowPublish(false)}>取消</Button><Button variant="primary" icon="check" onClick={publish}>确认发布</Button></div>
        </section>
      </div>}
    </div>
  )
}
