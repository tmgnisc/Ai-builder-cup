from flask import Blueprint, current_app, jsonify

bp = Blueprint("health", __name__)


@bp.get("/healthz")
def healthz():
    return jsonify(status="ok", gemini=bool(current_app.config["GEMINI_API_KEY"]))
