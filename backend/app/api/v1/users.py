from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_optional
from app.models.models import User
from app.schemas.user import UserResponse

router = APIRouter(tags=["users"])


@router.get("/me")
def get_me(user: User | None = Depends(get_current_user_optional)):
    return {
        "user": UserResponse.model_validate(user).model_dump() if user else None,
    }
