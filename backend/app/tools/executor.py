import inspect
import time
from typing import Any

from pydantic import ValidationError

from ..core.errors import ToolError
from ..domain.chaos import roll_failure, simulate_latency
from .models import ToolContext, ToolOutcome
from .registry import TOOLS


async def execute_tool(name: str, raw_input: Any, ctx: ToolContext) -> ToolOutcome:
    started = time.perf_counter()

    def duration_ms() -> int:
        return round((time.perf_counter() - started) * 1000)

    if name not in TOOLS:
        return ToolOutcome(
            ok=False,
            error={"code": "UNKNOWN_TOOL", "message": f"Unknown tool '{name}'."},
            durationMs=duration_ms(),
            summary="unknown tool",
        )

    tool_def = TOOLS[name]

    try:
        parsed_input = (
            tool_def.input_model.model_validate(raw_input)
            if isinstance(raw_input, dict)
            else tool_def.input_model.model_validate({})
        )
    except ValidationError as e:
        msg = "; ".join(f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in e.errors())
        return ToolOutcome(
            ok=False,
            error={"code": "INVALID_INPUT", "message": msg or "Invalid input."},
            durationMs=duration_ms(),
            summary="invalid input",
        )

    await simulate_latency(ctx.chaos)

    if not tool_def.mutation:
        fail = roll_failure(ctx.chaos, mutation=False)
        if fail:
            return ToolOutcome(
                ok=False,
                error={"code": "TRANSIENT", "message": "The store service hiccuped."},
                durationMs=duration_ms(),
                summary="transient error",
            )

    try:
        handler_result = tool_def.handler(parsed_input, ctx)
        if inspect.isawaitable(handler_result):
            output = await handler_result
        else:
            output = handler_result

        validated_output = tool_def.output_model.model_validate(output)
        summary = tool_def.summarize(validated_output)
        return ToolOutcome(
            ok=True,
            output=validated_output.model_dump(),
            durationMs=duration_ms(),
            summary=summary,
        )
    except ToolError as te:
        code = te.code
        summary = "out of stock" if code == "OUT_OF_STOCK" else code.lower().replace("_", " ")
        return ToolOutcome(
            ok=False,
            error={"code": code, "message": te.message},
            durationMs=duration_ms(),
            summary=summary,
        )
    except Exception as exc:
        return ToolOutcome(
            ok=False,
            error={"code": "INTERNAL", "message": str(exc)},
            durationMs=duration_ms(),
            summary="internal error",
        )


def tool_declarations() -> list[dict[str, Any]]:
    """Exports tool declarations as JSON Schema compatible with Gemini function calling."""
    declarations: list[dict[str, Any]] = []
    for name, tool_def in TOOLS.items():
        declarations.append(
            {
                "name": name,
                "description": tool_def.description,
                "parameters": tool_def.input_model.model_json_schema(),
            }
        )
    return declarations
