from functools import lru_cache

from google import genai
from google.genai import types

from ..config import Settings

SYSTEM_PROMPT = (
    "You are Pip, a friendly shopping companion for an electronics store. "
    "Only state product facts that come from tool results."
)


@lru_cache(maxsize=1)
def _client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


async def generate(message: str, settings: Settings) -> str:
    """Single-shot text reply. Replace with a function-calling loop once tools are ported."""
    response = await _client(settings.gemini_api_key).aio.models.generate_content(
        model=settings.gemini_model,
        contents=message,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )
    return response.text or ""
