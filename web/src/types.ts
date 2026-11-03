export type PageId =
  | 'dashboard'
  | 'solutions'
  | 'scenario-templates'
  | 'workflow-templates'
  | 'installed'
  | 'scenarios'
  | 'workflows'
  | 'editor'
  | 'runs'
  | 'sql'
  | 'assets'
  | 'sources'
  | 'integrations'

export type Status = 'success' | 'running' | 'failed' | 'paused' | 'draft' | 'warning'

export interface Workflow {
  id: string
  name: string
  description: string
  status: Status
  schedule: string
  owner: string
  lastRun: string
  duration: string
  nodes: number
  tags: string[]
}

export interface RunInstance {
  id: string
  workflow: string
  status: Status
  startedAt: string
  duration: string
  trigger: string
  rows: string
  version: string
}
