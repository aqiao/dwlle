from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import CurrentUser
from app.models.identity import Role
from app.schemas.run import RunRead
from app.services.identity import AuditService, AuthorizationService
from app.services.run import RunService

router = APIRouter(tags=["runs"])


@router.post("/workflows/{workflow_id}/runs", response_model=RunRead, status_code=201)
def create_run(
    workflow_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> RunRead:
    workflow = AuthorizationService(db).require_workflow(actor, workflow_id, Role.DEVELOPER)
    run = RunService(db).create(workflow.tenant_id, workflow_id)
    AuditService(db).record(
        actor,
        "run.create",
        tenant_id=workflow.tenant_id,
        workspace_id=workflow.workspace_id,
        resource_type="run",
        resource_id=run.id,
    )
    return RunRead.model_validate(run)


@router.get("/runs", response_model=list[RunRead])
def list_runs(
    workspace_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    workflow_id: int | None = None,
) -> list[RunRead]:
    workspace = AuthorizationService(db).require_workspace(actor, workspace_id, Role.VIEWER)
    return [
        RunRead.model_validate(run)
        for run in RunService(db).list_runs(workspace.tenant_id, workspace_id, workflow_id)
    ]


@router.get("/runs/{run_id}", response_model=RunRead)
def get_run(
    run_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> RunRead:
    run = AuthorizationService(db).require_run(actor, run_id, Role.VIEWER)
    return RunRead.model_validate(RunService(db).get(run.tenant_id, run_id))
