from datetime import datetime

from pydantic import BaseModel, Field

from .user import UserResponse


class MemberCreateRequest(BaseModel):
    email: str = Field(..., max_length=255)
    role: str = Field(..., pattern=r"^(editor|viewer)$")


class MemberUpdateRequest(BaseModel):
    role: str = Field(..., pattern=r"^(editor|viewer)$")


class MemberResponse(BaseModel):
    id: str
    role: str
    created_at: datetime
    user: UserResponse

    model_config = {"from_attributes": True}
