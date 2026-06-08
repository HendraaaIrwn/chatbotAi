from fastapi import APIRouter, Depends
from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_project_access
from app.core.errors import AppError, ConflictError, ForbiddenError, NotFoundError
from app.models.database import get_db
from app.models.models import Project, ProjectMember, User
from app.schemas.member import MemberCreateRequest, MemberUpdateRequest

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
        raise ConflictError("This user is already a project member.") from None

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
