from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..config import Settings, get_settings
from ..schemas import AgentReply, AgentRequest
from ..services import gemini

router = APIRouter()


@router.post("", response_model=AgentReply)
async def run_agent(body: AgentRequest, settings: Annotated[Settings, Depends(get_settings)]):
    """One agent turn."""
    if not settings.gemini_api_key:
        raise HTTPException(503, "GEMINI_API_KEY is not set.")

    # TODO: stream NDJSON AgentEvents (StreamingResponse) and add function calling
    # (search_products, compare_products, add_to_cart with verify-after-act, ...).
    reply = await gemini.generate(body.message, settings)
    return AgentReply(reply=reply)
