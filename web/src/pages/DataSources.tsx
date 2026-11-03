import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, StatusBadge, Tag } from '../components/UI'

const sources = [
  { name: 'mysql-shop-production', type: 'MySQL', host: '10.0.12.36:3306', database: 'shop', status: 'success' as const, usage: 6, updated: '10 分钟前', icon: 'database' },
  { name: 'postgres-finance', type: 'PostgreSQL', host: '10.0.18.22:5432', database: 'finance', status: 'success' as const, usage: 3, updated: '1 小时前', icon: 'database' },
  { name: 'trino-production', type: 'Trino', host: 'trino.data.svc:8080', database: 'iceberg', status: 'success' as const, usage: 12, updated: '刚刚', icon: 'layers' },
  { name: 'mysql-marketing', type: 'MySQL', host: '10.0.16.18:3306', database: 'marketing', status: 'warning' as const, usage: 2, updated: '32 分钟前', icon: 'database' },
]

export function DataSources({ onNotify }: { onNotify: (message: string) => void }) {
  const [showModal, setShowModal] = useState(false)
  const [testing, setTesting] = useState(false)

  const testConnection = () => {
    setTesting(true)
    window.setTimeout(() => {
      setTesting(false)
      onNotify('连接测试成功，延迟 28ms（原型）')
    }, 500)
  }

  return (
    <div className="page sources-page">
      <PageHeader eyebrow="数据管理" title="数据源" description="集中管理连接、凭据引用和访问健康状态。" actions={<Button variant="primary" icon="plus" onClick={() => setShowModal(true)}>添加数据源</Button>} />
      <div className="security-banner"><span><Icon name="shield" size={20} /></span><div><strong>连接凭据由 Secrets Manager 安全托管</strong><p>界面和日志只显示密钥引用，不会保存或展示明文密码。</p></div><button>查看安全说明 <Icon name="chevron" size={13} /></button></div>
      <div className="source-type-grid"><Card><span className="source-type-icon mysql"><Icon name="database" /></span><div><strong>MySQL</strong><p>2 个连接</p></div></Card><Card><span className="source-type-icon postgres"><Icon name="database" /></span><div><strong>PostgreSQL</strong><p>1 个连接</p></div></Card><Card><span className="source-type-icon trino"><Icon name="layers" /></span><div><strong>Trino</strong><p>1 个连接</p></div></Card><Card><span className="source-type-icon iceberg"><Icon name="assets" /></span><div><strong>Iceberg / S3</strong><p>默认存储</p></div></Card></div>
      <Card className="list-card">
        <div className="list-toolbar"><div className="toolbar-left"><label className="table-search"><Icon name="search" size={17} /><input aria-label="搜索数据源" placeholder="搜索名称、主机或数据库" /></label><select aria-label="数据源类型"><option>全部类型</option><option>MySQL</option><option>PostgreSQL</option><option>Trino</option></select></div><span className="muted-text">4 个数据源</span></div>
        <div className="table-wrap"><table className="data-table source-table"><thead><tr><th>数据源</th><th>类型</th><th>连接地址</th><th>健康状态</th><th>使用方</th><th>最近检查</th><th aria-label="操作" /></tr></thead><tbody>{sources.map((source) => <tr key={source.name}><td><div className="workflow-cell"><span className={`source-list-icon ${source.type.toLowerCase()}`}><Icon name={source.icon as 'database'} size={18} /></span><span><strong>{source.name}</strong><small>默认数据库：{source.database}</small></span></div></td><td><Tag>{source.type}</Tag></td><td><code>{source.host}</code></td><td><StatusBadge status={source.status} label={source.status === 'success' ? '连接正常' : '连接不稳定'} /></td><td>{source.usage} 个 工作流</td><td>{source.updated}</td><td><div className="row-actions"><button className="icon-button" aria-label={`测试 ${source.name}`} onClick={() => onNotify(`${source.name} 连接正常（原型）`)}><Icon name="refresh" size={16} /></button><button className="icon-button" aria-label={`编辑 ${source.name}`}><Icon name="edit" size={16} /></button><button className="icon-button" aria-label={`${source.name} 更多操作`}><Icon name="more" size={17} /></button></div></td></tr>)}</tbody></table></div>
      </Card>
      {showModal && <div className="modal-backdrop" role="presentation" onClick={() => setShowModal(false)}><section className="modal source-modal" role="dialog" aria-modal="true" aria-labelledby="source-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><h2 id="source-modal-title">添加数据源</h2><p>配置一个新的数据连接</p></div><button className="icon-button" aria-label="关闭添加数据源" onClick={() => setShowModal(false)}><Icon name="close" /></button></div>
        <div className="source-type-select"><button className="active"><Icon name="database" /><strong>MySQL</strong><small>5.7 / 8.0+</small></button><button><Icon name="database" /><strong>PostgreSQL</strong><small>12+</small></button><button><Icon name="layers" /><strong>Trino</strong><small>400+</small></button></div>
        <div className="modal-form"><label>连接名称<input defaultValue="mysql-new-production" /></label><div className="form-row"><label>主机地址<input placeholder="例如：10.0.12.36" /></label><label>端口<input defaultValue="3306" /></label></div><label>数据库名称<input placeholder="请输入默认数据库" /></label><div className="form-row"><label>用户名<input placeholder="只读或受限账号" /></label><label>密码引用<input placeholder="secret://production/mysql" /></label></div><label className="checkbox-label"><input type="checkbox" defaultChecked />启用 SSL 加密连接</label></div>
        <div className="connection-test"><Icon name="shield" size={16} /><span>凭据将加密保存至当前环境的 Secrets Manager</span></div>
        <div className="modal-actions"><Button onClick={testConnection} icon="refresh">{testing ? '正在测试…' : '测试连接'}</Button><div><Button onClick={() => setShowModal(false)}>取消</Button><Button variant="primary" onClick={() => { setShowModal(false); onNotify('数据源已保存（原型）') }}>保存数据源</Button></div></div>
      </section></div>}
    </div>
  )
}
