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
