import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('dwlle UI prototype', () => {
  it('renders the dashboard and navigates to data sources', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: '早上好，陈默' })).toBeInTheDocument()
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
})
