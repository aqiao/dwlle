import { useState } from 'react'
import { orderRows } from '../data'
import { Icon } from '../components/Icon'
import { Button, Tag } from '../components/UI'

const defaultSql = `SELECT
  order_id,
  customer_name,
  amount,
  status,
  updated_at
FROM iceberg.curated.dwd_orders
WHERE dt = '2026-11-02'
  AND amount >= 0
ORDER BY updated_at DESC
LIMIT 100;`

export function SqlWorkspace({ onNotify }: { onNotify: (message: string) => void }) {
  const [sql, setSql] = useState(defaultSql)
  const [executed, setExecuted] = useState(false)
  const [treeOpen, setTreeOpen] = useState(true)
  const [resultTab, setResultTab] = useState('result')

  const execute = () => {
    setExecuted(true)
    setResultTab('result')
    onNotify('查询已完成，返回 100 行（模拟数据）')
  }

  return (
    <div className="sql-page">
      <div className="sql-header"><div><div className="eyebrow">日常工作</div><h1>SQL 工作台</h1></div><div className="page-actions"><Button icon="clock">查询历史</Button><Button icon="plus" onClick={() => onNotify('已保存为 工作流 SQL 节点（原型）')}>保存为 工作流 节点</Button><Button variant="primary" icon="play" onClick={execute}>运行查询 <kbd>⌘ ↵</kbd></Button></div></div>
      <div className={`sql-workspace ${treeOpen ? '' : 'tree-collapsed'}`}>
        <aside className="schema-panel">
          <div className="schema-heading"><strong>数据资源</strong><button className="icon-button" aria-label="刷新数据资源"><Icon name="refresh" size={15} /></button></div>
          <label className="component-search"><Icon name="search" size={15} /><input aria-label="搜索数据表" placeholder="搜索库表" /></label>
          <div className="connection-select"><span className="connection-dot" /><div><strong>trino-production</strong><small>已连接</small></div><Icon name="arrowDown" size={13} /></div>
          <div className="schema-tree">
            <div className="tree-root"><Icon name="arrowDown" size={13} /><Icon name="database" size={16} /><strong>iceberg</strong></div>
            <div className="tree-branch"><div><Icon name="arrowDown" size={13} /><Icon name="assets" size={15} /><span>raw</span></div><div className="tree-leaves"><button><Icon name="table" size={14} />shop_orders</button><button><Icon name="table" size={14} />customers</button><button><Icon name="table" size={14} />user_events</button></div></div>
            <div className="tree-branch"><div><Icon name="arrowDown" size={13} /><Icon name="assets" size={15} /><span>curated</span></div><div className="tree-leaves"><button className="active"><Icon name="table" size={14} />dwd_orders</button><button><Icon name="table" size={14} />dwd_user_behavior</button><button><Icon name="table" size={14} />dim_customers</button></div></div>
            <div className="tree-root"><Icon name="chevron" size={13} /><Icon name="database" size={16} /><strong>mysql</strong></div>
          </div>
          <div className="schema-footer"><Icon name="shield" size={13} />当前使用只读开发账号</div>
        </aside>
        <section className="sql-editor-area">
          <div className="sql-tabs"><button className="sql-tab active"><Icon name="sql" size={15} /><span>订单数据探索.sql</span><i>●</i><Icon name="close" size={13} /></button><button className="new-tab" aria-label="新建查询"><Icon name="plus" size={16} /></button><div className="sql-tab-actions"><button className="icon-button" aria-label="收起库表树" onClick={() => setTreeOpen(!treeOpen)}><Icon name="table" size={16} /></button><button className="icon-button" aria-label="更多 SQL 操作"><Icon name="more" size={17} /></button></div></div>
          <div className="editor-context"><div><Tag tone="blue">iceberg</Tag><Icon name="chevron" size={12} /><Tag>curated</Tag></div><div><span><i className="connection-dot" />只读</span><button>格式化 SQL</button></div></div>
          <div className="code-editor">
            <div className="line-numbers">{Array.from({ length: 11 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
            <textarea aria-label="SQL 编辑器" spellCheck={false} value={sql} onChange={(event) => setSql(event.target.value)} />
          </div>
          <div className="editor-statusbar"><span>行 11，列 7</span><span>Trino SQL</span><span>UTF-8</span><div><Icon name="check" size={13} />已保存 09:46</div></div>
          <div className="query-results">
            <div className="result-tabs"><button className={resultTab === 'result' ? 'active' : ''} onClick={() => setResultTab('result')}>查询结果 {executed && <Tag>100 行</Tag>}</button><button className={resultTab === 'history' ? 'active' : ''} onClick={() => setResultTab('history')}>执行历史</button><button className={resultTab === 'profile' ? 'active' : ''} onClick={() => setResultTab('profile')}>查询 Profile</button><div>{executed && <span className="query-success"><Icon name="check" size={14} />成功 · 1.82s</span>}<button className="icon-button" aria-label="下载结果"><Icon name="download" size={16} /></button></div></div>
            {resultTab === 'result' ? <div className="table-wrap result-table-wrap"><table className="data-table result-table"><thead><tr>{['order_id', 'customer_name', 'amount', 'status', 'updated_at'].map((column) => <th key={column}>{column}<small>{column === 'amount' ? 'DECIMAL' : column === 'updated_at' ? 'TIMESTAMP' : 'VARCHAR'}</small></th>)}</tr></thead><tbody>{orderRows.map((row) => <tr key={row.order_id}><td>{row.order_id}</td><td>{row.customer}</td><td>{row.amount}</td><td><span className={`order-status order-${row.status}`}>{row.status}</span></td><td>{row.updated_at}</td></tr>)}</tbody></table></div> : resultTab === 'history' ? <div className="history-list"><div><Icon name="check" size={15} /><span><strong>SELECT * FROM dwd_orders…</strong><small>今天 09:46 · 1.82s · 100 行</small></span><Tag>成功</Tag></div><div><Icon name="check" size={15} /><span><strong>SHOW TABLES FROM curated</strong><small>今天 09:32 · 0.18s · 8 行</small></span><Tag>成功</Tag></div></div> : <div className="profile-placeholder"><Icon name="runs" size={28} /><strong>查询执行概览</strong><p>扫描 28.4 MB · CPU 1.24s · 峰值内存 86 MB</p></div>}
            <div className="result-footer"><span>{executed ? '显示 1–6 / 100 行（原型仅展示 6 行）' : '显示 1–6 / 100 行'}</span><div><button disabled><Icon name="back" size={14} /></button><button className="active">1</button><button>2</button><button>3</button><button><Icon name="chevron" size={14} /></button></div></div>
          </div>
        </section>
      </div>
    </div>
  )
}
