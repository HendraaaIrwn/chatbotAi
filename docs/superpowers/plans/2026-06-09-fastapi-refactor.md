# FastAPI Backend Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port seluruh 17 Next.js API route handlers ke FastAPI dengan SQLAlchemy + SQLite, JWT Bearer token auth, dan struktur clean architecture. Frontend Next.js tetap berjalan, hanya `lib/api.ts` diupdate ke Bearer token.

**Architecture:** Monorepo dengan folder `backend/`. FastAPI app dengan dependency injection untuk auth/authorization. Service layer terpisah dari route handlers. SQLAlchemy models + Alembic migrations. Pydantic schemas untuk request/response validation.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, python-jose, passlib[bcrypt], openai PyPI, pytest + httpx, uv/poetry

---

### Task 0: Backend Scaffold & Dependencies

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env`
- Create: `backend/app/__init__.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Create backend directory structure**

```bash
mkdir -p backend/app/{api/v1,core,models,schemas,services}
mkdir -p backend/tests
mkdir -p backend/alembic/versions
```

- [ ] **Step 2: Write pyproject.toml**

```toml
[project]
name = "chatbot-yellow-ai-backend"
version = "0.1.0"
description = "FastAPI backend for chatbotYellowAi"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "sqlalchemy>=2.0.36",
    "alembic>=1.14.1",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.19",
    "openai>=1.70.0",
    "cuid2>=0.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.28.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project.scripts]
dev = "uvicorn app.main:app --reload --port 8000"
test = "pytest"
migrate = "alembic upgrade head"
migration = "alembic revision --autogenerate -m"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 3: Write backend/.env**

```env
DATABASE_URL=sqlite:///./dev.db
JWT_SECRET=replace-with-long-random-secret-at-least-24-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 4: Install dependencies**

```bash
cd backend && pip install -e ".[dev]"
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "chore: scaffold fastapi backend structure"
```

---

### Task 1: Core — Settings & App Config

**Files:**
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`

- [ ] **Step 1: Write config.py**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8"
    )

    DATABASE_URL: str = "sqlite:///./dev.db"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-5.4-mini"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
```

- [ ] **Step 2: Verify config loads**

```bash
cd backend && python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

Expected output: `sqlite:///./dev.db`

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/config.py
git commit -m "feat: add settings via pydantic-settings"
```

---

### Task 2: Core — SQLAlchemy Models & Database Session

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/models.py`
- Create: `backend/app/models/database.py`

- [ ] **Step 1: Write database.py (engine + session)**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Write models.py (all 7 models)**

```python
import cuid2
from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, func, Text
)
from sqlalchemy.orm import relationship
from app.models.database import Base

CUID_GENERATOR = cuid2.Cuid()

def generate_cuid():
    return CUID_GENERATOR.generate()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_cuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owned_projects = relationship(
        "Project", back_populates="owner",
        foreign_keys="Project.owner_id", cascade="all, delete-orphan"
    )
    memberships = relationship(
        "ProjectMember", back_populates="user",
        cascade="all, delete-orphan"
    )
    uploads = relationship(
        "ProjectFile", back_populates="uploaded_by",
        cascade="all, delete-orphan"
    )
    conversations = relationship(
        "Conversation", back_populates="user",
        cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message", back_populates="user",
        cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_cuid)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship(
        "User", back_populates="owned_projects",
        foreign_keys=[owner_id]
    )
    members = relationship(
        "ProjectMember", back_populates="project",
        cascade="all, delete-orphan"
    )
    prompt = relationship(
        "Prompt", back_populates="project",
        uselist=False, cascade="all, delete-orphan"
    )
    files = relationship(
        "ProjectFile", back_populates="project",
        cascade="all, delete-orphan"
    )
    conversations = relationship(
        "Conversation", back_populates="project",
        cascade="all, delete-orphan"
    )


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, default=generate_cuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_user"),
        {"sqlite_autoincrement": True},
    )


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(String, primary_key=True, default=generate_cuid)
    project_id = Column(
        String, ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="prompt")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(String, primary_key=True, default=generate_cuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    openai_file_id = Column(String, unique=True, nullable=False)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="files")
    uploaded_by = relationship("User", back_populates="uploads")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_cuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="conversations")
    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message", back_populates="conversation",
        cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_cuid)
    conversation_id = Column(
        String, ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    response_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
    user = relationship("User", back_populates="messages")
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add sqlalchemy models for all 7 tables"
```

---

### Task 3: Core — Error Classes & Exception Handlers

**Files:**
- Create: `backend/app/core/errors.py`

- [ ] **Step 1: Write errors.py**

```python
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, code: str, message: str, status: int, details=None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details


class AuthError(AppError):
    def __init__(self, message="Please log in to continue."):
        super().__init__("unauthorized", message, 401)


class ForbiddenError(AppError):
    def __init__(self, message="You do not have permission to perform this action."):
        super().__init__("forbidden", message, 403)


class NotFoundError(AppError):
    def __init__(self, message="The requested resource was not found."):
        super().__init__("not_found", message, 404)


class ConflictError(AppError):
    def __init__(self, message="Resource already exists."):
        super().__init__("conflict", message, 409)


class OpenAIConfigError(AppError):
    def __init__(self, message="OpenAI is not configured."):
        super().__init__("server_error", message, 500)


def json_error(code: str, message: str, status: int, details=None):
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details}},
    )


async def app_error_handler(request: Request, exc: AppError):
    return json_error(exc.code, exc.message, exc.status, exc.details)


async def validation_error_handler(request: Request, exc: RequestValidationError):
    return json_error("bad_request", "Invalid request body.", 400, exc.errors())


async def generic_error_handler(request: Request, exc: Exception):
    return json_error("server_error", "Something went wrong.", 500)


def register_error_handlers(app):
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/errors.py
git commit -m "feat: add error classes and exception handlers"
```

---

### Task 4: Core — Security (JWT + Password Hashing)

**Files:**
- Create: `backend/app/core/security.py`

- [ ] **Step 1: Write security.py**

```python
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.core.errors import AuthError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload["sub"]
    except JWTError:
        raise AuthError()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/security.py
git commit -m "feat: add jwt token and password hashing"
```

---

### Task 5: Core — FastAPI Dependencies (Auth + RBAC)

**Files:**
- Create: `backend/app/core/deps.py`
- Create: `backend/app/core/roles.py`

- [ ] **Step 1: Write roles.py**

```python
from typing import Literal

ProjectRole = Literal["owner", "editor", "viewer"]
ProjectPermission = Literal["read", "edit", "manage_members", "upload_files"]

_project_roles = {"owner", "editor", "viewer"}


def is_project_role(role: str) -> bool:
    return role in _project_roles


def can_edit_project(role: str) -> bool:
    return role in ("owner", "editor")


def can_read_project(role: str) -> bool:
    return is_project_role(role)


def can_manage_members(role: str) -> bool:
    return role == "owner"


def can_upload_files(role: str) -> bool:
    return role in ("owner", "editor")


def role_has_permission(role: str, permission: str) -> bool:
    if permission == "read":
        return can_read_project(role)
    if permission == "edit":
        return can_edit_project(role)
    if permission == "manage_members":
        return can_manage_members(role)
    if permission == "upload_files":
        return can_upload_files(role)
    return False
```

- [ ] **Step 2: Write deps.py**

```python
from typing import Optional
from fastapi import Depends, Header
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User
from app.core.security import verify_access_token
from app.core.errors import AuthError, ForbiddenError, NotFoundError
from app.core.roles import role_has_permission, ProjectPermission


def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise AuthError()
    token = authorization.removeprefix("Bearer ")
    user_id = verify_access_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthError()
    return user


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.removeprefix("Bearer ")
        user_id = verify_access_token(token)
        return db.query(User).filter(User.id == user_id).first()
    except (AuthError, Exception):
        return None


def get_project_access(
    project_id: str,
    permission: ProjectPermission,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    from app.models.models import Project, ProjectMember

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise NotFoundError("Project not found.")

    role = None
    if project.owner_id == user.id:
        role = "owner"
    else:
        member = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
            )
            .first()
        )
        if member:
            role = member.role

    if not role or not role_has_permission(role, permission):
        raise ForbiddenError()

    return {"project_id": project_id, "role": role}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/roles.py backend/app/core/deps.py
git commit -m "feat: add auth and rbac fastapi dependencies"
```

---

### Task 6: Alembic Setup & Initial Migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`

- [ ] **Step 1: Init alembic and write config**

```bash
cd backend && alembic init alembic
```

- [ ] **Step 2: Update alembic/env.py**

```python
from alembic import context
from app.models.database import Base, engine
from app.models.models import *  # noqa: F403
from app.core.config import settings

target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(url=settings.DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Generate and run initial migration**

```bash
cd backend && alembic revision --autogenerate -m "init"
cd backend && alembic upgrade head
```

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/
git commit -m "feat: add alembic migrations for all tables"
```

---

### Task 7: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/project.py`
- Create: `backend/app/schemas/member.py`
- Create: `backend/app/schemas/file.py`
- Create: `backend/app/schemas/prompt.py`
- Create: `backend/app/schemas/chat.py`

- [ ] **Step 1: Write schemas/auth.py**

```python
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
```

- [ ] **Step 2: Write schemas/user.py**

```python
from pydantic import BaseModel
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
```

- [ ] **Step 3: Write schemas/project.py**

```python
from pydantic import BaseModel, Field
from datetime import datetime
from .user import UserResponse
from .prompt import PromptResponse
from .file import FileResponse
from .member import MemberResponse


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
```

- [ ] **Step 4: Write schemas/member.py**

```python
from pydantic import BaseModel, Field
from datetime import datetime
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
```

- [ ] **Step 5: Write schemas/file.py**

```python
from pydantic import BaseModel
from datetime import datetime
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
```

- [ ] **Step 6: Write schemas/prompt.py**

```python
from pydantic import BaseModel, Field
from datetime import datetime


class PromptUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)


class PromptResponse(BaseModel):
    id: str
    content: str
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 7: Write schemas/chat.py**

```python
from pydantic import BaseModel, Field
from datetime import datetime


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
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: add pydantic request/response schemas"
```

---

### Task 8: Services

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/openai_service.py`
- Create: `backend/app/services/file_service.py`

- [ ] **Step 1: Write services/openai_service.py**

```python
from functools import lru_cache
from openai import OpenAI
from app.core.config import settings
from app.core.errors import OpenAIConfigError


@lru_cache()
def get_openai_client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise OpenAIConfigError(
            "OPENAI_API_KEY is not configured. Add it to .env before using chat or uploads."
        )
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_openai_model() -> str:
    return settings.OPENAI_MODEL


def build_chat_input(
    history: list[dict],
    message: str,
    files: list[dict],
) -> list[dict]:
    transcript = ""
    for item in history:
        role_label = "Assistant" if item["role"] == "assistant" else "User"
        transcript += f"{role_label}: {item['content']}\n"

    text = (
        f"Conversation so far:\n{transcript}\n\nLatest user message:\n{message}"
        if transcript
        else message
    )

    content: list[dict] = []
    for f in files:
        content.append({"type": "input_file", "file_id": f["openai_file_id"]})
    content.append({"type": "input_text", "text": text})

    return [{"role": "user", "content": content}]
```

- [ ] **Step 2: Write services/file_service.py**

```python
from fastapi import UploadFile

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".json", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/csv",
    "application/json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate_project_upload(file: UploadFile) -> str | None:
    filename = (file.filename or "").strip()
    if not filename:
        return "No filename provided."

    extension = filename[filename.rfind("."):].lower()
    if not extension or extension not in ALLOWED_EXTENSIONS:
        return "Only PDF, TXT, Markdown, CSV, JSON, and DOCX files are allowed."

    if file.size is None or file.size <= 0:
        return "The uploaded file is empty."

    if file.size > MAX_UPLOAD_BYTES:
        return "Files must be 10 MB or smaller."

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        return "The uploaded file type is not allowed."

    return None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/
git commit -m "feat: add openai and file services"
```

---

### Task 9: API Route — Auth (Register, Login, Logout)

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/v1/__init__.py`
- Create: `backend/app/api/v1/auth.py`

- [ ] **Step 1: Write api/v1/auth.py**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/auth.py
git commit -m "feat: add auth routes (register, login, logout)"
```

---

### Task 10: API Route — User (GET /me)

**Files:**
- Create: `backend/app/api/v1/users.py`

- [ ] **Step 1: Write api/v1/users.py**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/users.py
git commit -m "feat: add GET /me endpoint"
```

---

### Task 11: API Route — Projects CRUD

**Files:**
- Create: `backend/app/api/v1/projects.py`

- [ ] **Step 1: Write api/v1/projects.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User, Project, ProjectMember
from app.schemas.project import ProjectCreateRequest, ProjectUpdateRequest
from app.schemas.prompt import PromptResponse
from app.schemas.file import FileResponse
from app.core.deps import get_current_user, get_project_access

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = (
        db.query(ProjectMember)
        .filter(ProjectMember.user_id == user.id)
        .order_by(ProjectMember.created_at.desc())
        .all()
    )
    projects = []
    for m in memberships:
        p = m.project
        projects.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "owner_id": p.owner_id,
            "role": m.role,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
        })
    return {"projects": projects}


@router.post("", status_code=201)
def create_project(
    body: ProjectCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.models import Prompt

    project = Project(
        name=body.name,
        description=body.description,
        owner_id=user.id,
    )
    db.add(project)
    db.flush()

    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)

    prompt = Prompt(
        project_id=project.id,
        content="You are a helpful project assistant.",
    )
    db.add(prompt)
    db.commit()
    db.refresh(project)

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "role": "owner",
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }
    }


@router.get("/{project_id}")
def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    access = get_project_access(project_id, "read", user, db)
    project = db.query(Project).filter(Project.id == project_id).first()

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "role": access["role"],
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "prompt": PromptResponse.model_validate(project.prompt).model_dump() if project.prompt else None,
            "files": [FileResponse.model_validate(f).model_dump() for f in project.files],
            "members": [
                {
                    "id": m.id,
                    "role": m.role,
                    "created_at": m.created_at.isoformat(),
                    "user": {
                        "id": m.user.id,
                        "email": m.user.email,
                        "name": m.user.name,
                    },
                }
                for m in sorted(project.members, key=lambda x: x.created_at)
            ],
        }
    }


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    body: ProjectUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    access = get_project_access(project_id, "edit", user, db)
    project = db.query(Project).filter(Project.id == project_id).first()

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "role": access["role"],
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }
    }


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "manage_members", user, db)
    project = db.query(Project).filter(Project.id == project_id).first()
    db.delete(project)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/projects.py
git commit -m "feat: add project CRUD endpoints"
```

---

### Task 12: API Route — Members CRUD

**Files:**
- Create: `backend/app/api/v1/members.py`

- [ ] **Step 1: Write api/v1/members.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import exc as sa_exc
from app.models.database import get_db
from app.models.models import User, Project, ProjectMember
from app.schemas.member import MemberCreateRequest, MemberUpdateRequest
from app.core.deps import get_current_user, get_project_access
from app.core.errors import NotFoundError, ForbiddenError, ConflictError, AppError

router = APIRouter(tags=["members"])


@router.get("/projects/{project_id}/members")
def list_members(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "read", user, db)
    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at.asc())
        .all()
    )
    return {
        "members": [
            {
                "id": m.id,
                "role": m.role,
                "created_at": m.created_at.isoformat(),
                "user": {
                    "id": m.user.id,
                    "email": m.user.email,
                    "name": m.user.name,
                },
            }
            for m in members
        ]
    }


@router.post("/projects/{project_id}/members", status_code=201)
def add_member(
    project_id: str,
    body: MemberCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "manage_members", user, db)

    collaborator = db.query(User).filter(User.email == body.email.lower()).first()
    if not collaborator:
        raise NotFoundError("No registered user found for that email.")

    if collaborator.id == user.id:
        raise AppError("bad_request", "You are already the project owner.", 400)

    try:
        member = ProjectMember(
            project_id=project_id,
            user_id=collaborator.id,
            role=body.role,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
    except sa_exc.IntegrityError:
        db.rollback()
        raise ConflictError("This user is already a project member.")

    return {
        "member": {
            "id": member.id,
            "role": member.role,
            "created_at": member.created_at.isoformat(),
            "user": {
                "id": collaborator.id,
                "email": collaborator.email,
                "name": collaborator.name,
            },
        }
    }


@router.patch("/projects/{project_id}/members/{member_id}")
def update_member(
    project_id: str,
    member_id: str,
    body: MemberUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "manage_members", user, db)

    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
        .first()
    )
    if not member:
        raise NotFoundError("Project member not found.")

    project = db.query(Project).filter(Project.id == project_id).first()
    if member.user_id == project.owner_id or member.role == "owner":
        raise ForbiddenError("The project owner cannot be changed here.")

    member.role = body.role
    db.commit()
    db.refresh(member)

    return {
        "member": {
            "id": member.id,
            "role": member.role,
            "created_at": member.created_at.isoformat(),
            "user": {
                "id": member.user.id,
                "email": member.user.email,
                "name": member.user.name,
            },
        }
    }


@router.delete("/projects/{project_id}/members/{member_id}")
def remove_member(
    project_id: str,
    member_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "manage_members", user, db)

    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
        .first()
    )
    if not member:
        raise NotFoundError("Project member not found.")

    project = db.query(Project).filter(Project.id == project_id).first()
    if member.user_id == project.owner_id or member.role == "owner":
        raise ForbiddenError("The project owner cannot be changed here.")

    db.delete(member)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/members.py
git commit -m "feat: add member CRUD endpoints"
```

---

### Task 13: API Route — Files (Upload + List)

**Files:**
- Create: `backend/app/api/v1/files.py`

- [ ] **Step 1: Write api/v1/files.py**

```python
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User, ProjectFile
from app.core.deps import get_current_user, get_project_access
from app.services.file_service import validate_project_upload
from app.services.openai_service import get_openai_client
from app.core.errors import AppError

router = APIRouter(tags=["files"])


@router.get("/projects/{project_id}/files")
def list_files(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "read", user, db)
    files = (
        db.query(ProjectFile)
        .filter(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.created_at.desc())
        .all()
    )
    return {
        "files": [
            {
                "id": f.id,
                "filename": f.filename,
                "mime_type": f.mime_type,
                "bytes": f.bytes,
                "openai_file_id": f.openai_file_id,
                "created_at": f.created_at.isoformat(),
                "uploaded_by": {
                    "id": f.uploaded_by.id,
                    "email": f.uploaded_by.email,
                    "name": f.uploaded_by.name,
                },
            }
            for f in files
        ]
    }


@router.post("/projects/{project_id}/files", status_code=201)
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "upload_files", user, db)

    validation_error = validate_project_upload(file)
    if validation_error:
        raise AppError("bad_request", validation_error, 400)

    client = get_openai_client()
    file_content = await file.read()
    await file.seek(0)

    uploaded = client.files.create(
        file=(file.filename, file_content, file.content_type or "application/octet-stream"),
        purpose="user_data",
    )

    project_file = ProjectFile(
        project_id=project_id,
        uploaded_by_id=user.id,
        openai_file_id=uploaded.id,
        filename=file.filename or "unnamed",
        mime_type=file.content_type or "application/octet-stream",
        bytes=file.size or 0,
    )
    db.add(project_file)
    db.commit()
    db.refresh(project_file)

    return {
        "file": {
            "id": project_file.id,
            "filename": project_file.filename,
            "mime_type": project_file.mime_type,
            "bytes": project_file.bytes,
            "openai_file_id": project_file.openai_file_id,
            "created_at": project_file.created_at.isoformat(),
        }
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/files.py
git commit -m "feat: add file upload and list endpoints"
```

---

### Task 14: API Route — Prompts (Get + Upsert)

**Files:**
- Create: `backend/app/api/v1/prompts.py`

- [ ] **Step 1: Write api/v1/prompts.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User, Prompt
from app.schemas.prompt import PromptUpdateRequest, PromptResponse
from app.core.deps import get_current_user, get_project_access

router = APIRouter(tags=["prompts"])


@router.get("/projects/{project_id}/prompts")
def get_prompt(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "read", user, db)
    prompt = db.query(Prompt).filter(Prompt.project_id == project_id).first()
    return {
        "prompt": PromptResponse.model_validate(prompt).model_dump() if prompt else None,
    }


@router.post("/projects/{project_id}/prompts")
def upsert_prompt(
    project_id: str,
    body: PromptUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "edit", user, db)

    prompt = db.query(Prompt).filter(Prompt.project_id == project_id).first()
    if prompt:
        prompt.content = body.content
    else:
        prompt = Prompt(
            project_id=project_id,
            content=body.content,
        )
        db.add(prompt)

    db.commit()
    if prompt:
        db.refresh(prompt)

    return {
        "prompt": PromptResponse.model_validate(prompt).model_dump(),
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/prompts.py
git commit -m "feat: add prompt get and upsert endpoints"
```

---

### Task 15: API Route — Chat (POST)

**Files:**
- Create: `backend/app/api/v1/chat.py`

- [ ] **Step 1: Write api/v1/chat.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import (
    User, Conversation, Message, Prompt, ProjectFile,
)
from app.schemas.chat import ChatRequest
from app.core.deps import get_current_user, get_project_access
from app.core.errors import NotFoundError, AppError
from app.services.openai_service import (
    get_openai_client, get_openai_model, build_chat_input
)

router = APIRouter(tags=["chat"])


@router.post("/projects/{project_id}/chat")
def chat(
    project_id: str,
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "read", user, db)

    selected_file_ids = list(dict.fromkeys(body.file_ids))

    prompt = db.query(Prompt).filter(Prompt.project_id == project_id).first()

    selected_files = (
        db.query(ProjectFile)
        .filter(
            ProjectFile.project_id == project_id,
            ProjectFile.id.in_(selected_file_ids),
        )
        .all()
    ) if selected_file_ids else []

    if len(selected_files) != len(selected_file_ids):
        raise AppError(
            "bad_request",
            "One or more selected files do not belong to this project.",
            400,
        )

    if body.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == body.conversation_id,
                Conversation.project_id == project_id,
                Conversation.user_id == user.id,
            )
            .first()
        )
        if not conversation:
            raise NotFoundError("Conversation not found.")
    else:
        conversation = Conversation(
            project_id=project_id,
            user_id=user.id,
            title=body.message[:80],
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    history = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(12)
        .all()
    )
    history = list(reversed(history))

    user_message = Message(
        conversation_id=conversation.id,
        user_id=user.id,
        role="user",
        content=body.message,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    client = get_openai_client()

    try:
        response = client.responses.create(
            model=get_openai_model(),
            instructions=prompt.content if prompt else "You are a helpful project assistant.",
            input=build_chat_input(
                [{"role": m.role, "content": m.content} for m in history],
                body.message,
                [
                    {"openai_file_id": f.openai_file_id}
                    for f in selected_files
                ],
            ),
        )
    except Exception as e:
        from openai import APIError
        if isinstance(e, APIError):
            raise AppError("server_error", str(e), 502)
        raise

    assistant_text = response.output_text.strip() if response.output_text else "I could not generate a response."

    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_text,
        response_id=response.id,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    return {
        "conversation": {
            "id": conversation.id,
            "title": conversation.title,
        },
        "messages": [
            {
                "id": user_message.id,
                "role": user_message.role,
                "content": user_message.content,
                "created_at": user_message.created_at.isoformat(),
            },
            {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content,
                "response_id": assistant_message.response_id,
                "created_at": assistant_message.created_at.isoformat(),
            },
        ],
        "response_id": response.id,
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/chat.py
git commit -m "feat: add chat endpoint with openai responses api"
```

---

### Task 16: FastAPI Main App (main.py, CORS, routers, error handlers)

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Write main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.models.database import engine, Base
from app.api.v1 import auth, users, projects, members, files, prompts, chat

app = FastAPI(
    title="Chatbot Yellow AI API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(prompts.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: add fastapi main app with cors and routers"
```

---

### Task 17: Frontend — Update lib/api.ts to Bearer Tokens

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Update lib/api.ts**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Request failed" } }));
    throw error.error || { message: "Request failed" };
  }

  return res.json();
}
```

- [ ] **Step 2: Update login/register components**

Update login and register pages to call `setAuthToken(data.token)` after successful auth.

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts app/login/ app/register/
git commit -m "refactor: update frontend to use fastapi bearer tokens"
```

---

### Task 18: Cleanup — Remove Old Backend & Unused Dependencies

**Files:**
- Delete: `app/api/` (all Next.js API routes)
- Delete: `lib/auth.ts`, `lib/db.ts`, `lib/openai.ts`, `lib/projects.ts`, `lib/roles.ts`, `lib/files.ts`
- Delete: `prisma/` directory
- Modify: `package.json` (remove prisma-related deps + scripts)
- Delete: `tests/auth.test.ts`, `tests/project-permissions.test.ts`, `tests/file-chat-validation.test.ts`

- [ ] **Step 1: Remove old files**

```bash
rm -rf app/api/
rm -f lib/auth.ts lib/db.ts lib/openai.ts lib/projects.ts lib/roles.ts lib/files.ts
rm -rf prisma/
rm -f tests/auth.test.ts tests/project-permissions.test.ts tests/file-chat-validation.test.ts
```

- [ ] **Step 2: Clean up package.json**

Remove from dependencies: `@prisma/client`, `prisma`, `bcryptjs`, `jose`, `openai`
Remove from devDependencies: `@types/bcryptjs`
Remove scripts: `prisma:generate`, `prisma:migrate`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old nextjs api routes and prisma"
```

---

### Task 19: Testing — FastAPI Backend Tests

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_auth.py`
- Create: `backend/tests/test_permissions.py`
- Create: `backend/tests/test_files.py`

- [ ] **Step 1: Write conftest.py (test fixtures)**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Base, get_db
from app.main import app
from app.core.security import hash_password

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()

@pytest.fixture
def client(test_db):
    def override_get_db():
        yield test_db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(test_db, client):
    from app.models.models import User
    user = User(
        id="test_user_001",
        email="test@example.com",
        password_hash=hash_password("password123"),
    )
    test_db.add(user)
    test_db.commit()

    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123",
    })
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}
```

- [ ] **Step 2: Write test_auth.py**

```python
from fastapi.testclient import TestClient

def test_register(client: TestClient):
    response = client.post("/api/v1/auth/register", json={
        "email": "new@test.com",
        "password": "password123",
        "name": "Test User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "new@test.com"
    assert "token" in data

def test_register_duplicate(client: TestClient):
    client.post("/api/v1/auth/register", json={
        "email": "dup@test.com",
        "password": "password123",
    })
    response = client.post("/api/v1/auth/register", json={
        "email": "dup@test.com",
        "password": "password123",
    })
    assert response.status_code == 409

def test_login(client: TestClient):
    client.post("/api/v1/auth/register", json={
        "email": "login@test.com",
        "password": "password123",
    })
    response = client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "password123",
    })
    assert response.status_code == 200
    assert "token" in response.json()

def test_login_invalid(client: TestClient):
    response = client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "wrong",
    })
    assert response.status_code == 401

def test_me_optional(client: TestClient):
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["user"] is None

def test_me_authenticated(client: TestClient, auth_headers):
    response = client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "test@example.com"
```

- [ ] **Step 3: Write test_permissions.py**

```python
from app.core.roles import role_has_permission

def test_owner_has_all_permissions():
    assert role_has_permission("owner", "read")
    assert role_has_permission("owner", "edit")
    assert role_has_permission("owner", "upload_files")
    assert role_has_permission("owner", "manage_members")

def test_editor_permissions():
    assert role_has_permission("editor", "read")
    assert role_has_permission("editor", "edit")
    assert role_has_permission("editor", "upload_files")
    assert not role_has_permission("editor", "manage_members")

def test_viewer_read_only():
    assert role_has_permission("viewer", "read")
    assert not role_has_permission("viewer", "edit")
    assert not role_has_permission("viewer", "upload_files")
    assert not role_has_permission("viewer", "manage_members")

def test_unknown_role_denied():
    assert not role_has_permission("guest", "read")
    assert not role_has_permission("guest", "edit")
```

- [ ] **Step 4: Write test_files.py**

```python
from io import BytesIO
from app.services.file_service import validate_project_upload, MAX_UPLOAD_BYTES

class FakeUploadFile:
    def __init__(self, filename, content_type, size, content=None):
        self.filename = filename
        self.content_type = content_type
        self.size = size
        self.file = BytesIO(content or b"x" * size)

    async def read(self):
        return self.file.read()

    async def seek(self, offset):
        self.file.seek(offset)

def test_accepts_supported_file():
    f = FakeUploadFile("brief.pdf", "application/pdf", 12)
    assert validate_project_upload(f) is None

def test_rejects_unsupported_extension():
    f = FakeUploadFile("image.png", "image/png", 12)
    err = validate_project_upload(f)
    assert err is not None
    assert "Only PDF" in err

def test_rejects_oversized():
    f = FakeUploadFile("large.txt", "text/plain", MAX_UPLOAD_BYTES + 1)
    err = validate_project_upload(f)
    assert err is not None
    assert "10 MB" in err
```

- [ ] **Step 5: Run tests**

```bash
cd backend && pytest -v
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/tests/
git commit -m "test: add fastapi backend tests"
```

---

### Task 20: Final Integration Verification

- [ ] **Step 1: Check everything compiles**

```bash
cd backend && python -c "from app.main import app; print('App loaded OK')"
```

- [ ] **Step 2: Run all tests**

```bash
cd backend && pytest -v
```

- [ ] **Step 3: Commit and verify git status**

```bash
git status
git log --oneline -5
```
