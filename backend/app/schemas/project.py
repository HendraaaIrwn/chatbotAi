from datetime import datetime

from pydantic import BaseModel, Field

from .file import FileResponse
from .member import MemberResponse
from .prompt import PromptResponse


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(None, max_length=500)


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = Field(None, max_length=500)


class ProjectBriefResponse(BaseModel):
    id: str
    name: str
    description: str | None
    owner_id: str
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetailResponse(BaseModel):
    id: str
    name: str
    description: str | None
    owner_id: str
    role: str
    created_at: datetime
    updated_at: datetime
    prompt: PromptResponse | None
    files: list[FileResponse]
    members: list[MemberResponse]

    model_config = {"from_attributes": True}
