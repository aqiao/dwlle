from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.workspaces import tenant_header
from app.db import get_db
from app.schemas.run import RunRead
from app.services.run import RunService

router = APIRouter(tags=["runs"])


@router.post("/workflows/{workflow_id}/runs", response_model=RunRead, status_code=201)
def create_run(
    workflow_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> RunRead:
    return RunRead.model_validate(RunService(db).create(tenant_id, workflow_id))


@router.get("/runs", response_model=list[RunRead])
def list_runs(
    workspace_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
    workflow_id: int | None = None,
) -> list[RunRead]:
    return [
        RunRead.model_validate(run)
        for run in RunService(db).list_runs(tenant_id, workspace_id, workflow_id)
    ]


@router.get("/runs/{run_id}", response_model=RunRead)
def get_run(
    run_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> RunRead:
    return RunRead.model_validate(RunService(db).get(tenant_id, run_id))
