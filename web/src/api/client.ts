import { getAccessToken } from '../auth/oidc'
import type { CurrentUser } from '../auth/types'

export interface Workspace {
  id: number
  tenant_id: string
  workspace_key: string
  name: string
  description: string
  environment: 'development' | 'test' | 'production'
  created_at: string
  updated_at: string
}

async function request<T>(path: string): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (response.status === 401) {
    window.dispatchEvent(new Event('dwlle:unauthorized'))
  }
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getCurrentUser() {
  return request<CurrentUser>('/auth/me')
}

export function listWorkspaces() {
  return request<Workspace[]>('/workspaces')
}
