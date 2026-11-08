from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.identity import RoleBinding, User
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate


class WorkspaceService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, tenant_id: str, payload: WorkspaceCreate) -> Workspace:
        existing = self.db.scalar(
            select(Workspace).where(
                Workspace.tenant_id == tenant_id,
                Workspace.workspace_key == payload.workspace_key,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace key already exists in this tenant",
            )

        workspace = Workspace(
            tenant_id=tenant_id,
            workspace_key=payload.workspace_key,
            name=payload.name,
            description=payload.description,
            environment=payload.environment,
        )
        self.db.add(workspace)
        self.db.commit()
        self.db.refresh(workspace)
        return workspace

    def list_for_user(self, actor: User) -> list[Workspace]:
        return list(
            self.db.scalars(
                select(Workspace)
                .join(
                    RoleBinding,
                    or_(
                        RoleBinding.workspace_id == Workspace.id,
                        and_(
                            RoleBinding.workspace_id.is_(None),
                            RoleBinding.tenant_id == Workspace.tenant_id,
                        ),
                    ),
                )
                .where(RoleBinding.user_id == actor.id)
                .distinct()
                .order_by(Workspace.name)
            ).all()
        )

    def get(self, tenant_id: str, workspace_id: int) -> Workspace:
        workspace = self.db.get(Workspace, workspace_id)
        if workspace is None or workspace.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )
        return workspace
