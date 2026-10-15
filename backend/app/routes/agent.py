from flask import Blueprint, abort, current_app, jsonify, request

from ..services import gemini

bp = Blueprint("agent", __name__)


@bp.post("")
def run_agent():
    """One agent turn. Body: `{ message, memory?, context? }` (same shape as the Next.js route)."""
    body = request.get_json(silent=True) or {}
    message = str(body.get("message", "")).strip()
    if not message:
        abort(400, description="Body needs a non-empty message.")

    if not current_app.config["GEMINI_API_KEY"]:
        abort(503, description="GEMINI_API_KEY is not set.")

    # TODO: stream NDJSON AgentEvents and add function calling (search_products, add_to_cart, ...).
    reply = gemini.generate(message)
    return jsonify(reply=reply)
