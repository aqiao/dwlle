from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import CurrentUser
from app.models.identity import Role
from app.schemas.identity import WorkspaceMemberRead, WorkspaceMemberUpsert
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead
from app.services.identity import AuditService, AuthorizationService, IdentityService
from app.services.workspace import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkspaceRead:
    AuthorizationService(db).require_tenant(actor, payload.tenant_id, Role.ADMIN)
    workspace = WorkspaceService(db).create(payload.tenant_id, payload)
    AuditService(db).record(
        actor,
        "workspace.create",
        tenant_id=workspace.tenant_id,
        workspace_id=workspace.id,
        resource_type="workspace",
        resource_id=workspace.id,
    )
    return WorkspaceRead.model_validate(workspace)


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkspaceRead]:
    return [
        WorkspaceRead.model_validate(workspace)
        for workspace in WorkspaceService(db).list_for_user(actor)
    ]


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkspaceRead:
    workspace = AuthorizationService(db).require_workspace(actor, workspace_id, Role.VIEWER)
    return WorkspaceRead.model_validate(workspace)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberRead])
def list_workspace_members(
    workspace_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkspaceMemberRead]:
    AuthorizationService(db).require_workspace(actor, workspace_id, Role.ADMIN)
    return IdentityService(db).list_workspace_members(workspace_id)


@router.put("/{workspace_id}/members", response_model=WorkspaceMemberRead)
def set_workspace_member(
    workspace_id: int,
    payload: WorkspaceMemberUpsert,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkspaceMemberRead:
    workspace = AuthorizationService(db).require_workspace(actor, workspace_id, Role.ADMIN)
    member = IdentityService(db).set_workspace_member(workspace, payload.subject, payload.role)
    AuditService(db).record(
        actor,
        "workspace.member.assign",
        tenant_id=workspace.tenant_id,
        workspace_id=workspace.id,
        resource_type="workspace_member",
        resource_id=member.user_id,
    )
    return member


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member(
    workspace_id: int,
    user_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    workspace = AuthorizationService(db).require_workspace(actor, workspace_id, Role.ADMIN)
    IdentityService(db).remove_workspace_member(workspace, user_id)
    AuditService(db).record(
        actor,
        "workspace.member.remove",
        tenant_id=workspace.tenant_id,
        workspace_id=workspace.id,
        resource_type="workspace_member",
        resource_id=user_id,
    )
