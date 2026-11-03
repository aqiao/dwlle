import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, Tag } from '../components/UI'

const solutions = [
  { name: '零售经营分析', description: '订单、库存、客户与营销数据的一站式分析方案', scenarios: 3, pipelines: 12, version: 'v1.4.0', official: true, installs: 328, tone: 'blue', tags: ['MySQL', 'Iceberg', 'Trino'] },
  { name: '客户 360° 数据视图', description: '整合客户主数据、行为与交易记录，构建统一客户画像', scenarios: 2, pipelines: 8, version: 'v1.2.1', official: false, installs: 186, tone: 'purple', tags: ['PostgreSQL', 'Trino'] },
  { name: '财务对账与稽核', description: '账单接入、订单核对、差异检测与财务质量报告', scenarios: 2, pipelines: 6, version: 'v1.0.3', official: false, installs: 94, tone: 'green', tags: ['质量', 'Iceberg'] },
]

export function Solutions({ onNotify }: { onNotify: (message: string) => void }) {
  const [showInstall, setShowInstall] = useState(false)
  const [step, setStep] = useState(1)

  const close = () => { setShowInstall(false); setStep(1) }

  return (
    <div className="page solutions-page">
      <PageHeader eyebrow="方案市场" title="解决方案" description="发现、评估和安装官方或社区方案，企业运行实例统一在日常工作管理。" actions={<Button icon="download">我的发布</Button>} />
      <div className="solution-principle"><div><span>01</span><strong>选择方案</strong><small>按业务目标开始</small></div><Icon name="chevron" size={16} /><div><span>02</span><strong>绑定环境</strong><small>自己的资源与密钥</small></div><Icon name="chevron" size={16} /><div><span>03</span><strong>审核并安装</strong><small>权限和成本可控</small></div><Icon name="chevron" size={16} /><div><span>04</span><strong>使用业务场景</strong><small>无需理解底层细节</small></div></div>
      <Card className="featured-solution">
        <div className="featured-solution-main">
          <div className="solution-hero-icon"><Icon name="layers" size={30} /></div>
          <div className="featured-copy"><div className="featured-label"><Tag tone="blue">推荐方案</Tag><Tag>官方认证</Tag></div><h2>零售经营分析</h2><p>从业务数据库到经营看板的完整数据链路，预置订单履约、客户分析和营销效果三个业务场景。</p><div className="solution-tags">{['3 个业务场景', '12 条 Pipeline', '28 个数据质量规则', 'v1.4.0'].map((item) => <span key={item}><Icon name="check" size={14} />{item}</span>)}</div></div>
          <div className="featured-actions"><Button variant="primary" icon="download" onClick={() => setShowInstall(true)}>安装解决方案</Button><Button icon="eye">查看方案详情</Button></div>
        </div>
        <div className="featured-requirements"><div><span>计算环境</span><strong>Kubernetes / EKS</strong></div><div><span>存储与格式</span><strong>S3 + Iceberg</strong></div><div><span>执行组件</span><strong>SeaTunnel + Trino</strong></div><div><span>预计最小资源</span><strong>8 vCPU · 32 GB</strong></div><div><span>权限需求</span><strong>3 个只读数据源</strong></div></div>
      </Card>
      <div className="section-heading"><div><h2>方案目录</h2><p>经过兼容性验证的工作空间级模板</p></div><label className="table-search"><Icon name="search" size={16} /><input aria-label="搜索解决方案" placeholder="搜索解决方案" /></label></div>
      <div className="solution-grid">
        {solutions.map((solution) => <Card className="solution-card" key={solution.name}>
          <div className={`solution-card-icon tone-${solution.tone}`}><Icon name="layers" size={23} /></div>
          <div className="solution-card-labels"><Tag tone={solution.official ? 'blue' : 'default'}>{solution.official ? '官方认证' : '社区方案'}</Tag><span>{solution.version}</span></div>
          <h3>{solution.name}</h3><p>{solution.description}</p>
          <div className="solution-card-tags">{solution.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
          <div className="solution-card-stats"><span><Icon name="pipeline" size={14} />{solution.scenarios} 个场景</span><span><Icon name="runs" size={14} />{solution.pipelines} 条 Pipeline</span><span><Icon name="download" size={14} />{solution.installs}</span></div>
          <div className="solution-card-footer"><Button size="small" icon="eye">详情</Button><Button size="small" variant={solution.name === '零售经营分析' ? 'primary' : 'secondary'} icon="download" onClick={() => setShowInstall(true)}>安装</Button></div>
        </Card>)}
      </div>
      <div className="definition-binding-note"><Icon name="shield" size={20} /><div><strong>共享定义，不共享凭据</strong><p>方案仅包含版本化的业务定义和资源需求。数据源地址、密钥、用户权限和云资源由你在安装时独立绑定。</p></div></div>

      {showInstall && <div className="modal-backdrop" role="presentation" onClick={close}><section className="modal solution-install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><h2 id="install-title">安装零售经营分析</h2><p>v1.4.0 · 定义与环境绑定分离</p></div><button className="icon-button" aria-label="关闭安装" onClick={close}><Icon name="close" /></button></div>
        <div className="install-steps">{['检查兼容性', '绑定运行环境', '审核并安装'].map((label, index) => <div className={step >= index + 1 ? 'active' : ''} key={label}><span>{step > index + 1 ? <Icon name="check" size={13} /> : index + 1}</span><small>{label}</small></div>)}</div>
        <div className="install-content">
          {step === 1 && <><h3>兼容性检查通过</h3><div className="install-check-list"><div><Icon name="check" size={15} /><span>执行组件版本</span><strong>SeaTunnel / Trino 兼容</strong></div><div><Icon name="check" size={15} /><span>业务内容</span><strong>3 个场景 · 12 条 Pipeline</strong></div><div><Icon name="check" size={15} /><span>数据源契约</span><strong>3 个只读连接待绑定</strong></div><div><Icon name="check" size={15} /><span>敏感信息</span><strong>不包含凭据或实际授权</strong></div></div></>}
          {step === 2 && <><h3>绑定你的运行环境</h3><div className="modal-form"><label>目标工作空间<select><option>零售事业部 / 生产环境</option><option>零售事业部 / 开发环境</option></select></label><label>Kubernetes 环境<select><option>eks-production · 8 vCPU 可用</option><option>eks-development</option></select></label><label>订单数据库<select><option>mysql-shop-production · 连接正常</option></select></label><label>密钥引用<select><option>secret://retail/orders/readonly</option></select></label></div></>}
          {step === 3 && <><h3>确认权限与资源</h3><div className="install-review"><div><span>创建业务内容</span><strong>3 个场景、12 条 Pipeline</strong></div><div><span>数据源权限</span><strong>3 个只读连接</strong></div><div><span>云资源</span><strong>使用现有 EKS / S3，不创建新账号</strong></div><div><span>最小资源配额</span><strong>8 vCPU · 32 GB</strong></div><div><span>预计月度资源成本</span><strong>约 ¥860–1,240</strong></div></div><label className="install-confirm"><input type="checkbox" defaultChecked />我已审核权限、资源配额和成本估算</label></>}
        </div>
        <div className="modal-actions"><Button onClick={step === 1 ? close : () => setStep(step - 1)}>{step === 1 ? '取消' : '上一步'}</Button>{step < 3 ? <Button variant="primary" onClick={() => setStep(step + 1)}>下一步 <Icon name="chevron" size={14} /></Button> : <Button variant="primary" icon="check" onClick={() => { close(); onNotify('解决方案安装任务已创建（原型）') }}>确认安装</Button>}</div>
      </section></div>}
    </div>
  )
}
