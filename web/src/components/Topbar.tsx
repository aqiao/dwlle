import { useEffect, useState } from 'react'
import type { PageId } from '../types'
import { listWorkspaces } from '../api/client'
import { Icon } from './Icon'

interface TopbarProps {
  workspace: string
  environment: string
  onWorkspaceChange: (workspace: string) => void
  onEnvironmentChange: (environment: string) => void
  onOpenMobile: () => void
  onNavigate: (page: PageId) => void
}

const fallbackWorkspaces = ['零售经营分析', '财务数据中心']

export function Topbar({ workspace, environment, onWorkspaceChange, onEnvironmentChange, onOpenMobile, onNavigate }: TopbarProps) {
  const [options, setOptions] = useState(fallbackWorkspaces)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listWorkspaces()
      .then((data) => {
        if (!active) return
        setOptions(data.map((item) => item.name))
        setError('')
        if (data.length > 0) onWorkspaceChange(data[0].name)
      })
      .catch(() => {
        if (active) setError('后端不可用，显示演示数据')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [onWorkspaceChange])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu icon-button" aria-label="打开导航" onClick={onOpenMobile}><Icon name="menu" /></button>
        <label className="workspace-select"><span>当前空间</span><select aria-label="切换工作空间" aria-busy={loading} value={workspace} onChange={(event) => onWorkspaceChange(event.target.value)}>
          {loading && <option>加载中…</option>}
          {!loading && options.map((name) => <option key={name}>{name}</option>)}
          <option>全部工作空间</option>
        </select></label>
        <label className="environment-select"><span>环境</span><select aria-label="切换环境" value={environment} onChange={(event) => onEnvironmentChange(event.target.value)}><option>生产环境</option><option>开发环境</option><option>测试环境</option></select></label>
        {error && <span className="workspace-api-status" role="alert">{error}</span>}
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
