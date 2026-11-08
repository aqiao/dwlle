import { useState } from 'react'
import type { CurrentUser } from '../auth/types'
import type { PageId } from '../types'
import { branding } from '../config/branding'
import { Avatar } from './UI'
import { Icon, type IconName } from './Icon'

interface SidebarProps {
  activePage: PageId
  mobileOpen: boolean
  onClose: () => void
  onNavigate: (page: PageId) => void
  user: CurrentUser
  onLogout: () => void
}

const navigation: { label: string; items: { id: PageId; label: string; icon: IconName; badge?: string }[] }[] = [
  {
    label: '日常工作',
    items: [
      { id: 'dashboard', label: '工作台', icon: 'dashboard' },
      { id: 'scenarios', label: '业务场景', icon: 'workflow' },
      { id: 'workflows', label: '工作流', icon: 'workflow' },
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
      { id: 'scenario-templates', label: '场景模板', icon: 'workflow' },
      { id: 'workflow-templates', label: '工作流模板', icon: 'workflow' },
      { id: 'installed', label: '已安装与更新', icon: 'download' },
    ],
  },
]

function roleLabel(user: CurrentUser): string {
  const roles = [...user.tenants, ...user.workspaces].map((item) => item.role)
  if (roles.includes('Admin')) return '平台管理员'
  if (roles.includes('Developer')) return '开发者'
  if (roles.includes('Viewer')) return '查看者'
  return '已认证用户'
}

export function Sidebar({ activePage, mobileOpen, onClose, onNavigate, user, onLogout }: SidebarProps) {
  const [personalOpen, setPersonalOpen] = useState(false)
  const activeNav = activePage === 'editor' ? 'workflows' : activePage

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="enterprise-logo">{branding.logoText}</div>
        <div className="enterprise-name">{branding.companyName}</div>
        <button className="mobile-close icon-button" aria-label="关闭导航" onClick={onClose}><Icon name="close" /></button>
      </div>
      <nav className="main-nav" aria-label="主导航">
        {navigation.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'nav-item-active' : ''}`}
                onClick={() => onNavigate(item.id)}
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
        <div className="personal-area">
          {personalOpen && <div className="personal-menu"><button><Icon name="user" size={15} />个人信息</button><button><Icon name="settings" size={15} />界面偏好</button><button onClick={onLogout}><Icon name="back" size={15} />退出登录</button></div>}
          <button className="sidebar-user" aria-label="个人设置" aria-expanded={personalOpen} onClick={() => setPersonalOpen(!personalOpen)}>
            <Avatar name={user.display_name} />
            <div><strong>{user.display_name}</strong><span>{roleLabel(user)}</span></div>
            <Icon name="more" size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
