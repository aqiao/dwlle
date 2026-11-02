export type PageId =
  | 'dashboard'
  | 'pipelines'
  | 'editor'
  | 'runs'
  | 'sql'
  | 'assets'
  | 'sources'

export type Status = 'success' | 'running' | 'failed' | 'paused' | 'draft' | 'warning'

export interface Pipeline {
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
  pipeline: string
  status: Status
  startedAt: string
  duration: string
  trigger: string
  rows: string
  version: string
}
