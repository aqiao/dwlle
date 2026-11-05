from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scenario import Scenario
from app.models.workspace import Workspace
from app.schemas.scenario import ScenarioCreate


class ScenarioService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, tenant_id: str, payload: ScenarioCreate) -> Scenario:
        workspace = self.db.get(Workspace, payload.workspace_id)
        if workspace is None or workspace.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
        existing = self.db.scalar(
            select(Scenario).where(
                Scenario.tenant_id == tenant_id,
                Scenario.workspace_id == payload.workspace_id,
                Scenario.scenario_key == payload.scenario_key,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Scenario key already exists"
            )

        scenario = Scenario(
            tenant_id=tenant_id,
            workspace_id=payload.workspace_id,
            scenario_key=payload.scenario_key,
            name=payload.name,
            description=payload.description,
            owner=payload.owner,
            sla=payload.sla,
        )
        self.db.add(scenario)
        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    def list_scenarios(self, tenant_id: str, workspace_id: int) -> list[Scenario]:
        return list(
            self.db.scalars(
                select(Scenario)
                .where(Scenario.tenant_id == tenant_id, Scenario.workspace_id == workspace_id)
                .order_by(Scenario.name)
            ).all()
        )

    def get(self, tenant_id: str, scenario_id: int) -> Scenario:
        scenario = self.db.get(Scenario, scenario_id)
        if scenario is None or scenario.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
        return scenario
