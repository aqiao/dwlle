import { useState } from 'react'
import { AppShell } from './components/AppShell'
import { Icon } from './components/Icon'
import type { PageId } from './types'
import { Dashboard } from './pages/Dashboard'
import { Solutions } from './pages/Solutions'
import { TemplateMarket } from './pages/TemplateMarket'
import { Installed } from './pages/Installed'
import { Scenarios } from './pages/Scenarios'
import { Pipelines } from './pages/Pipelines'
import { PipelineEditor } from './pages/PipelineEditor'
import { Runs } from './pages/Runs'
import { SqlWorkspace } from './pages/SqlWorkspace'
import { Assets } from './pages/Assets'
import { DataSources } from './pages/DataSources'
import { Integrations } from './pages/Integrations'

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [pipelineId, setPipelineId] = useState('p-001')
  const [toast, setToast] = useState('')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  const openPipeline = (id: string) => {
    setPipelineId(id)
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
    case 'pipeline-templates':
      content = <TemplateMarket kind="pipeline" onNotify={notify} />
      break
    case 'installed':
      content = <Installed onOpenWorkspace={() => setPage('scenarios')} onNotify={notify} />
      break
    case 'scenarios':
      content = <Scenarios onOpenPipeline={openPipeline} onNotify={notify} />
      break
    case 'pipelines':
      content = <Pipelines onOpen={openPipeline} onNotify={notify} />
      break
    case 'editor':
      content = <PipelineEditor pipelineId={pipelineId} onBack={() => setPage('pipelines')} onNotify={notify} />
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
