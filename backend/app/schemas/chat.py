from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: str | None = Field(None, min_length=1)
    message: str = Field(..., min_length=1, max_length=4000)
    file_ids: list[str] = Field(default_factory=list, max_length=10)


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    response_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    title: str | None

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    conversation: ConversationResponse
    messages: list[MessageResponse]
    response_id: str | None = None
