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
  const response = await fetch(`/api/v1${path}`, {
    headers: { 'X-Tenant-Id': 'tenant-a' },
  })
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function listWorkspaces() {
  return request<Workspace[]>('/workspaces')
}
