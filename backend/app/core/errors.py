from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, code: str, message: str, status: int, details=None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details


class AuthError(AppError):
    def __init__(self, message="Please log in to continue."):
        super().__init__("unauthorized", message, 401)


class ForbiddenError(AppError):
    def __init__(self, message="You do not have permission to perform this action."):
        super().__init__("forbidden", message, 403)


class NotFoundError(AppError):
    def __init__(self, message="The requested resource was not found."):
        super().__init__("not_found", message, 404)


class ConflictError(AppError):
    def __init__(self, message="Resource already exists."):
        super().__init__("conflict", message, 409)


class OpenAIConfigError(AppError):
    def __init__(self, message="OpenAI is not configured."):
        super().__init__("server_error", message, 500)


def json_error(code: str, message: str, status: int, details=None):
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details}},
    )


async def app_error_handler(request: Request, exc: AppError):
    return json_error(exc.code, exc.message, exc.status, exc.details)


async def validation_error_handler(request: Request, exc: RequestValidationError):
    return json_error("bad_request", "Invalid request body.", 400, exc.errors())


async def generic_error_handler(request: Request, exc: Exception):
    return json_error("server_error", "Something went wrong.", 500)


def register_error_handlers(app):
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
