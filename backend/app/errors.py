from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


def register_error_handlers(app: Flask) -> None:
    """Every error leaves the API as JSON: `{"error": {"code", "message"}}`."""

    @app.errorhandler(HTTPException)
    def handle_http(err: HTTPException):
        return jsonify(error={"code": err.name, "message": err.description}), err.code

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        app.logger.exception(err)
        return jsonify(error={"code": "Internal Server Error", "message": "Something went wrong."}), 500
