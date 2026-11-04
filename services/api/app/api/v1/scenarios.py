from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.workspaces import tenant_header
from app.db import get_db
from app.schemas.scenario import ScenarioCreate, ScenarioRead
from app.services.scenario import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.post("", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def create_scenario(
    payload: ScenarioCreate,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> ScenarioRead:
    return ScenarioRead.model_validate(ScenarioService(db).create(tenant_id, payload))


@router.get("", response_model=list[ScenarioRead])
def list_scenarios(
    workspace_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ScenarioRead]:
    return [
        ScenarioRead.model_validate(scenario)
        for scenario in ScenarioService(db).list_scenarios(tenant_id, workspace_id)
    ]


@router.get("/{scenario_id}", response_model=ScenarioRead)
def get_scenario(
    scenario_id: int,
    tenant_id: Annotated[str, Depends(tenant_header)],
    db: Annotated[Session, Depends(get_db)],
) -> ScenarioRead:
    return ScenarioRead.model_validate(ScenarioService(db).get(tenant_id, scenario_id))
