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
    turn_timeout_seconds: float = 30.0,
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
    buffered_text_parts: list[str] = []

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

        try:
            async with asyncio.timeout(turn_timeout_seconds):
                async for event in runner.run_async(
                    user_id=turn_ctx.session_id,
                    session_id=ephemeral_session_id,
                    new_message=user_msg,
                ):
                    # Drain tool and UI events that were queued by callbacks
                    while turn_ctx.event_queue:
                        ev = turn_ctx.event_queue.pop(0)
                        yield serialize_event(ev) + "\n"

                    # Stream model text deltas (buffered during cart mutations)
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                if turn_ctx.is_cart_mutation_turn:
                                    if turn_ctx.last_cart_verified is None:
                                        # Hold back text deltas until verification outcome is known
                                        buffered_text_parts.append(part.text)
                                    elif turn_ctx.last_cart_verified is True:
                                        # Released after verification
                                        if not message_started:
                                            message_started = True
                                            yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                                        while buffered_text_parts:
                                            b = buffered_text_parts.pop(0)
                                            collected_text += b
                                            yield serialize_event(TextDeltaEvent(messageId=message_id, delta=b)) + "\n"
                                        collected_text += part.text
                                        yield serialize_event(TextDeltaEvent(messageId=message_id, delta=part.text)) + "\n"
                                    else:
                                        # Verification failed: discard false success text
                                        buffered_text_parts.clear()
                                        if not any(
                                            w in part.text.lower()
                                            for w in ["added", "placed", "updated", "success", "in your cart", "to your cart"]
                                        ):
                                            if not message_started:
                                                message_started = True
                                                yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                                            collected_text += part.text
                                            yield serialize_event(TextDeltaEvent(messageId=message_id, delta=part.text)) + "\n"
                                else:
                                    if not message_started:
                                        message_started = True
                                        yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                                    collected_text += part.text
                                    yield serialize_event(TextDeltaEvent(messageId=message_id, delta=part.text)) + "\n"
        except TimeoutError:
            if not message_started:
                message_started = True
                yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
            timeout_msg = "I took too long to complete that request. Please try again with a simpler query."
            yield serialize_event(TextDeltaEvent(messageId=message_id, delta=timeout_msg)) + "\n"
            yield serialize_event(StateChangeEvent(state="error", caption="Turn timed out")) + "\n"
            yield serialize_event(ErrorEvent(message="Turn timed out.")) + "\n"
            yield serialize_event(DoneEvent()) + "\n"
            return

        # Drain any remaining queued events
        while turn_ctx.event_queue:
            ev = turn_ctx.event_queue.pop(0)
            yield serialize_event(ev) + "\n"

        # Release any buffered text if verification succeeded
        if turn_ctx.is_cart_mutation_turn:
            if turn_ctx.last_cart_verified is True and buffered_text_parts:
                if not message_started:
                    message_started = True
                    yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                while buffered_text_parts:
                    b = buffered_text_parts.pop(0)
                    collected_text += b
                    yield serialize_event(TextDeltaEvent(messageId=message_id, delta=b)) + "\n"
            elif turn_ctx.last_cart_verified is False:
                buffered_text_parts.clear()

        # Code guardrail: Tool limit reached graceful message
        if turn_ctx.tool_call_count >= 8:
            cap_msg = " I reached the tool limit for this turn. Here is what I found so far."
            if not message_started:
                message_started = True
                yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                yield serialize_event(TextDeltaEvent(messageId=message_id, delta=cap_msg.strip())) + "\n"
            else:
                yield serialize_event(TextDeltaEvent(messageId=message_id, delta=cap_msg)) + "\n"
            collected_text += cap_msg

        # Code guardrail: If verified cart update failed, replace or suppress model text claiming success
        if turn_ctx.last_cart_verified is False:
            if not message_started or not collected_text.strip():
                message_started = True
                fail_msg = "I couldn't verify that the item was added to your cart. Please try again."
                yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
                yield serialize_event(TextDeltaEvent(messageId=message_id, delta=fail_msg)) + "\n"
            elif any(w in collected_text.lower() for w in ["added", "placed", "updated", "success"]):
                correction = " Note: The store service could not verify the cart update. Please try again."
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
        err_str = str(err)
        is_rate_limit = "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower()
        caption = "Rate limit reached" if is_rate_limit else "Something went wrong"
        user_msg = (
            "Google Gemini API rate limit or quota exceeded (429). Please wait a moment or check your API key quota."
            if is_rate_limit
            else "I ran into an issue connecting to the AI service. Please try your request again."
        )
        if not message_started:
            message_started = True
            yield serialize_event(MessageStartEvent(messageId=message_id)) + "\n"
            yield serialize_event(TextDeltaEvent(messageId=message_id, delta=user_msg)) + "\n"
        yield serialize_event(StateChangeEvent(state="error", caption=caption)) + "\n"
        yield serialize_event(ErrorEvent(message=err_str)) + "\n"
        yield serialize_event(DoneEvent()) + "\n"
    finally:
        current_turn_context.reset(token)
