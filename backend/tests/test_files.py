from io import BytesIO
from app.services.file_service import validate_project_upload, MAX_UPLOAD_BYTES


class FakeUploadFile:
    def __init__(self, filename, content_type, size, content=None):
        self.filename = filename
        self.content_type = content_type
        self.size = size
        self.file = BytesIO(content or b"x" * size)

    async def read(self):
        return self.file.read()

    async def seek(self, offset):
        self.file.seek(offset)


def test_accepts_supported_file():
    f = FakeUploadFile("brief.pdf", "application/pdf", 12)
    assert validate_project_upload(f) is None


def test_rejects_unsupported_extension():
    f = FakeUploadFile("image.png", "image/png", 12)
    err = validate_project_upload(f)
    assert err is not None
    assert "Only PDF" in err


def test_rejects_oversized():
    f = FakeUploadFile("large.txt", "text/plain", MAX_UPLOAD_BYTES + 1)
    err = validate_project_upload(f)
    assert err is not None
    assert "10 MB" in err
