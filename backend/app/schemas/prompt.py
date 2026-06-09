from datetime import datetime

from pydantic import BaseModel, Field


class PromptUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)


class PromptResponse(BaseModel):
    id: str
    content: str
    updated_at: datetime

    model_config = {"from_attributes": True}
