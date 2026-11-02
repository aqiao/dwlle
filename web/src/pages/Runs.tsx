import { useState } from 'react'
import { runs } from '../data'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, StatusBadge, Tag } from '../components/UI'

export function Runs({ onNotify }: { onNotify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(runs[0].id)
  const [showAi, setShowAi] = useState(true)
  const [logTab, setLogTab] = useState('error')
  const selected = runs.find((run) => run.id === selectedId) ?? runs[0]
  const failed = selected.status === 'failed'

  return (
    <div className="page runs-page">
      <PageHeader eyebrow="运维中心" title="运行中心" description="查看运行实例、定位失败原因并跟踪任务恢复。" actions={<><Button icon="download">导出日志</Button><Button icon="refresh">刷新状态</Button></>} />
      <div className="run-stat-grid">
        <Card><span className="run-stat-icon blue"><Icon name="runs" /></span><div><p>今日运行</p><strong>128</strong><small>较昨日 +12</small></div></Card>
        <Card><span className="run-stat-icon green"><Icon name="check" /></span><div><p>成功实例</p><strong>121</strong><small>成功率 94.5%</small></div></Card>
        <Card><span className="run-stat-icon orange"><Icon name="clock" /></span><div><p>运行中</p><strong>4</strong><small>平均 12m 08s</small></div></Card>
        <Card><span className="run-stat-icon red"><Icon name="alert" /></span><div><p>失败实例</p><strong>3</strong><small>待处理 2 条</small></div></Card>
      </div>
      <Card className="list-card run-list-card">
        <div className="list-toolbar"><div className="toolbar-left"><label className="table-search"><Icon name="search" size={17} /><input aria-label="搜索运行实例" placeholder="搜索实例 ID 或 Pipeline" /></label><select aria-label="运行状态"><option>全部状态</option><option>失败</option><option>运行中</option><option>成功</option></select><Button icon="calendar" size="small">今天</Button></div><span className="muted-text">自动刷新 · 30s</span></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>实例 / Pipeline</th><th>状态</th><th>开始时间</th><th>耗时</th><th>触发方式</th><th>处理行数</th><th>版本</th></tr></thead><tbody>
          {runs.map((run) => <tr key={run.id} className={`clickable-row ${selectedId === run.id ? 'selected-row' : ''}`} onClick={() => { setSelectedId(run.id); setShowAi(run.status === 'failed') }}><td><div className="run-name-cell"><strong>{run.pipeline}</strong><small>{run.id}</small></div></td><td><StatusBadge status={run.status} /></td><td>{run.startedAt}</td><td>{run.duration}</td><td>{run.trigger}</td><td>{run.rows}</td><td><Tag>{run.version}</Tag></td></tr>)}
        </tbody></table></div>
      </Card>

      <Card className="run-detail-card">
        <div className="run-detail-header">
          <div><div className="run-detail-title"><h2>{selected.pipeline}</h2><StatusBadge status={selected.status} /></div><p>{selected.id} · {selected.startedAt} · {selected.version}</p></div>
          <div className="page-actions">{failed && <Button variant="primary" icon="sparkles" onClick={() => setShowAi(!showAi)}>AI 诊断</Button>}<Button icon="refresh" onClick={() => onNotify('已创建重跑实例（原型）')}>重跑</Button><button className="icon-button" aria-label="更多运行操作"><Icon name="more" /></button></div>
        </div>
        <div className="run-flow" aria-label="任务节点运行状态">
          {[
            { name: '读取用户行为', sub: 'SeaTunnel', icon: 'database', status: 'success', time: '42s' },
            { name: '行为数据清洗', sub: 'Trino SQL', icon: 'sql', status: 'success', time: '1m 18s' },
            { name: '关联用户画像', sub: 'Trino SQL', icon: 'link', status: failed ? 'failed' : 'success', time: failed ? '2m 09s' : '1m 32s' },
            { name: '写入行为宽表', sub: 'Iceberg', icon: 'layers', status: 'paused', time: '—' },
            { name: '质量检查', sub: 'Quality', icon: 'quality', status: 'paused', time: '—' },
          ].map((node, index, array) => <div className="run-flow-item" key={node.name}>
            <button className={`run-flow-node flow-${node.status}`}><span className="flow-node-icon"><Icon name={node.icon as 'database'} size={19} /></span><span><strong>{node.name}</strong><small>{node.sub} · {node.time}</small></span><i>{node.status === 'success' ? <Icon name="check" size={12} /> : node.status === 'failed' ? <Icon name="close" size={12} /> : <Icon name="clock" size={12} />}</i></button>
            {index < array.length - 1 && <div className={`flow-connector ${node.status === 'success' ? 'connector-success' : ''}`}><Icon name="chevron" size={14} /></div>}
          </div>)}
        </div>
        <div className={`run-bottom-panel ${showAi && failed ? 'with-ai' : ''}`}>
          <div className="log-panel">
            <div className="log-tabs"><button className={logTab === 'error' ? 'active' : ''} onClick={() => setLogTab('error')}>错误日志 <span>1</span></button><button className={logTab === 'all' ? 'active' : ''} onClick={() => setLogTab('all')}>全部日志</button><button className={logTab === 'metrics' ? 'active' : ''} onClick={() => setLogTab('metrics')}>运行指标</button><div><button aria-label="复制日志"><Icon name="copy" size={15} /></button><button aria-label="下载日志"><Icon name="download" size={15} /></button></div></div>
            {logTab === 'metrics' ? <div className="log-metrics"><div><span>峰值内存</span><strong>18.6 GB</strong></div><div><span>CPU 时间</span><strong>6m 42s</strong></div><div><span>扫描数据</span><strong>284 GB</strong></div><div><span>Shuffle 数据</span><strong>92 GB</strong></div></div> : <pre className="log-content"><code>{logTab === 'error' ? `[2026-11-02 09:20:41] [ERROR] TrinoQueryException\nQuery 20261102_092041_01842 failed\n\nJAVA_HEAP_SPACE: Exceeded memory limit of 18GB\n  at io.trino.operator.JoinOperator.buildHashTable(JoinOperator.java:184)\n  at io.trino.operator.PipelineDriver.process(PipelineDriver.java:392)\n\nTask: behavior_profile_join\nStage: stage-3 / task-17\nRows processed: 1,284,920` : `[2026-11-02 09:18:32] [INFO] Starting workflow run-20261102-0918\n[2026-11-02 09:18:34] [INFO] Version: v12 / trigger: schedule\n[2026-11-02 09:19:14] [INFO] Source extraction completed: 1.2M rows\n[2026-11-02 09:19:52] [INFO] Data cleaning completed\n[2026-11-02 09:20:41] [ERROR] JAVA_HEAP_SPACE: Exceeded memory limit`}</code></pre>}
          </div>
          {showAi && failed && <aside className="diagnosis-panel">
            <div className="diagnosis-heading"><div><span><Icon name="sparkles" size={18} /></span><strong>AI 失败诊断</strong><Tag tone="purple">只读</Tag></div><button className="icon-button" aria-label="关闭 AI 诊断" onClick={() => setShowAi(false)}><Icon name="close" size={16} /></button></div>
            <div className="diagnosis-summary"><span>失败摘要</span><p>关联用户画像时发生内存溢出，疑似由行为表中的高频用户导致 Join 数据倾斜。</p></div>
            <div className="confidence"><span>诊断置信度</span><strong>高 · 87%</strong></div>
            <div className="root-cause"><h3>最可能的根因</h3><div><span>01</span><p><strong>Join 右表存在热点 key</strong>用户 <code>user_0000</code> 占扫描行数的 38.6%，导致单个 Worker 内存超过 18 GB 限制。</p></div><div><span>02</span><p><strong>并发提升放大了内存压力</strong>本次并发由 4 提升至 8，较上一版本增加 2 个并发任务。</p></div></div>
            <div className="evidence-box"><h3><Icon name="link" size={14} />证据引用</h3><button>错误日志 · 第 4–9 行 <Icon name="chevron" size={12} /></button><button>运行指标 · stage-3 <Icon name="chevron" size={12} /></button><button>版本变更 · v11 → v12 <Icon name="chevron" size={12} /></button></div>
            <div className="suggestion-box"><h3><Icon name="sparkles" size={14} />建议修复</h3><ol><li>先过滤或拆分 <code>user_0000</code> 热点用户；</li><li>将 Join 调整为 skew join，并恢复并发至 4；</li><li>在测试环境验证后，再将内存上调至 24 GB。</li></ol><Button size="small" icon="eye" onClick={() => onNotify('已生成修复建议预览（原型）')}>预览修复建议</Button></div>
            <div className="diagnosis-footer"><span><Icon name="shield" size={13} />不会自动执行任何修改</span><div><button aria-label="诊断有帮助"><Icon name="check" size={14} /></button><button aria-label="诊断没有帮助"><Icon name="close" size={14} /></button></div></div>
          </aside>}
        </div>
      </Card>
    </div>
  )
}
