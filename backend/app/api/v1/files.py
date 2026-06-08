from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_project_access
from app.core.errors import AppError
from app.models.database import get_db
from app.models.models import ProjectFile, User
from app.services.file_service import validate_project_upload
from app.services.openai_service import get_openai_client

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
