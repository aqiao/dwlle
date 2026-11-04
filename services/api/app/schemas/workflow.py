from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.workspace import Environment


class WorkflowNode(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    type: str = Field(min_length=1, max_length=50)
    config: dict[str, object] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    source: str
    target: str


class WorkflowDefinition(BaseModel):
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)


class WorkflowCreate(BaseModel):
    workspace_id: int = Field(gt=0)
    scenario_id: int | None = Field(default=None, gt=0)
    workflow_key: str = Field(pattern=r"^[a-z][a-z0-9-]*$", min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=500)
    schedule: str = Field(default="manual", max_length=80)
    owner: str = Field(default="", max_length=80)
    environment: Environment = "development"


class WorkflowPublish(BaseModel):
    definition: WorkflowDefinition


class WorkflowRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: str
    workspace_id: int
    scenario_id: int | None
    workflow_key: str
    name: str
    description: str
    schedule: str
    owner: str
    environment: Environment
    status: Literal["draft", "published", "paused"]
    current_version: int
    created_at: datetime
    updated_at: datetime


class WorkflowVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workflow_id: int
    version: int
    definition: WorkflowDefinition
    status: Literal["draft", "published", "archived"]
    published_at: datetime
