from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routers import agent, cart, health, products
from .core.config import Settings, get_settings
from .core.errors import register_error_handlers
from .core.logging import setup_logging
from .core.middleware import RequestIDMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    """App factory: builds a configured FastAPI app with layered architecture."""
    settings = settings or get_settings()
    if settings.environment.lower() == "production" and not settings.agent_shared_secret:
        raise RuntimeError("AGENT_SHARED_SECRET must be configured when running in production")
    setup_logging(level=settings.log_level)

    app = FastAPI(title="Persona API", version="0.1.0")

    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(products.router, prefix="/api/products", tags=["products"])
    app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
    app.include_router(agent.router)

    return app


app = create_app()
