from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ...core.config import Settings, get_settings
from ...services.catalog import CatalogService
from ..dependencies import get_catalog_service

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    gemini: bool


class ReadyResponse(BaseModel):
    status: str
    catalog_loaded: bool


@router.get("/healthz", response_model=HealthResponse)
def healthz(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    return HealthResponse(status="ok", gemini=bool(settings.gemini_api_key))


@router.get("/readyz", response_model=ReadyResponse)
def readyz(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> ReadyResponse:
    products = catalog_service.get_all()
    return ReadyResponse(status="ok", catalog_loaded=len(products) > 0)
