import type { PageId } from '../types'
import { Icon } from './Icon'

interface TopbarProps {
  workspace: string
  environment: string
  onWorkspaceChange: (workspace: string) => void
  onEnvironmentChange: (environment: string) => void
  onOpenMobile: () => void
  onNavigate: (page: PageId) => void
}

export function Topbar({ workspace, environment, onWorkspaceChange, onEnvironmentChange, onOpenMobile, onNavigate }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu icon-button" aria-label="打开导航" onClick={onOpenMobile}><Icon name="menu" /></button>
        <label className="workspace-select"><span>当前空间</span><select aria-label="切换工作空间" value={workspace} onChange={(event) => onWorkspaceChange(event.target.value)}><option>零售经营分析</option><option>财务数据中心</option><option>全部工作空间</option></select></label>
        <label className="environment-select"><span>环境</span><select aria-label="切换环境" value={environment} onChange={(event) => onEnvironmentChange(event.target.value)}><option>生产环境</option><option>开发环境</option><option>测试环境</option></select></label>
      </div>
      <div className="topbar-right">
        <label className="global-search">
          <Icon name="search" size={17} />
          <input aria-label="全局搜索" placeholder="搜索 工作流、数据表…" />
          <kbd>⌘ K</kbd>
        </label>
        <button className="icon-button notification-button" aria-label="通知"><Icon name="bell" size={19} /><span /></button>
        <button className="workspace-settings-button" aria-label="工作空间设置" onClick={() => onNavigate('integrations')}><Icon name="settings" size={17} /><span>工作空间设置</span></button>
      </div>
    </header>
  )
}
