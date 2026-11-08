from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.identity import AuditEvent, Role, RoleBinding, User
from app.models.run import Run
from app.models.scenario import Scenario
from app.models.workflow import Workflow
from app.models.workspace import Workspace
from app.schemas.identity import (
    CurrentUserRead,
    TenantRoleRead,
    WorkspaceMemberRead,
    WorkspaceRoleRead,
)

ROLE_LEVELS = {Role.VIEWER: 1, Role.DEVELOPER: 2, Role.ADMIN: 3}


class IdentityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert_user(self, claims: dict[str, Any]) -> User:
        issuer = str(claims["iss"])
        subject = str(claims["sub"])
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token subject is required"
            )
        user = self.db.scalar(
            select(User).where(User.issuer == issuer, User.subject == subject)
        )
        email = str(claims.get("email", ""))
        display_name = str(
            claims.get("name") or claims.get("preferred_username") or email or subject
        )
        if user is None:
            user = User(
                issuer=issuer,
                subject=subject,
                email=email,
                display_name=display_name,
            )
            self.db.add(user)
        elif user.email != email or user.display_name != display_name:
            user.email = email
            user.display_name = display_name
        self.db.commit()
        self.db.refresh(user)
        return user

    def current_user(self, user: User) -> CurrentUserRead:
        bindings = list(
            self.db.scalars(select(RoleBinding).where(RoleBinding.user_id == user.id)).all()
        )
        tenant_roles = [
            TenantRoleRead(tenant_id=binding.tenant_id, role=Role(binding.role))
            for binding in bindings
            if binding.workspace_id is None
        ]
        workspace_ids = [binding.workspace_id for binding in bindings if binding.workspace_id]
        tenant_ids = [item.tenant_id for item in tenant_roles]
        workspaces = (
            list(
                self.db.scalars(
                    select(Workspace)
                    .where(
                        or_(
                            Workspace.id.in_(workspace_ids),
                            Workspace.tenant_id.in_(tenant_ids),
                        )
                    )
                    .order_by(Workspace.name)
                ).all()
            )
            if bindings
            else []
        )
        workspace_roles = []
        for workspace in workspaces:
            applicable_roles = [
                Role(binding.role)
                for binding in bindings
                if binding.tenant_id == workspace.tenant_id
                and binding.workspace_id in (None, workspace.id)
            ]
            effective_role = max(applicable_roles, key=lambda role: ROLE_LEVELS[role])
            workspace_roles.append(
                WorkspaceRoleRead(
                    workspace_id=workspace.id,
                    tenant_id=workspace.tenant_id,
                    workspace_name=workspace.name,
                    role=effective_role,
                )
            )
        return CurrentUserRead(
            id=user.id,
            subject=user.subject,
            email=user.email,
            display_name=user.display_name,
            tenants=tenant_roles,
            workspaces=workspace_roles,
        )

    def list_workspace_members(self, workspace_id: int) -> list[WorkspaceMemberRead]:
        rows = self.db.execute(
            select(User, RoleBinding)
            .join(RoleBinding, RoleBinding.user_id == User.id)
            .where(RoleBinding.workspace_id == workspace_id)
            .order_by(User.display_name, User.subject)
        ).all()
        return [
            WorkspaceMemberRead(
                user_id=user.id,
                subject=user.subject,
                email=user.email,
                display_name=user.display_name,
                role=Role(binding.role),
            )
            for user, binding in rows
        ]

    def set_workspace_member(
        self, workspace: Workspace, subject: str, role: Role
    ) -> WorkspaceMemberRead:
        user = self.db.scalar(
            select(User).where(User.issuer == settings.oidc_issuer, User.subject == subject)
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User must authenticate before receiving a workspace role",
            )
        binding = self.db.scalar(
            select(RoleBinding).where(
                RoleBinding.user_id == user.id,
                RoleBinding.tenant_id == workspace.tenant_id,
                RoleBinding.workspace_id == workspace.id,
            )
        )
        if binding is None:
            binding = RoleBinding(
                user_id=user.id,
                tenant_id=workspace.tenant_id,
                workspace_id=workspace.id,
                role=role.value,
            )
            self.db.add(binding)
        else:
            binding.role = role.value
        self.db.commit()
        return WorkspaceMemberRead(
            user_id=user.id,
            subject=user.subject,
            email=user.email,
            display_name=user.display_name,
            role=role,
        )

    def remove_workspace_member(self, workspace: Workspace, user_id: int) -> None:
        binding = self.db.scalar(
            select(RoleBinding).where(
                RoleBinding.user_id == user_id,
                RoleBinding.tenant_id == workspace.tenant_id,
                RoleBinding.workspace_id == workspace.id,
            )
        )
        if binding is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Workspace member not found"
            )
        self.db.delete(binding)
        self.db.commit()


class AuditService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(
        self,
        actor: User,
        action: str,
        outcome: str = "success",
        tenant_id: str | None = None,
        workspace_id: int | None = None,
        resource_type: str = "",
        resource_id: str | int = "",
    ) -> None:
        self.db.add(
            AuditEvent(
                actor_user_id=actor.id,
                action=action,
                outcome=outcome,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                resource_type=resource_type,
                resource_id=str(resource_id),
            )
        )
        self.db.commit()


class AuthorizationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.audit = AuditService(db)

    def require_tenant(self, actor: User, tenant_id: str, minimum_role: Role) -> None:
        bindings = self.db.scalars(
            select(RoleBinding).where(
                RoleBinding.user_id == actor.id,
                RoleBinding.tenant_id == tenant_id,
                RoleBinding.workspace_id.is_(None),
            )
        ).all()
        if not self._has_role(list(bindings), minimum_role):
            self._deny(actor, "tenant.access", tenant_id)
        return None

    def require_workspace(
        self, actor: User, workspace_id: int, minimum_role: Role
    ) -> Workspace:
        workspace = self.db.get(Workspace, workspace_id)
        if workspace is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found"
            )
        bindings = self.db.scalars(
            select(RoleBinding).where(
                RoleBinding.user_id == actor.id,
                RoleBinding.tenant_id == workspace.tenant_id,
                or_(
                    RoleBinding.workspace_id == workspace.id,
                    RoleBinding.workspace_id.is_(None),
                ),
            )
        ).all()
        if not self._has_role(list(bindings), minimum_role):
            self._deny(actor, "workspace.access", workspace.tenant_id, workspace.id)
        return workspace

    def require_scenario(self, actor: User, scenario_id: int, minimum_role: Role) -> Scenario:
        scenario = self.db.get(Scenario, scenario_id)
        if scenario is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
        self.require_workspace(actor, scenario.workspace_id, minimum_role)
        return scenario

    def require_workflow(self, actor: User, workflow_id: int, minimum_role: Role) -> Workflow:
        workflow = self.db.get(Workflow, workflow_id)
        if workflow is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
        self.require_workspace(actor, workflow.workspace_id, minimum_role)
        return workflow

    def require_run(self, actor: User, run_id: int, minimum_role: Role) -> Run:
        run = self.db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
        self.require_workspace(actor, run.workspace_id, minimum_role)
        return run

    @staticmethod
    def _has_role(bindings: list[RoleBinding], minimum_role: Role) -> bool:
        return any(
            ROLE_LEVELS[Role(binding.role)] >= ROLE_LEVELS[minimum_role]
            for binding in bindings
        )

    def _deny(
        self,
        actor: User,
        action: str,
        tenant_id: str,
        workspace_id: int | None = None,
    ) -> None:
        self.audit.record(
            actor,
            action,
            outcome="denied",
            tenant_id=tenant_id,
            workspace_id=workspace_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Required workspace role is not granted",
        )
