from datetime import datetime

from pydantic import BaseModel

from .user import UserResponse


class FileResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    bytes: int
    openai_file_id: str
    created_at: datetime
    uploaded_by: UserResponse | None = None

    model_config = {"from_attributes": True}
