import { useState, type ReactNode } from 'react'
import type { PageId } from '../types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface AppShellProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [workspace, setWorkspace] = useState('零售经营分析')
  const [environment, setEnvironment] = useState('生产环境')

  const navigate = (page: PageId) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-backdrop" aria-label="关闭导航" onClick={() => setMobileOpen(false)} />}
      <Sidebar activePage={activePage} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={navigate} />
      <div className="main-frame">
        <Topbar
          workspace={workspace}
          environment={environment}
          onWorkspaceChange={setWorkspace}
          onEnvironmentChange={setEnvironment}
          onOpenMobile={() => setMobileOpen(true)}
          onNavigate={navigate}
        />
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
