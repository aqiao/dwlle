export type Role = 'Admin' | 'Developer' | 'Viewer'

export interface TenantRole {
  tenant_id: string
  role: Role
}

export interface WorkspaceRole {
  workspace_id: number
  tenant_id: string
  workspace_name: string
  role: Role
}

export interface CurrentUser {
  id: number
  subject: string
  email: string
  display_name: string
  tenants: TenantRole[]
  workspaces: WorkspaceRole[]
}
