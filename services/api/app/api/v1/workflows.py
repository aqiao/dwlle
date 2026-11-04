from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.workspaces import tenant_header
from app.db import get_db
from app.schemas.workflow import WorkflowCreate, WorkflowPublish, WorkflowRead, WorkflowVersionRead
from app.services.workflow import WorkflowService

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED)
def create_workflow(
    payload: WorkflowCreate,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> WorkflowRead:
    return WorkflowRead.model_validate(WorkflowService(db).create(tenant_id, payload))


@router.get("", response_model=list[WorkflowRead])
def list_workflows(
    workspace_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkflowRead]:
    return [
        WorkflowRead.model_validate(workflow)
        for workflow in WorkflowService(db).list_workflows(tenant_id, workspace_id)
    ]


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(
    workflow_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> WorkflowRead:
    return WorkflowRead.model_validate(WorkflowService(db).get(tenant_id, workflow_id))


@router.post("/{workflow_id}/publish", response_model=WorkflowVersionRead)
def publish_workflow(
    workflow_id: int,
    payload: WorkflowPublish,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> WorkflowVersionRead:
    return WorkflowVersionRead.model_validate(
        WorkflowService(db).publish(tenant_id, workflow_id, payload.definition)
    )


@router.get("/{workflow_id}/versions", response_model=list[WorkflowVersionRead])
def list_workflow_versions(
    workflow_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkflowVersionRead]:
    return [
        WorkflowVersionRead.model_validate(version)
        for version in WorkflowService(db).list_versions(tenant_id, workflow_id)
    ]
