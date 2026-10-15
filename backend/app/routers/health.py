from typing import Annotated

from fastapi import APIRouter, Depends

from ..config import Settings, get_settings
from ..schemas import Health

router = APIRouter()


@router.get("/healthz", response_model=Health)
def healthz(settings: Annotated[Settings, Depends(get_settings)]):
    return Health(status="ok", gemini=bool(settings.gemini_api_key))
