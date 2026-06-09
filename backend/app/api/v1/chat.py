import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_project_access
from app.core.errors import AppError, NotFoundError
from app.models.database import get_db
from app.models.models import (
    Conversation,
    Message,
    ProjectFile,
    Prompt,
    User,
)
from app.schemas.chat import ChatRequest
from app.services.openai_service import build_chat_input, get_openai_client, get_openai_model

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
        (
            db.query(ProjectFile)
            .filter(
                ProjectFile.project_id == project_id,
                ProjectFile.id.in_(selected_file_ids),
            )
            .all()
        )
        if selected_file_ids
        else []
    )

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
    instructions = prompt.content if prompt else "You are a helpful project assistant."
    chat_input = build_chat_input(
        [{"role": m.role, "content": m.content} for m in history],
        body.message,
        [{"openai_file_id": f.openai_file_id} for f in selected_files],
    )

    if body.stream:
        return _stream_response(client, chat_input, instructions, conversation, user_message, db)

    try:
        response = client.responses.create(
            model=get_openai_model(),
            instructions=instructions,
            input=chat_input,
        )
    except Exception as e:
        from openai import APIError

        if isinstance(e, APIError):
            raise AppError("server_error", str(e), 502) from e
        raise

    assistant_text = (
        response.output_text.strip() if response.output_text else "I could not generate a response."
    )

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


def _stream_response(client, chat_input, instructions, conversation, user_message, db):
    def sse_event(event_type: str, data: dict) -> str:
        payload = {"type": event_type, **data}
        return f"data: {json.dumps(payload)}\n\n"

    def generate():
        full_text = ""
        response_id = None

        # Send user message first
        yield sse_event("user_message", {
            "message": {
                "id": user_message.id,
                "role": user_message.role,
                "content": user_message.content,
                "created_at": user_message.created_at.isoformat(),
            },
        })

        try:
            stream = client.responses.create(
                model=get_openai_model(),
                instructions=instructions,
                input=chat_input,
                stream=True,
            )

            for event in stream:
                if event.type == "response.output_text.delta":
                    full_text += event.delta
                    yield sse_event("delta", {"content": event.delta})

                elif event.type == "response.completed":
                    response_id = event.response.id

        except Exception as e:
            from openai import APIError

            if isinstance(e, APIError):
                yield sse_event("error", {"message": str(e)})
            else:
                yield sse_event("error", {"message": "Something went wrong."})
            return

        # Save assistant message to DB
        final_text = full_text.strip() if full_text else "I could not generate a response."
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=final_text,
            response_id=response_id,
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        yield sse_event("done", {
            "conversation": {
                "id": conversation.id,
                "title": conversation.title,
            },
            "message": {
                "id": assistant_message.id,
                "role": assistant_message.role,
                "content": assistant_message.content,
                "response_id": assistant_message.response_id,
                "created_at": assistant_message.created_at.isoformat(),
            },
            "user_message_id": user_message.id,
            "response_id": response_id,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
