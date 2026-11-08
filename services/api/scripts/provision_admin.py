import argparse

from sqlalchemy import select

from app.db import SessionLocal, init_db
from app.models.identity import Role, RoleBinding, User


def provision_admin(issuer: str, subject: str, tenant_id: str, email: str, name: str) -> None:
    init_db()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.issuer == issuer, User.subject == subject))
        if user is None:
            user = User(
                issuer=issuer,
                subject=subject,
                email=email,
                display_name=name,
            )
            db.add(user)
            db.flush()
        binding = db.scalar(
            select(RoleBinding).where(
                RoleBinding.user_id == user.id,
                RoleBinding.tenant_id == tenant_id,
                RoleBinding.workspace_id.is_(None),
            )
        )
        if binding is None:
            db.add(
                RoleBinding(
                    user_id=user.id,
                    tenant_id=tenant_id,
                    role=Role.ADMIN.value,
                )
            )
        else:
            binding.role = Role.ADMIN.value
        db.commit()
        print(f"[dwlle] Provisioned tenant Admin for {subject} in {tenant_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Provision a dwlle tenant administrator")
    parser.add_argument("--issuer", required=True)
    parser.add_argument("--subject", required=True)
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--email", default="")
    parser.add_argument("--name", default="")
    args = parser.parse_args()
    provision_admin(args.issuer, args.subject, args.tenant_id, args.email, args.name)


if __name__ == "__main__":
    main()
