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
