from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .errors import register_error_handlers
from .routers import agent, cart, health, products


def create_app(settings: Settings | None = None) -> FastAPI:
    """App factory: builds a configured FastAPI app (one per process, or per test)."""
    settings = settings or get_settings()
    app = FastAPI(title="Persona API", version="0.1.0")

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
    app.include_router(agent.router, prefix="/api/agent", tags=["agent"])

    return app


app = create_app()
