from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import CurrentUser
from app.models.identity import Role
from app.schemas.workflow import WorkflowCreate, WorkflowPublish, WorkflowRead, WorkflowVersionRead
from app.services.identity import AuditService, AuthorizationService
from app.services.workflow import WorkflowService

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED)
def create_workflow(
    payload: WorkflowCreate,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkflowRead:
    workspace = AuthorizationService(db).require_workspace(
        actor, payload.workspace_id, Role.DEVELOPER
    )
    workflow = WorkflowService(db).create(workspace.tenant_id, payload)
    AuditService(db).record(
        actor,
        "workflow.create",
        tenant_id=workspace.tenant_id,
        workspace_id=workspace.id,
        resource_type="workflow",
        resource_id=workflow.id,
    )
    return WorkflowRead.model_validate(workflow)


@router.get("", response_model=list[WorkflowRead])
def list_workflows(
    workspace_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkflowRead]:
    workspace = AuthorizationService(db).require_workspace(actor, workspace_id, Role.VIEWER)
    return [
        WorkflowRead.model_validate(workflow)
        for workflow in WorkflowService(db).list_workflows(workspace.tenant_id, workspace_id)
    ]


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(
    workflow_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkflowRead:
    workflow = AuthorizationService(db).require_workflow(actor, workflow_id, Role.VIEWER)
    return WorkflowRead.model_validate(WorkflowService(db).get(workflow.tenant_id, workflow_id))


@router.post("/{workflow_id}/publish", response_model=WorkflowVersionRead)
def publish_workflow(
    workflow_id: int,
    payload: WorkflowPublish,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> WorkflowVersionRead:
    workflow = AuthorizationService(db).require_workflow(actor, workflow_id, Role.DEVELOPER)
    version = WorkflowService(db).publish(
        workflow.tenant_id, workflow_id, payload.definition
    )
    AuditService(db).record(
        actor,
        "workflow.publish",
        tenant_id=workflow.tenant_id,
        workspace_id=workflow.workspace_id,
        resource_type="workflow_version",
        resource_id=version.id,
    )
    return WorkflowVersionRead.model_validate(version)


@router.get("/{workflow_id}/versions", response_model=list[WorkflowVersionRead])
def list_workflow_versions(
    workflow_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[WorkflowVersionRead]:
    workflow = AuthorizationService(db).require_workflow(actor, workflow_id, Role.VIEWER)
    return [
        WorkflowVersionRead.model_validate(version)
        for version in WorkflowService(db).list_versions(workflow.tenant_id, workflow_id)
    ]
