import cuid2
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
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
        "Project",
        back_populates="owner",
        foreign_keys="Project.owner_id",
        cascade="all, delete-orphan",
    )
    memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    uploads = relationship(
        "ProjectFile", back_populates="uploaded_by", cascade="all, delete-orphan"
    )
    conversations = relationship(
        "Conversation", back_populates="user", cascade="all, delete-orphan"
    )
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_cuid)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    prompt = relationship(
        "Prompt", back_populates="project", uselist=False, cascade="all, delete-orphan"
    )
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    conversations = relationship(
        "Conversation", back_populates="project", cascade="all, delete-orphan"
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
        String, ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False
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
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_cuid)
    conversation_id = Column(
        String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    response_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
    user = relationship("User", back_populates="messages")
