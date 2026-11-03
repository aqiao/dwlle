import { useState, type ReactNode } from 'react'
import type { PageId } from '../types'
import { branding } from '../config/branding'
import { Avatar } from './UI'
import { Icon, type IconName } from './Icon'

interface AppShellProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

const navigation: { label: string; items: { id: PageId; label: string; icon: IconName; badge?: string }[] }[] = [
  {
    label: '日常工作',
    items: [
      { id: 'dashboard', label: '工作台', icon: 'dashboard' },
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
    label: '方案市场',
    items: [
      { id: 'solutions', label: '解决方案', icon: 'layers' },
      { id: 'scenario-templates', label: '场景模板', icon: 'pipeline' },
      { id: 'pipeline-templates', label: 'Pipeline 模板', icon: 'pipeline' },
      { id: 'installed', label: '已安装与更新', icon: 'download' },
    ],
  },
]

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [workspace, setWorkspace] = useState('零售经营分析')
  const [environment, setEnvironment] = useState('生产环境')
  const [personalOpen, setPersonalOpen] = useState(false)
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
          <div className="enterprise-logo">{branding.logoText}</div>
          <div className="enterprise-name">{branding.companyName}</div>
          <button className="mobile-close icon-button" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><Icon name="close" /></button>
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
          <div className="personal-area">
            {personalOpen && <div className="personal-menu"><button><Icon name="user" size={15} />个人信息</button><button><Icon name="settings" size={15} />界面偏好</button><button><Icon name="back" size={15} />退出登录</button></div>}
            <button className="sidebar-user" aria-label="个人设置" aria-expanded={personalOpen} onClick={() => setPersonalOpen(!personalOpen)}>
              <Avatar name="陈默" />
              <div><strong>陈默</strong><span>平台管理员</span></div>
              <Icon name="more" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-frame">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
            <label className="workspace-select"><span>当前空间</span><select aria-label="切换工作空间" value={workspace} onChange={(event) => setWorkspace(event.target.value)}><option>零售经营分析</option><option>财务数据中心</option><option>全部工作空间</option></select></label>
            <label className="environment-select"><span>环境</span><select aria-label="切换环境" value={environment} onChange={(event) => setEnvironment(event.target.value)}><option>生产环境</option><option>开发环境</option><option>测试环境</option></select></label>
          </div>
          <div className="topbar-right">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input aria-label="全局搜索" placeholder="搜索 Pipeline、数据表…" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="通知"><Icon name="bell" size={19} /><span /></button>
            <button className="workspace-settings-button" aria-label="工作空间设置" onClick={() => navigate('integrations')}><Icon name="settings" size={17} /><span>工作空间设置</span></button>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
