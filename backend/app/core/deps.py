from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.errors import AuthError, ForbiddenError, NotFoundError
from app.core.roles import ProjectPermission, role_has_permission
from app.core.security import verify_access_token
from app.models.database import get_db
from app.models.models import User


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
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
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
