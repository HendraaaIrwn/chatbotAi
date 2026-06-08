from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.schemas.user import AuthResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.errors import AuthError as AuthErr, ConflictError
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise ConflictError("A user with this email already exists.")

    user = User(
        name=body.name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return {
        "user": UserResponse.model_validate(user).model_dump(),
        "token": token,
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise AuthErr("Invalid email or password.")

    token = create_access_token(user.id)
    return {
        "user": UserResponse.model_validate(user).model_dump(),
        "token": token,
    }


@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    return {"ok": True}
