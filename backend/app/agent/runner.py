import asyncio
import time
import uuid
from typing import Any, AsyncGenerator, Protocol

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from .adapter import (
    AgentContext,
    AgentMemory,
    AgentRequest,
    DoneEvent,
    ErrorEvent,
    MemoryEvent,
    MessageStartEvent,
    StateChangeEvent,
    TextDeltaEvent,
    serialize_event,
)
from .tools_adk import AgentTurnContext, current_turn_context


class SessionProvider(Protocol):
    """Protocol for session lifecycle providers."""

    async def create_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        initial_state: dict[str, Any] | None = None,
    ) -> Any: ...

    def get_session_service(self) -> Any: ...


class InMemorySessionProvider:
    """Ephemeral session provider for per-request stateless execution."""

    def __init__(self) -> None:
        self.session_service = InMemorySessionService()

    async def create_session(
        self,
        app_name: str,
        user_id: str,
        session_id: str,
        initial_state: dict[str, Any] | None = None,
    ) -> Any:
        return await self.session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state=initial_state,
        )

    def get_session_service(self) -> InMemorySessionService:
        return self.session_service


def build_turn_prompt(message: str, memory: AgentMemory, context: AgentContext) -> str:
    """Builds a contextual prompt seeding the agent with client memory and current page state."""
    parts = []
    if context.pageProductId:
        parts.append(f"Current page product: {context.pageProductId}")
    if context.compareIds:
        parts.append(f"Currently comparing: {', '.join(context.compareIds)}")
    if context.cartProductIds:
        parts.append(f"Cart products: {', '.join(context.cartProductIds)}")
    if memory.lastResultIds:
        parts.append(f"Last search results: {', '.join(memory.lastResultIds)}")
    if memory.lastComparedIds:
        parts.append(f"Last compared: {', '.join(memory.lastComparedIds)}")
    if memory.focusProductId:
        parts.append(f"Focus product: {memory.focusProductId}")
    if memory.suggestedId:
        parts.append(f"Suggested alternative: {memory.suggestedId}")

    context_str = f"[Context: {'; '.join(parts)}]\n" if parts else ""
    return f"{context_str}User: {message}"


async def run_pip_stream(
    request: AgentRequest,
    turn_ctx: AgentTurnContext,
    agent: LlmAgent,
    session_provider: SessionProvider | None = None,
    app_name: str = "persona_pip",
) -> AsyncGenerator[str, None]:
    """Runs a single Pip agent turn and yields NDJSON lines matching the AgentEvent contract."""
    provider = session_provider or InMemorySessionProvider()
    token = current_turn_context.set(turn_ctx)
    message_id = f"msg_{time.time_ns()}"
    turn_ctx.message_id = message_id
    turn_ctx.original_question = request.message
    turn_ctx.memory = request.memory.model_copy(deep=True)

    message_started = False
    collected_text = ""

    try:
        # Initial state: thinking
        yield serialize_event(StateChangeEvent(state="thinking", caption="Thinking…")) + "\n"

        # Ephemeral session seeded per request
        ephemeral_session_id = f"{turn_ctx.session_id}_{uuid.uuid4().hex[:8]}"
        await provider.create_session(
            app_name=app_name,
            user_id=turn_ctx.session_id,
            session_id=ephemeral_session_id,
        )

        runner = Runner(
            agent=agent,
            session_service=provider.get_session_service(),
            app_name=app_name,
        )

        turn_prompt = build_turn_prompt(request.message, request.memory, request.context)
        user_msg = types.Content(role="user", parts=[types.Part.from_text(text=turn_prompt)])

        async for event in runner.run_async(
            user_id=turn_ctx.session_id,
            session_id=ephemeral_session_id,
            new_message=user_msg,
        ):
            # Drain tool and UI events that were queued by callbacks
            while turn_ctx.event_queue:
                ev = turn_ctx.event_queue.pop(0)
                yield serialize_event(ev) + "\n"

            # Stream model text deltas
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        if not message_started:
                            message_started = True
                            yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                        collected_text += part.text
                        yield serialize_event(TextDeltaEvent(messageId=message_id, delta=part.text)) + "\n"

        # Drain any remaining queued events
        while turn_ctx.event_queue:
            ev = turn_ctx.event_queue.pop(0)
            yield serialize_event(ev) + "\n"

        # Code guardrail: If verified cart update failed, model cannot claim success
        if turn_ctx.last_cart_verified is False:
            correction = " Note: The store service could not verify the cart update. Please try again."
            if not message_started:
                message_started = True
                yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                yield serialize_event(TextDeltaEvent(messageId=message_id, delta=correction.strip())) + "\n"
            elif any(w in collected_text.lower() for w in ["added", "placed", "updated", "success"]):
                yield serialize_event(TextDeltaEvent(messageId=message_id, delta=correction)) + "\n"

        # Emit updated memory event
        turn_ctx.memory.turn += 1
        yield serialize_event(MemoryEvent(memory=turn_ctx.memory)) + "\n"

        # Settle state
        if turn_ctx.last_cart_verified is True:
            yield serialize_event(StateChangeEvent(state="success", caption="Added & verified ✓")) + "\n"
        elif turn_ctx.last_cart_verified is False:
            yield serialize_event(StateChangeEvent(state="error", caption="Couldn't verify")) + "\n"
        else:
            yield serialize_event(StateChangeEvent(state="idle")) + "\n"

        yield serialize_event(DoneEvent()) + "\n"

    except (asyncio.CancelledError, GeneratorExit):
        # Client disconnect or generator closed
        return
    except Exception as err:
        yield serialize_event(StateChangeEvent(state="error", caption="Something went wrong")) + "\n"
        yield serialize_event(ErrorEvent(message=str(err))) + "\n"
        yield serialize_event(DoneEvent()) + "\n"
    finally:
        current_turn_context.reset(token)
