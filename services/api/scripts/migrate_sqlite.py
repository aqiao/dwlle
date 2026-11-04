import sqlite3
from datetime import datetime
from pathlib import Path

from sqlalchemy import select

from app.db import SessionLocal, init_db
from app.models.workspace import Workspace


def migrate() -> None:
    sqlite_path = Path("dwlle.db")
    if not sqlite_path.exists():
        print("[dwlle] No SQLite database found, skipping data migration")
        return

    init_db()
    connection = sqlite3.connect(sqlite_path)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        "SELECT tenant_id, workspace_key, name, description, environment, "
        "created_at, updated_at FROM workspaces"
    ).fetchall()
    connection.close()

    migrated = 0
    skipped = 0
    with SessionLocal() as db:
        for row in rows:
            existing = db.scalar(
                select(Workspace).where(
                    Workspace.tenant_id == row["tenant_id"],
                    Workspace.workspace_key == row["workspace_key"],
                )
            )
            if existing is not None:
                skipped += 1
                continue
            db.add(
                Workspace(
                    tenant_id=row["tenant_id"],
                    workspace_key=row["workspace_key"],
                    name=row["name"],
                    description=row["description"],
                    environment=row["environment"],
                    created_at=datetime.fromisoformat(row["created_at"]),
                    updated_at=datetime.fromisoformat(row["updated_at"]),
                )
            )
            migrated += 1
        db.commit()

    print(f"[dwlle] Migrated {migrated} workspaces, skipped {skipped} existing workspaces")


if __name__ == "__main__":
    migrate()
