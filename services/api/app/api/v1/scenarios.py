from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import CurrentUser
from app.models.identity import Role
from app.schemas.scenario import ScenarioCreate, ScenarioRead
from app.services.identity import AuditService, AuthorizationService
from app.services.scenario import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.post("", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def create_scenario(
    payload: ScenarioCreate,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ScenarioRead:
    workspace = AuthorizationService(db).require_workspace(
        actor, payload.workspace_id, Role.DEVELOPER
    )
    scenario = ScenarioService(db).create(workspace.tenant_id, payload)
    AuditService(db).record(
        actor,
        "scenario.create",
        tenant_id=workspace.tenant_id,
        workspace_id=workspace.id,
        resource_type="scenario",
        resource_id=scenario.id,
    )
    return ScenarioRead.model_validate(scenario)


@router.get("", response_model=list[ScenarioRead])
def list_scenarios(
    workspace_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> list[ScenarioRead]:
    workspace = AuthorizationService(db).require_workspace(actor, workspace_id, Role.VIEWER)
    return [
        ScenarioRead.model_validate(scenario)
        for scenario in ScenarioService(db).list_scenarios(workspace.tenant_id, workspace_id)
    ]


@router.get("/{scenario_id}", response_model=ScenarioRead)
def get_scenario(
    scenario_id: int,
    actor: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ScenarioRead:
    scenario = AuthorizationService(db).require_scenario(actor, scenario_id, Role.VIEWER)
    return ScenarioRead.model_validate(ScenarioService(db).get(scenario.tenant_id, scenario_id))
