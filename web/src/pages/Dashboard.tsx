import { runs } from '../data'
import type { PageId } from '../types'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, ProgressBar, StatusBadge } from '../components/UI'

interface DashboardProps {
  onNavigate: (page: PageId) => void
}

const metrics = [
  { label: '运行中 Pipeline', value: '24', note: '较昨日 +3', icon: 'pipeline' as const, tone: 'blue' },
  { label: '今日任务成功率', value: '96.8%', note: '近 7 天 +1.2%', icon: 'check' as const, tone: 'green' },
  { label: '待处理告警', value: '3', note: '1 条高优先级', icon: 'alert' as const, tone: 'orange' },
  { label: '本月资源成本', value: '¥1,284', note: '预算使用 42%', icon: 'arrowUp' as const, tone: 'purple' },
]

export function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="日常工作"
        title="工作台"
        description="汇总当前工作空间的任务、资源与运行状态。"
        actions={<Button icon="download">导出报告</Button>}
      />

      <div className="metric-grid">
        {metrics.map((metric) => (
          <Card className="metric-card" key={metric.label}>
            <div className={`metric-icon metric-${metric.tone}`}><Icon name={metric.icon} size={21} /></div>
            <div className="metric-label">{metric.label}<button className="plain-icon" aria-label={`${metric.label}详情`}><Icon name="more" size={17} /></button></div>
            <div className="metric-value">{metric.value}</div>
            <div className={`metric-note note-${metric.tone}`}>{metric.note}</div>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card className="trend-card">
          <div className="card-header">
            <div><h2>任务运行趋势</h2><p>近 7 天任务执行与成功情况</p></div>
            <div className="segmented"><button className="active">近 7 天</button><button>近 30 天</button></div>
          </div>
          <div className="chart-legend"><span><i className="legend-blue" />运行任务</span><span><i className="legend-green" />成功任务</span></div>
          <div className="line-chart">
            <div className="chart-y-labels"><span>160</span><span>120</span><span>80</span><span>40</span><span>0</span></div>
            <svg viewBox="0 0 700 210" role="img" aria-label="近七天任务运行趋势图">
              <defs>
                <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f7cff" stopOpacity=".22"/><stop offset="100%" stopColor="#4f7cff" stopOpacity="0"/></linearGradient>
              </defs>
              {[20, 60, 100, 140, 180].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#edf0f5" />)}
              <path d="M10 135 C50 130 65 105 105 108 S165 80 205 86 S265 110 305 98 S365 53 405 63 S465 74 505 57 S565 38 605 47 S665 28 690 35 L690 190 L10 190Z" fill="url(#areaBlue)" />
              <path d="M10 135 C50 130 65 105 105 108 S165 80 205 86 S265 110 305 98 S365 53 405 63 S465 74 505 57 S565 38 605 47 S665 28 690 35" fill="none" stroke="#4f7cff" strokeWidth="3" strokeLinecap="round" />
              <path d="M10 154 C50 148 65 130 105 132 S165 111 205 115 S265 127 305 120 S365 86 405 91 S465 100 505 86 S565 69 605 75 S665 56 690 61" fill="none" stroke="#22b889" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 5" />
              {[[10,135],[105,108],[205,86],[305,98],[405,63],[505,57],[605,47],[690,35]].map(([x,y], index) => <circle key={index} cx={x} cy={y} r="4" fill="#fff" stroke="#4f7cff" strokeWidth="2.5" />)}
            </svg>
            <div className="chart-x-labels">{['10/27','10/28','10/29','10/30','10/31','11/01','11/02'].map((day) => <span key={day}>{day}</span>)}</div>
          </div>
        </Card>

        <Card className="resource-card">
          <div className="card-header"><div><h2>资源使用</h2><p>当前数据平面</p></div><button className="plain-icon" aria-label="资源设置"><Icon name="settings" size={18} /></button></div>
          <div className="resource-list">
            <div className="resource-item"><div><span><Icon name="layers" size={16} />计算资源</span><strong>68%</strong></div><ProgressBar value={68} /><small>12 / 18 vCPU 正在使用</small></div>
            <div className="resource-item"><div><span><Icon name="database" size={16} />内存</span><strong>54%</strong></div><ProgressBar value={54} tone="green" /><small>38.8 / 72 GB 正在使用</small></div>
            <div className="resource-item"><div><span><Icon name="assets" size={16} />对象存储</span><strong>42%</strong></div><ProgressBar value={42} tone="orange" /><small>1.26 / 3 TB 已使用</small></div>
          </div>
          <div className="cost-note"><Icon name="arrowDown" size={15} /><span>本周资源成本较上周下降 <strong>8.4%</strong></span></div>
        </Card>
      </div>

      <div className="dashboard-bottom-grid">
        <Card className="recent-runs-card">
          <div className="card-header"><div><h2>最近运行</h2><p>Pipeline 实例的最新状态</p></div><Button variant="ghost" size="small" onClick={() => onNavigate('runs')}>查看全部 <Icon name="chevron" size={14} /></Button></div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Pipeline</th><th>状态</th><th>开始时间</th><th>耗时</th><th>触发方式</th></tr></thead>
              <tbody>{runs.slice(0, 4).map((run) => (
                <tr key={run.id} onClick={() => onNavigate('runs')} className="clickable-row">
                  <td><div className="pipeline-cell"><span className="table-icon"><Icon name="pipeline" size={16} /></span><strong>{run.pipeline}</strong></div></td>
                  <td><StatusBadge status={run.status} /></td><td>{run.startedAt.slice(5, 16)}</td><td>{run.duration}</td><td>{run.trigger}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>

        <Card className="ai-insight-card">
          <div className="ai-insight-head"><div><h2>智能洞察</h2><p>发现 2 项可优化机会</p></div><span><Icon name="sparkles" size={19} /></span></div>
          <div className="insight-item">
            <div className="insight-number">01</div>
            <div><strong>用户行为宽表加工</strong><p>近 3 次运行在 Shuffle 阶段耗时增加 42%，建议检查数据倾斜。</p><button onClick={() => onNavigate('runs')}>查看诊断 <Icon name="chevron" size={13} /></button></div>
          </div>
          <div className="insight-item">
            <div className="insight-number">02</div>
            <div><strong>夜间计算资源</strong><p>02:00–05:00 平均利用率仅 18%，可优化 Worker 扩缩容策略。</p><button>查看建议 <Icon name="chevron" size={13} /></button></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
