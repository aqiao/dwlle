from pydantic import BaseModel, ConfigDict, Field

from app.models.identity import Role


class TenantRoleRead(BaseModel):
    tenant_id: str
    role: Role


class WorkspaceRoleRead(BaseModel):
    workspace_id: int
    tenant_id: str
    workspace_name: str
    role: Role


class CurrentUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    email: str
    display_name: str
    tenants: list[TenantRoleRead]
    workspaces: list[WorkspaceRoleRead]


class WorkspaceMemberUpsert(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    role: Role


class WorkspaceMemberRead(BaseModel):
    user_id: int
    subject: str
    email: str
    display_name: str
    role: Role
