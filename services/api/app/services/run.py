from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.run import Run
from app.models.workflow import Workflow, WorkflowVersion
from app.models.workspace import Workspace


class RunService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, tenant_id: str, workflow_id: int) -> Run:
        workflow = self.db.get(Workflow, workflow_id)
        if workflow is None or workflow.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
        if workflow.current_version == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workflow must be published before creating a run",
            )
        version = self.db.scalar(
            select(WorkflowVersion).where(
                WorkflowVersion.workflow_id == workflow_id,
                WorkflowVersion.version == workflow.current_version,
            )
        )
        if version is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Published workflow version not found",
            )

        run = Run(
            tenant_id=tenant_id,
            workspace_id=workflow.workspace_id,
            workflow_id=workflow.id,
            workflow_version_id=version.id,
            status="queued",
            trigger_type="manual",
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def list_runs(
        self, tenant_id: str, workspace_id: int, workflow_id: int | None = None
    ) -> list[Run]:
        workspace = self.db.get(Workspace, workspace_id)
        if workspace is None or workspace.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
        if workflow_id is not None:
            workflow = self.db.get(Workflow, workflow_id)
            if (
                workflow is None
                or workflow.tenant_id != tenant_id
                or workflow.workspace_id != workspace_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found"
                )

        query = select(Run).where(Run.tenant_id == tenant_id, Run.workspace_id == workspace_id)
        if workflow_id is not None:
            query = query.where(Run.workflow_id == workflow_id)
        return list(self.db.scalars(query.order_by(Run.created_at.desc(), Run.id.desc())).all())

    def get(self, tenant_id: str, run_id: int) -> Run:
        run = self.db.get(Run, run_id)
        if run is None or run.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
        return run
