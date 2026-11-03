from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead
from app.services.workspace import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def tenant_header(x_tenant_id: Annotated[str | None, Header()] = None) -> str:
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Tenant-Id header is required",
        )
    return x_tenant_id


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> WorkspaceRead:
    return WorkspaceRead.model_validate(WorkspaceService(db).create(tenant_id, payload))


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkspaceRead]:
    return [
        WorkspaceRead.model_validate(workspace)
        for workspace in WorkspaceService(db).list(tenant_id)
    ]


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> WorkspaceRead:
    return WorkspaceRead.model_validate(WorkspaceService(db).get(tenant_id, workspace_id))
