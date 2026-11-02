import { useState, type ReactNode } from 'react'
import type { PageId } from '../types'
import { Avatar, Tag } from './UI'
import { Icon, type IconName } from './Icon'

interface AppShellProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

const navigation: { label: string; items: { id: PageId; label: string; icon: IconName; badge?: string }[] }[] = [
  {
    label: '工作空间',
    items: [
      { id: 'dashboard', label: '工作台', icon: 'dashboard' },
      { id: 'solutions', label: '解决方案', icon: 'layers' },
      { id: 'scenarios', label: '业务场景', icon: 'pipeline' },
      { id: 'pipelines', label: 'Pipeline', icon: 'pipeline' },
      { id: 'runs', label: '运行中心', icon: 'runs', badge: '3' },
      { id: 'sql', label: 'SQL 工作台', icon: 'sql' },
    ],
  },
  {
    label: '数据管理',
    items: [
      { id: 'assets', label: '数据资产', icon: 'assets' },
      { id: 'sources', label: '数据源', icon: 'database' },
    ],
  },
  {
    label: '开放集成',
    items: [
      { id: 'integrations', label: 'API 与 MCP', icon: 'code' },
    ],
  },
]

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeNav = activePage === 'editor' ? 'pipelines' : activePage

  const navigate = (page: PageId) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div className="brand-name">dwlle<span>对味</span></div>
          <button className="mobile-close icon-button" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><Icon name="close" /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-icon">D</div>
          <div><strong>数据平台</strong><span>企业工作空间</span></div>
          <Icon name="arrowDown" size={15} />
        </div>
        <nav className="main-nav" aria-label="主导航">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeNav === item.id ? 'nav-item-active' : ''}`}
                  onClick={() => navigate(item.id)}
                  aria-current={activeNav === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Icon name="sparkles" size={18} /></div>
            <strong>让数据工作更简单</strong>
            <p>从 Pipeline 到 AI 运维，一站式完成。</p>
            <button>查看新手指南 <Icon name="chevron" size={13} /></button>
          </div>
          <div className="sidebar-user">
            <Avatar name="陈默" />
            <div><strong>陈默</strong><span>平台管理员</span></div>
            <Icon name="more" size={18} />
          </div>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
            <div className="breadcrumb"><span>数据平台</span><Icon name="chevron" size={13} /><strong>零售事业部</strong></div>
            <Tag tone="blue">生产环境</Tag>
          </div>
          <div className="topbar-right">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input aria-label="全局搜索" placeholder="搜索 Pipeline、数据表…" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="通知"><Icon name="bell" size={19} /><span /></button>
            <span className="topbar-divider" />
            <button className="topbar-avatar" aria-label="用户菜单"><Avatar name="陈默" size="small" /><Icon name="arrowDown" size={13} /></button>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
