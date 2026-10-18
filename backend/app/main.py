import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routers import agent, cart, events, health, merchant, merchant_auth, orders, products
from .core.config import Settings, get_settings
from .core.database import init_db
from .core.errors import register_error_handlers
from .core.logging import setup_logging
from .core.middleware import RequestIDMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes PostgreSQL schema and seeds products if needed."""
    await init_db()
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """App factory: builds a configured FastAPI app with layered architecture."""
    settings = settings or get_settings()
    if settings.environment.lower() == "production" and not settings.agent_shared_secret:
        raise RuntimeError("AGENT_SHARED_SECRET must be configured in production")
    setup_logging(level=settings.log_level)

    if settings.gemini_api_key:
        os.environ.setdefault("GEMINI_API_KEY", settings.gemini_api_key)
    if settings.google_genai_use_vertexai:
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true"
        if settings.google_cloud_project:
            os.environ["GOOGLE_CLOUD_PROJECT"] = settings.google_cloud_project
        if settings.google_cloud_location:
            os.environ["GOOGLE_CLOUD_LOCATION"] = settings.google_cloud_location

    app = FastAPI(title="Persona API", version="0.1.0", lifespan=lifespan)

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
    app.include_router(orders.router)
    app.include_router(events.router)
    app.include_router(merchant.router)
    app.include_router(merchant_auth.router)
    app.include_router(agent.router)

    return app


app = create_app()
