import logging
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)

CommerceErrorCode = Literal[
    "NOT_FOUND",
    "OUT_OF_STOCK",
    "INSUFFICIENT_STOCK",
    "NOT_IN_CART",
    "INVALID_INPUT",
    "TRANSIENT",
    "UNAUTHORIZED",
]

COMMERCE_STATUS_CODES: dict[str, int] = {
    "NOT_FOUND": 404,
    "OUT_OF_STOCK": 409,
    "INSUFFICIENT_STOCK": 409,
    "NOT_IN_CART": 404,
    "INVALID_INPUT": 400,
    "TRANSIENT": 503,
    "UNAUTHORIZED": 401,
}


class CommerceException(Exception):
    """Business rule and domain error with an explicit CommerceErrorCode."""

    def __init__(self, code: CommerceErrorCode | str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = COMMERCE_STATUS_CODES.get(code, 400)


class ToolError(Exception):
    """Exception raised by tool execution."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


def register_error_handlers(app: FastAPI) -> None:
    """Registers global error handlers returning uniform JSON error shapes."""

    @app.exception_handler(CommerceException)
    async def handle_commerce(_: Request, err: CommerceException) -> JSONResponse:
        return error_response(err.code, err.message, err.status_code)

    @app.exception_handler(HTTPException)
    async def handle_http(_: Request, err: HTTPException) -> JSONResponse:
        detail = str(err.detail)
        code = f"http_{err.status_code}"
        return error_response(code, detail, err.status_code)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, err: RequestValidationError) -> JSONResponse:
        errors = err.errors()
        first = errors[0] if errors else {"loc": ["body"], "msg": "Invalid input"}
        field = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        msg = f"{field}: {first.get('msg', 'Invalid input')}" if field else str(first.get("msg", "Invalid input"))
        return error_response("INVALID_INPUT", msg, 400)

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, err: Exception) -> JSONResponse:
        logger.exception("Unexpected error occurred: %s", err)
        return error_response("internal_error", "Something went wrong.", 500)
