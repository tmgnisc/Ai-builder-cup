from flask import Flask

from .agent import bp as agent_bp
from .cart import bp as cart_bp
from .health import bp as health_bp
from .products import bp as products_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(health_bp)
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")
    app.register_blueprint(agent_bp, url_prefix="/api/agent")
