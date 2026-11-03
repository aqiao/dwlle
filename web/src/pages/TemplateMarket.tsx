import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, Tag } from '../components/UI'

interface TemplateMarketProps {
  kind: 'scenario' | 'workflow'
  onNotify: (message: string) => void
}

const scenarioTemplates = [
  { name: '订单履约分析', author: 'dwlle 官方', description: '订单与库存入湖、履约宽表转换、质量检查和业务就绪监控', version: 'v1.3.0', installs: 286, workflows: 4, tags: ['MySQL', 'Trino', '质量'], rating: '4.9' },
  { name: '营销活动归因', author: '林夏数据', description: '活动投放、订单转化、渠道归因和营销日报完整场景', version: 'v1.1.2', installs: 142, workflows: 3, tags: ['营销', 'Iceberg'], rating: '4.8' },
  { name: '客户流失预警', author: '数智实验室', description: '客户行为整合、流失特征加工、评分数据集和结果验证', version: 'v0.9.5', installs: 87, workflows: 5, tags: ['客户', 'PostgreSQL'], rating: '4.7' },
]

const workflowTemplates = [
  { name: 'MySQL 每日增量入湖', author: 'dwlle 官方', description: '按更新时间增量读取业务表，以幂等方式写入 S3 Iceberg', version: 'v2.1.0', installs: 512, workflows: 1, tags: ['SeaTunnel', 'MySQL'], rating: '4.9' },
  { name: 'PostgreSQL 全量归档', author: '数据工坊', description: '全量抽取 PostgreSQL 表并生成带快照日期的归档数据集', version: 'v1.4.1', installs: 204, workflows: 1, tags: ['PostgreSQL', 'Iceberg'], rating: '4.8' },
  { name: 'Trino 数据质量检查', author: 'dwlle 官方', description: '非空、唯一、行数波动和新鲜度检查，支持失败阻断', version: 'v1.6.0', installs: 367, workflows: 1, tags: ['Trino', '质量'], rating: '4.9' },
]

export function TemplateMarket({ kind, onNotify }: TemplateMarketProps) {
  const isScenario = kind === 'scenario'
  const templates = isScenario ? scenarioTemplates : workflowTemplates
  const title = isScenario ? '场景模板' : '工作流模板'

  return (
    <div className="page template-market-page">
      <PageHeader eyebrow="方案市场" title={title} description={`发现、评估和安装其他用户共享的${title}，不显示企业运行实例。`} actions={<Button icon="download">我的发布</Button>} />
      <div className="market-notice"><Icon name="shield" size={19} /><div><strong>共享模板默认只读</strong><p>安装后才会在你的工作空间生成独立实例，本地修改不会影响上游模板。</p></div><Button size="small" icon="download">查看已安装</Button></div>
      <div className="market-filter-bar"><div><button className="active">全部</button><button>官方认证</button><button>社区精选</button><button>最近更新</button></div><label className="table-search"><Icon name="search" size={16} /><input aria-label={`搜索${title}`} placeholder={`搜索${title}`} /></label></div>
      <div className="template-grid">
        {templates.map((template, index) => <Card className="template-card" key={template.name}>
          <div className="template-card-top"><span className={`template-kind-icon ${isScenario ? 'scenario' : 'workflow'}`}><Icon name={isScenario ? 'workflow' : 'layers'} size={22} /></span><div><Tag tone={index === 0 ? 'blue' : 'default'}>{index === 0 ? '官方认证' : '社区模板'}</Tag><span className="template-rating">★ {template.rating}</span></div></div>
          <h2>{template.name}</h2><div className="template-author"><span className="author-avatar">{template.author.slice(0, 1)}</span>{template.author}<span>·</span>{template.version}</div>
          <p>{template.description}</p>
          <div className="solution-card-tags">{template.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
          <div className="template-compatibility"><Icon name="check" size={14} /><span>与当前 EKS / Trino 环境兼容</span></div>
          <div className="template-stats"><span>{isScenario ? `${template.workflows} 条 工作流` : '单 工作流'}</span><span><Icon name="download" size={13} />{template.installs} 次安装</span></div>
          <div className="solution-card-footer"><Button size="small" icon="eye">查看定义</Button><Button size="small" variant="primary" icon="download" onClick={() => onNotify(`${template.name} 已进入安装流程（原型）`)}>安装模板</Button></div>
        </Card>)}
      </div>
      <div className="market-lifecycle"><div><span>1</span><strong>发现只读模板</strong></div><Icon name="chevron" size={15} /><div><span>2</span><strong>安装到指定环境</strong></div><Icon name="chevron" size={15} /><div><span>3</span><strong>在工作空间使用</strong></div><Icon name="chevron" size={15} /><div><span>4</span><strong>本地修改与升级</strong></div></div>
    </div>
  )
}
