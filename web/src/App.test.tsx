import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('dwlle UI prototype', () => {
  it('renders the dashboard and navigates to data sources', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByText('早上好，陈默')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 建议仅供辅助决策，不会自动执行')).not.toBeInTheDocument()
    expect(screen.getByText('云栖集团')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '工作台' })).toBeInTheDocument()
    expect(screen.getByText('汇总当前工作空间的任务、资源与运行状态。')).toBeInTheDocument()
    expect(screen.getByText('智能洞察')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '运行场景' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '切换工作空间' })).toBeInTheDocument()
    expect(screen.queryByText('数据平台')).not.toBeInTheDocument()
    expect(screen.queryByText('生产环境')).not.toBeInTheDocument()
    expect(screen.queryByText('企业工作空间')).not.toBeInTheDocument()
    expect(screen.queryByText('dwlle')).not.toBeInTheDocument()
    expect(screen.queryByText('快速开始')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '用户菜单' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '运行场景' }))
    expect(screen.getByRole('status')).toHaveTextContent('当前空间的场景已加入运行队列（原型）')
    await user.click(screen.getByRole('button', { name: /^数据源$/ }))

    expect(screen.getByRole('heading', { name: /^数据源$/ })).toBeInTheDocument()
    expect(screen.getByText('mysql-shop-production')).toBeInTheDocument()
  })

  it('opens a pipeline and publishes a new version', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Pipeline$/ }))
    await user.click(screen.getByRole('button', { name: /业务库订单增量接入/ }))
    expect(screen.getByRole('heading', { name: '电商订单每日入湖' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '发布 Pipeline' }))
    expect(screen.getByRole('dialog', { name: '发布 Pipeline v9' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认发布' }))

    expect(screen.getByRole('status')).toHaveTextContent('Pipeline v9 发布成功（原型）')
    expect(screen.getByText('已发布 v9')).toBeInTheDocument()
  })

  it('shows read-only AI diagnosis for a failed run', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^运行中心/ }))
    expect(screen.getByText('AI 失败诊断')).toBeInTheDocument()
    expect(screen.getByText('诊断置信度')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关闭 AI 诊断' }))
    expect(screen.queryByText('诊断置信度')).not.toBeInTheDocument()
  })

  it('runs a SQL query and shows feedback', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^SQL 工作台$/ }))
    await user.click(screen.getByRole('button', { name: /运行查询/ }))

    expect(screen.getByRole('status')).toHaveTextContent('查询已完成，返回 100 行（模拟数据）')
    expect(screen.getByText('成功 · 1.82s')).toBeInTheDocument()
  })

  it('walks through solution installation and environment binding', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^解决方案$/ }))
    await user.click(screen.getByRole('button', { name: '安装解决方案' }))
    expect(screen.getByRole('dialog', { name: '安装零售经营分析' })).toBeInTheDocument()
    expect(screen.getByText('兼容性检查通过')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('绑定你的运行环境')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('确认权限与资源')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认安装' }))

    expect(screen.getByRole('status')).toHaveTextContent('解决方案安装任务已创建（原型）')
  })

  it('navigates from a business scenario to its pipeline', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^业务场景$/ }))
    expect(screen.getByText('跨 Pipeline 依赖')).toBeInTheDocument()
    expect(screen.getByText('业务就绪条件')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /订单每日入湖SeaTunnel/ }))

    expect(screen.getByRole('heading', { name: '电商订单每日入湖' })).toBeInTheDocument()
    expect(screen.getByText(/零售经营分析 \/ 订单履约分析/)).toBeInTheDocument()
  })

  it('shows MCP tools and shared REST resources', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^API 与 MCP$/ }))
    expect(screen.getByText('FastMCP Server')).toBeInTheDocument()
    expect(screen.getByText('scenario.get_status')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /REST 核心资源/ }))
    expect(screen.getByText('/api/v1/scenarios')).toBeInTheDocument()
  })

  it('keeps shared templates in the solution market', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^场景模板$/ }))
    expect(screen.getByRole('heading', { name: '场景模板' })).toBeInTheDocument()
    expect(screen.getByText('共享模板默认只读')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: '安装模板' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('已进入安装流程（原型）')
  })

  it('links installed templates back to workspace instances', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^已安装与更新$/ }))
    expect(screen.getByText('模板更新不会直接覆盖你的实例')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前往日常工作' }))
    expect(screen.getByRole('heading', { name: '业务场景' })).toBeInTheDocument()
  })
})
