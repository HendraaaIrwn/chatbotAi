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
