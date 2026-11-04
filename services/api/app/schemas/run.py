from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

RunStatus = Literal["queued", "running", "succeeded", "failed", "cancelled"]
RunTrigger = Literal["manual", "schedule", "retry"]


class RunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: str
    workspace_id: int
    workflow_id: int
    workflow_version_id: int
    status: RunStatus
    trigger_type: RunTrigger
    attempt: int
    external_run_id: str | None
    error_summary: str
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    updated_at: datetime
