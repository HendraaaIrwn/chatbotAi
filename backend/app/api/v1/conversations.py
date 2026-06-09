from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_project_access
from app.core.errors import NotFoundError
from app.models.database import get_db
from app.models.models import Conversation, Message, User

router = APIRouter(tags=["conversations"])


@router.delete("/projects/{project_id}/conversations/{conversation_id}")
def delete_conversation(
    project_id: str,
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "edit", user, db)

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
        .first()
    )
    if not conversation:
        raise NotFoundError("Conversation not found.")

    db.delete(conversation)
    db.commit()
    return {"ok": True}


@router.get("/projects/{project_id}/conversations")
def list_conversations(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "read", user, db)

    conversations = (
        db.query(Conversation)
        .filter(Conversation.project_id == project_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "updated_at": c.updated_at.isoformat(),
                "created_at": c.created_at.isoformat(),
            }
            for c in conversations
        ],
    }


@router.get("/projects/{project_id}/conversations/{conversation_id}/messages")
def get_messages(
    project_id: str,
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_project_access(project_id, "read", user, db)

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
        .first()
    )
    if not conversation:
        raise NotFoundError("Conversation not found.")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "conversation": {
            "id": conversation.id,
            "title": conversation.title,
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }
