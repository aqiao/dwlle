import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, ProgressBar, Tag } from '../components/UI'

const assets = [
  { name: 'dwd_orders', schema: 'curated', type: '事实表', rows: '2.4 亿', size: '284 GB', quality: 98, owner: '陈默', updated: '10 分钟前' },
  { name: 'dwd_user_behavior', schema: 'curated', type: '事实表', rows: '18.6 亿', size: '1.2 TB', quality: 86, owner: '林夏', updated: '1 小时前' },
  { name: 'dim_customers', schema: 'curated', type: '维度表', rows: '842 万', size: '6.8 GB', quality: 100, owner: '周宁', updated: '2 小时前' },
  { name: 'shop_orders', schema: 'raw', type: '原始表', rows: '2.4 亿', size: '326 GB', quality: 94, owner: '陈默', updated: '12 分钟前' },
  { name: 'user_events', schema: 'raw', type: '原始表', rows: '21.2 亿', size: '1.6 TB', quality: 91, owner: '林夏', updated: '1 小时前' },
]

export function Assets() {
  const [selected, setSelected] = useState(assets[0].name)
  const [tab, setTab] = useState('schema')
  const current = assets.find((asset) => asset.name === selected) ?? assets[0]

  return (
    <div className="page assets-page">
      <PageHeader eyebrow="数据管理" title="数据资产" description="统一查看数据表、质量、负责人和上下游血缘。" actions={<><Button icon="download">导出资产清单</Button><Button variant="primary" icon="plus">注册数据集</Button></>} />
      <div className="asset-layout">
        <Card className="asset-list-card">
          <div className="list-toolbar"><label className="table-search"><Icon name="search" size={16} /><input aria-label="搜索数据资产" placeholder="搜索数据表" /></label><button className="icon-button" aria-label="筛选数据资产"><Icon name="filter" size={17} /></button></div>
          <div className="asset-list">
            {assets.map((asset) => <button key={asset.name} className={selected === asset.name ? 'active' : ''} onClick={() => setSelected(asset.name)}><span className="asset-table-icon"><Icon name="table" size={18} /></span><span><strong>{asset.name}</strong><small>iceberg · {asset.schema}</small></span><Tag>{asset.type}</Tag></button>)}
          </div>
          <div className="asset-list-footer">共 86 个数据集 · 12 个数据源</div>
        </Card>
        <div className="asset-detail">
          <Card className="asset-overview">
            <div className="asset-title-row"><div className="asset-main-icon"><Icon name="table" size={26} /></div><div><div className="asset-title"><h1>{current.name}</h1><Tag tone="blue">Iceberg</Tag><Tag>{current.type}</Tag></div><p>iceberg.{current.schema}.{current.name}</p></div><div className="page-actions"><Button icon="eye">预览数据</Button><Button icon="sql">在 SQL 中打开</Button><button className="icon-button" aria-label="更多资产操作"><Icon name="more" /></button></div></div>
            <div className="asset-description">标准订单事实表，整合业务库订单与支付状态，为订单分析和财务报表提供统一口径。</div>
            <div className="asset-meta-grid"><div><span>数据负责人</span><strong>{current.owner}</strong></div><div><span>数据量</span><strong>{current.rows} 行</strong></div><div><span>存储大小</span><strong>{current.size}</strong></div><div><span>更新时间</span><strong>{current.updated}</strong></div></div>
          </Card>
          <div className="asset-secondary-grid">
            <Card className="quality-score-card"><div className="quality-score"><div className={`score-ring score-${current.quality > 90 ? 'good' : 'warn'}`} style={{ background: `conic-gradient(#22b889 ${current.quality * 3.6}deg, #e9eef5 0deg)` }}><span>{current.quality}<small>分</small></span></div><div><h3>数据质量评分</h3><p>12 项规则 · 11 项通过</p><span className="quality-warning"><Icon name="alert" size={13} />1 项需要关注</span></div></div><div className="quality-bars"><div><span>完整性</span><ProgressBar value={98} tone="green" /><strong>98%</strong></div><div><span>唯一性</span><ProgressBar value={100} tone="green" /><strong>100%</strong></div><div><span>及时性</span><ProgressBar value={92} tone="green" /><strong>92%</strong></div></div></Card>
            <Card className="lineage-card"><div className="card-header"><div><h2>表级血缘</h2><p>最近发布版本 v9</p></div><Button variant="ghost" size="small">查看完整血缘 <Icon name="chevron" size={13} /></Button></div><div className="lineage-flow"><div><span><Icon name="database" size={18} /></span><strong>shop.orders</strong><small>MySQL 数据源</small></div><Icon name="chevron" size={16} /><div><span><Icon name="table" size={18} /></span><strong>raw.shop_orders</strong><small>SeaTunnel</small></div><Icon name="chevron" size={16} /><div className="current"><span><Icon name="table" size={18} /></span><strong>{current.name}</strong><small>Trino SQL</small></div></div></Card>
          </div>
          <Card className="schema-card">
            <div className="schema-tabs"><button className={tab === 'schema' ? 'active' : ''} onClick={() => setTab('schema')}>字段 Schema <Tag>8</Tag></button><button className={tab === 'quality' ? 'active' : ''} onClick={() => setTab('quality')}>质量规则 <Tag>12</Tag></button><button className={tab === 'versions' ? 'active' : ''} onClick={() => setTab('versions')}>变更记录</button></div>
            {tab === 'schema' ? <div className="table-wrap"><table className="data-table"><thead><tr><th>字段名</th><th>类型</th><th>可空</th><th>说明</th><th>质量规则</th></tr></thead><tbody>{[
              ['order_id','VARCHAR','否','订单唯一标识','非空、唯一'],['customer_id','VARCHAR','否','客户唯一标识','非空'],['customer_name','VARCHAR','是','客户名称','—'],['amount','DECIMAL(18,2)','否','订单实付金额','大于等于 0'],['status','VARCHAR','否','订单状态','枚举值'],['dt','DATE','否','数据分区日期','非空'],['created_at','TIMESTAMP','否','订单创建时间','—'],['updated_at','TIMESTAMP','否','订单更新时间','及时性'],
            ].map((row) => <tr key={row[0]}><td><code>{row[0]}</code></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td></tr>)}</tbody></table></div> : <div className="tab-placeholder"><Icon name={tab === 'quality' ? 'quality' : 'clock'} size={30} /><strong>{tab === 'quality' ? '12 项质量规则正在运行' : '最近 30 天有 16 次 Schema 变更'}</strong><p>详细记录将在后续版本中接入真实元数据。</p></div>}
          </Card>
        </div>
      </div>
    </div>
  )
}
