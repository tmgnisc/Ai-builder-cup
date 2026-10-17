from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import Settings, get_settings
from ...core.database import get_db
from ...services.catalog import CatalogService
from ..dependencies import get_catalog_service

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    gemini: bool
    database: bool = True
    database_error: str | None = None


@router.get("/health", response_model=HealthResponse)
async def health_check(
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession | None, Depends(get_db)] = None,
) -> HealthResponse:
    """Production health check reporting service status, database connectivity, and Gemini AI agent readiness."""
    db_ok = True
    db_err = None
    if session is not None:
        try:
            await session.execute(text("SELECT 1"))
        except Exception as e:
            db_ok = False
            db_err = str(e)

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        gemini=bool(settings.gemini_api_key),
        database=db_ok,
        database_error=db_err,
    )


# Backward-compatible internal probes (hidden from OpenAPI schema)
@router.get("/healthz", response_model=HealthResponse, include_in_schema=False)
def healthz(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    return HealthResponse(status="ok", gemini=bool(settings.gemini_api_key), database=True)


@router.get("/readyz", include_in_schema=False)
def readyz(catalog_service: Annotated[CatalogService, Depends(get_catalog_service)]):
    return {"status": "ok", "catalog_loaded": len(catalog_service.get_all()) > 0}
