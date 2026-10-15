from flask import Flask
from flask_cors import CORS

from .config import Config
from .errors import register_error_handlers
from .routes import register_blueprints


def create_app(config: type[Config] = Config) -> Flask:
    """App factory: builds a configured Flask app (one per process, or per test)."""
    app = Flask(__name__)
    app.config.from_object(config)

    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    register_blueprints(app)
    register_error_handlers(app)

    return app
