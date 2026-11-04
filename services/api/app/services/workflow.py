from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scenario import Scenario
from app.models.workflow import Workflow, WorkflowVersion
from app.models.workspace import Workspace
from app.schemas.workflow import WorkflowCreate, WorkflowDefinition


class WorkflowService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, tenant_id: str, payload: WorkflowCreate) -> Workflow:
        workspace = self.db.get(Workspace, payload.workspace_id)
        if workspace is None or workspace.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
        if payload.scenario_id is not None:
            scenario = self.db.get(Scenario, payload.scenario_id)
            if (
                scenario is None
                or scenario.tenant_id != tenant_id
                or scenario.workspace_id != payload.workspace_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found"
                )
        existing = self.db.scalar(
            select(Workflow).where(
                Workflow.tenant_id == tenant_id,
                Workflow.workspace_id == payload.workspace_id,
                Workflow.workflow_key == payload.workflow_key,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Workflow key already exists"
            )

        workflow = Workflow(
            tenant_id=tenant_id,
            workspace_id=payload.workspace_id,
            scenario_id=payload.scenario_id,
            workflow_key=payload.workflow_key,
            name=payload.name,
            description=payload.description,
            schedule=payload.schedule,
            owner=payload.owner,
            environment=payload.environment,
        )
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def list_workflows(self, tenant_id: str, workspace_id: int) -> list[Workflow]:
        return list(
            self.db.scalars(
                select(Workflow)
                .where(Workflow.tenant_id == tenant_id, Workflow.workspace_id == workspace_id)
                .order_by(Workflow.name)
            ).all()
        )

    def get(self, tenant_id: str, workflow_id: int) -> Workflow:
        workflow = self.db.get(Workflow, workflow_id)
        if workflow is None or workflow.tenant_id != tenant_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
        return workflow

    def publish(
        self, tenant_id: str, workflow_id: int, definition: WorkflowDefinition
    ) -> WorkflowVersion:
        workflow = self.get(tenant_id, workflow_id)
        self._validate_definition(definition)
        version_number = workflow.current_version + 1
        version = WorkflowVersion(
            workflow_id=workflow.id,
            version=version_number,
            definition=definition.model_dump(),
            status="published",
        )
        workflow.current_version = version_number
        workflow.status = "published"
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        return version

    def list_versions(self, tenant_id: str, workflow_id: int) -> list[WorkflowVersion]:
        self.get(tenant_id, workflow_id)
        return list(
            self.db.scalars(
                select(WorkflowVersion)
                .where(WorkflowVersion.workflow_id == workflow_id)
                .order_by(WorkflowVersion.version.desc())
            ).all()
        )

    @staticmethod
    def _validate_definition(definition: WorkflowDefinition) -> None:
        node_ids = [node.id for node in definition.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Node IDs must be unique"
            )
        known_ids = set(node_ids)
        for edge in definition.edges:
            if edge.source not in known_ids or edge.target not in known_ids:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Edge references an unknown node",
                )
            if edge.source == edge.target:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Self-loop is not allowed",
                )

        adjacency: dict[str, list[str]] = {node_id: [] for node_id in node_ids}
        for edge in definition.edges:
            adjacency[edge.source].append(edge.target)
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(node_id: str) -> None:
            if node_id in visiting:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Workflow contains a cycle",
                )
            if node_id in visited:
                return
            visiting.add(node_id)
            for target in adjacency[node_id]:
                visit(target)
            visiting.remove(node_id)
            visited.add(node_id)

        for node_id in node_ids:
            if node_id not in visited:
                visit(node_id)
