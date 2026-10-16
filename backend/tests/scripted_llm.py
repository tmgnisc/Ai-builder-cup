from typing import AsyncGenerator

from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types


class ScriptedTurn:
    """A sequence of responses for one model turn."""

    def __init__(self, steps: list[list[types.Part]]):
        self.steps = steps
        self.current_step = 0


class ScriptedLlm(BaseLlm):
    """Deterministic scripted LLM for testing without network access."""

    model: str = "scripted"
    turns: list[ScriptedTurn] = []
    current_turn: int = 0

    def __init__(self, turns: list[list[list[types.Part]]] | None = None) -> None:
        super().__init__(model="scripted")
        self.turns = [ScriptedTurn(t) for t in (turns or [])]
        self.current_turn = 0

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        if self.current_turn >= len(self.turns):
            yield LlmResponse(
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="I'm here to help.")],
                )
            )
            return

        turn = self.turns[self.current_turn]
        if turn.current_step < len(turn.steps):
            parts = turn.steps[turn.current_step]
            turn.current_step += 1
            yield LlmResponse(content=types.Content(role="model", parts=parts))
        else:
            yield LlmResponse(
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="Done.")],
                )
            )
