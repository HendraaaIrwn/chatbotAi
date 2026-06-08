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

    extension = filename[filename.rfind(".") :].lower()
    if not extension or extension not in ALLOWED_EXTENSIONS:
        return "Only PDF, TXT, Markdown, CSV, JSON, and DOCX files are allowed."

    if file.size is None or file.size <= 0:
        return "The uploaded file is empty."

    if file.size > MAX_UPLOAD_BYTES:
        return "Files must be 10 MB or smaller."

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        return "The uploaded file type is not allowed."

    return None
