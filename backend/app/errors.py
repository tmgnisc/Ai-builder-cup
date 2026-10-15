import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def register_error_handlers(app: FastAPI) -> None:
    """Every error leaves the API as JSON: `{"error": {"code", "message"}}`."""

    @app.exception_handler(HTTPException)
    async def handle_http(_: Request, err: HTTPException):
        return _error(err.status_code, f"http_{err.status_code}", str(err.detail))

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, err: RequestValidationError):
        first = err.errors()[0]
        field = ".".join(str(p) for p in first["loc"] if p != "body")
        return _error(422, "validation_error", f"{field}: {first['msg']}")

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, err: Exception):
        logger.exception(err)
        return _error(500, "internal_error", "Something went wrong.")
