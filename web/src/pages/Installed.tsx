import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, StatusBadge, Tag } from '../components/UI'

const installations = [
  { name: '零售经营分析', source: '官方解决方案', project: '零售经营分析', environment: '生产环境', sourceVersion: 'v1.4.0', localVersion: 'v1.4.0', latest: 'v1.4.0', status: 'success' as const, modified: false, installedAt: '2026-10-18' },
  { name: '订单履约分析', source: '官方场景模板', project: '零售经营分析', environment: '生产环境', sourceVersion: 'v1.3.0', localVersion: 'v1.3.0', latest: 'v1.4.0', status: 'warning' as const, modified: true, installedAt: '2026-10-18' },
  { name: 'MySQL 每日增量入湖', source: '官方 Pipeline 模板', project: '零售经营分析', environment: '开发环境', sourceVersion: 'v2.0.1', localVersion: 'v2.0.1-custom.2', latest: 'v2.1.0', status: 'warning' as const, modified: true, installedAt: '2026-10-26' },
  { name: '财务对账与稽核', source: '社区解决方案', project: '财务数据中心', environment: '生产环境', sourceVersion: 'v1.0.3', localVersion: 'v1.0.3', latest: 'v1.0.3', status: 'success' as const, modified: false, installedAt: '2026-10-30' },
]

export function Installed({ onOpenWorkspace, onNotify }: { onOpenWorkspace: () => void; onNotify: (message: string) => void }) {
  return (
    <div className="page installed-page">
      <PageHeader eyebrow="方案市场" title="已安装与更新" description="管理模板来源和企业实例版本，日常运行请回到我的工作空间。" actions={<Button icon="refresh">检查全部更新</Button>} />
      <div className="installed-summary"><Card><span><Icon name="download" /></span><div><strong>12</strong><p>已安装模板</p></div></Card><Card><span className="green"><Icon name="check" /></span><div><strong>9</strong><p>当前最新版本</p></div></Card><Card><span className="orange"><Icon name="arrowUp" /></span><div><strong>3</strong><p>有可用更新</p></div></Card><Card><span className="purple"><Icon name="edit" /></span><div><strong>2</strong><p>包含本地修改</p></div></Card></div>
      <div className="market-notice"><Icon name="layers" size={19} /><div><strong>模板更新不会直接覆盖你的实例</strong><p>升级前先比较上游版本和本地修改，经确认后生成新的实例版本。</p></div></div>
      <Card className="list-card">
        <div className="list-toolbar"><div className="toolbar-left"><label className="table-search"><Icon name="search" size={16} /><input aria-label="搜索安装记录" placeholder="搜索模板或项目" /></label><select aria-label="安装环境"><option>全部环境</option><option>生产环境</option><option>开发环境</option></select><select aria-label="更新状态"><option>全部状态</option><option>有更新</option><option>已是最新</option></select></div><span className="muted-text">12 条安装记录</span></div>
        <div className="table-wrap"><table className="data-table installed-table"><thead><tr><th>模板 / 来源</th><th>企业实例</th><th>当前版本</th><th>上游最新</th><th>本地修改</th><th>安装时间</th><th aria-label="操作" /></tr></thead><tbody>{installations.map((item) => <tr key={item.name}>
          <td><div className="pipeline-cell"><span className="table-icon"><Icon name="layers" size={16} /></span><span><strong>{item.name}</strong><small>{item.source}</small></span></div></td>
          <td><div className="instance-cell"><strong>{item.project}</strong><small><i className="env-dot" />{item.environment}</small></div></td>
          <td><Tag>{item.localVersion}</Tag></td><td><Tag tone={item.latest !== item.sourceVersion ? 'purple' : 'default'}>{item.latest}</Tag></td>
          <td>{item.modified ? <StatusBadge status="warning" label="有本地修改" /> : <StatusBadge status="success" label="未修改" />}</td><td>{item.installedAt}</td>
          <td><div className="row-actions">{item.latest !== item.sourceVersion ? <Button size="small" icon="eye" onClick={() => onNotify(`${item.name} 版本差异已打开（原型）`)}>比较并升级</Button> : <Button size="small" icon="eye" onClick={onOpenWorkspace}>查看实例</Button>}<button className="icon-button" aria-label={`${item.name} 更多操作`}><Icon name="more" size={17} /></button></div></td>
        </tr>)}</tbody></table></div>
      </Card>
      <div className="installed-workspace-link"><div><Icon name="dashboard" size={20} /><span><strong>需要查看任务和运行状态？</strong><p>企业实例的日常运行、告警和修改统一在我的工作空间进行。</p></span></div><Button icon="chevron" onClick={onOpenWorkspace}>前往我的工作空间</Button></div>
    </div>
  )
}
