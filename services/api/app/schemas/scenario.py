from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ScenarioCreate(BaseModel):
    workspace_id: int = Field(gt=0)
    scenario_key: str = Field(pattern=r"^[a-z][a-z0-9-]*$", min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=500)
    owner: str = Field(default="", max_length=80)
    sla: str = Field(default="", max_length=120)


class ScenarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: str
    workspace_id: int
    scenario_key: str
    name: str
    description: str
    owner: str
    sla: str
    created_at: datetime
    updated_at: datetime
