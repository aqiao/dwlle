import { useMemo, useState } from 'react'
import { workflows } from '../data'
import { Icon } from '../components/Icon'
import { Avatar, Button, Card, PageHeader, StatusBadge, Tag } from '../components/UI'

interface WorkflowsProps {
  onOpen: (id: string) => void
  onNotify: (message: string) => void
}

export function Workflows({ onOpen, onNotify }: WorkflowsProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const filtered = useMemo(() => workflows.filter((workflow) => {
    const matchesQuery = `${workflow.name}${workflow.description}${workflow.owner}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'all' || workflow.status === status)
  }), [query, status])

  return (
    <div className="page workflows-page">
      <PageHeader
        eyebrow="日常工作"
        title="工作流"
        description="编排、发布和监控你的数据工作流。"
        actions={<><Button icon="download">导入模板</Button><Button variant="primary" icon="plus" onClick={() => onOpen('p-001')}>新建 工作流</Button></>}
      />
      <div className="summary-strip">
        <div><span className="summary-icon blue"><Icon name="workflow" /></span><p>全部 工作流<strong>32</strong></p></div>
        <div><span className="summary-icon green"><Icon name="check" /></span><p>已发布<strong>27</strong></p></div>
        <div><span className="summary-icon orange"><Icon name="clock" /></span><p>定时运行<strong>18</strong></p></div>
        <div><span className="summary-icon red"><Icon name="alert" /></span><p>运行异常<strong>3</strong></p></div>
      </div>
      <Card className="list-card">
        <div className="list-toolbar">
          <div className="toolbar-left">
            <label className="table-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、描述或负责人" aria-label="搜索 工作流" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="按状态筛选">
              <option value="all">全部状态</option><option value="running">运行中</option><option value="success">成功</option><option value="failed">失败</option><option value="paused">已暂停</option><option value="draft">草稿</option>
            </select>
            <Button icon="filter" size="small">更多筛选</Button>
          </div>
          <div className="toolbar-right"><span>共 {filtered.length} 条</span><button className="icon-button" aria-label="刷新列表"><Icon name="refresh" size={17} /></button></div>
        </div>
        <div className="table-wrap">
          <table className="data-table workflow-table">
            <thead><tr><th>工作流 名称</th><th>状态</th><th>调度</th><th>负责人</th><th>最近运行</th><th>耗时</th><th aria-label="操作" /></tr></thead>
            <tbody>
              {filtered.map((workflow) => (
                <tr key={workflow.id}>
                  <td>
                    <button className="workflow-name-cell" onClick={() => onOpen(workflow.id)}>
                      <span className="workflow-list-icon"><Icon name="workflow" size={19} /></span>
                      <span><strong>{workflow.name}</strong><small>{workflow.description}</small><span className="tag-row">{workflow.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}<Tag>{workflow.nodes} 个节点</Tag></span></span>
                    </button>
                  </td>
                  <td><StatusBadge status={workflow.status} /></td>
                  <td><span className="schedule-cell"><Icon name="calendar" size={15} />{workflow.schedule}</span></td>
                  <td><span className="owner-cell"><Avatar name={workflow.owner} size="small" />{workflow.owner}</span></td>
                  <td>{workflow.lastRun}</td><td>{workflow.duration}</td>
                  <td><div className="row-actions"><button className="icon-button" aria-label={`运行 ${workflow.name}`} onClick={() => onNotify(`${workflow.name} 已加入运行队列（原型）`)}><Icon name="play" size={17} /></button><button className="icon-button" aria-label={`${workflow.name} 更多操作`}><Icon name="more" size={18} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state"><Icon name="search" size={28} /><strong>没有匹配的 工作流</strong><p>请尝试调整搜索词或状态筛选。</p></div>}
        </div>
        <div className="pagination"><span>每页 20 条</span><div><button disabled><Icon name="back" size={15} /></button><button className="active">1</button><button>2</button><button><Icon name="chevron" size={15} /></button></div></div>
      </Card>
    </div>
  )
}
