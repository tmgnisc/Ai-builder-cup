from functools import lru_cache

from flask import current_app
from google import genai
from google.genai import types

SYSTEM_PROMPT = (
    "You are Pip, a friendly shopping companion for an electronics store. "
    "Only state product facts that come from tool results."
)


@lru_cache(maxsize=1)
def _client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def generate(message: str) -> str:
    """Single-shot text reply. Replace with a function-calling loop once tools are ported."""
    response = _client(current_app.config["GEMINI_API_KEY"]).models.generate_content(
        model=current_app.config["GEMINI_MODEL"],
        contents=message,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )
    return response.text or ""
