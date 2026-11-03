import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { Icon } from './components/Icon'
import type { PageId } from './types'
import { Dashboard } from './pages/Dashboard'
import { Solutions } from './pages/Solutions'
import { TemplateMarket } from './pages/TemplateMarket'
import { Installed } from './pages/Installed'
import { Scenarios } from './pages/Scenarios'
import { Workflows } from './pages/Workflows'
import { WorkflowEditor } from './pages/WorkflowEditor'
import { Runs } from './pages/Runs'
import { SqlWorkspace } from './pages/SqlWorkspace'
import { Assets } from './pages/Assets'
import { DataSources } from './pages/DataSources'
import { Integrations } from './pages/Integrations'

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [workflowId, setWorkflowId] = useState('p-001')
  const [toast, setToast] = useState('')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  const openWorkflow = (id: string) => {
    setWorkflowId(id)
    setPage('editor')
  }

  let content
  switch (page) {
    case 'solutions':
      content = <Solutions onNotify={notify} />
      break
    case 'scenario-templates':
      content = <TemplateMarket kind="scenario" onNotify={notify} />
      break
    case 'workflow-templates':
      content = <TemplateMarket kind="workflow" onNotify={notify} />
      break
    case 'installed':
      content = <Installed onOpenWorkspace={() => setPage('scenarios')} onNotify={notify} />
      break
    case 'scenarios':
      content = <Scenarios onOpenWorkflow={openWorkflow} onNotify={notify} />
      break
    case 'workflows':
      content = <Workflows onOpen={openWorkflow} onNotify={notify} />
      break
    case 'editor':
      content = <WorkflowEditor workflowId={workflowId} onBack={() => setPage('workflows')} onNotify={notify} />
      break
    case 'runs':
      content = <Runs onNotify={notify} />
      break
    case 'sql':
      content = <SqlWorkspace onNotify={notify} />
      break
    case 'assets':
      content = <Assets />
      break
    case 'sources':
      content = <DataSources onNotify={notify} />
      break
    case 'integrations':
      content = <Integrations onNotify={notify} />
      break
    default:
      content = <Dashboard onNavigate={setPage} />
  }

  return (
    <>
      <AppShell activePage={page} onNavigate={setPage}>{content}</AppShell>
      {toast && <div className="toast" role="status"><span><Icon name="check" size={16} /></span>{toast}<button aria-label="关闭提示" onClick={() => setToast('')}><Icon name="close" size={15} /></button></div>}
    </>
  )
}
