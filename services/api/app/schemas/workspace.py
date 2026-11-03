from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Environment = Literal["development", "test", "production"]


class WorkspaceCreate(BaseModel):
    workspace_key: str = Field(pattern=r"^[a-z][a-z0-9-]*$", min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=500)
    environment: Environment = "development"


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: str
    workspace_key: str
    name: str
    description: str
    environment: Environment
    created_at: datetime
    updated_at: datetime
