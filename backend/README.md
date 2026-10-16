# Persona backend (FastAPI)

Production-grade Python API for Pip and the commerce catalog, cart, and tool layer.

## Layout

```
backend/
  app/
    api/
      dependencies.py      FastAPI Depends providers for repos and services
      routers/             health (/healthz, /readyz), products, cart
    core/
      config.py            Settings (pydantic-settings, env / .env)
      errors.py            Uniform JSON error responses ({"error": {"code", "message"}})
      logging.py           Structured JSON logging with request ID context
      middleware.py        RequestIDMiddleware for distributed tracing
    data/
      products.json        Catalog single source of truth
    domain/
      catalog.py           Pure Python catalog search, filtering, and scoring
      chaos.py             Chaos & latency simulation (transient 503 and silent drop)
      compare.py           Catalog-grounded product comparisons and verdicts
      delivery.py          Nepal delivery rules (Kathmandu Valley vs outside)
      format.py            NPR currency (South Asian commas), weight, and storage formatting
      models.py            Pydantic v2 schemas for all commerce entities
    repositories/
      cart.py              CartRepository protocol + thread-safe InMemoryCartRepository
    services/
      cart.py              CartService orchestrator with stock checks
      catalog.py           CatalogService orchestrator
      verified_cart.py     VerifiedCartService enforcing verify-after-act
    tools/
      executor.py          Tool executor and Gemini function declaration generator
      models.py            Tool context, definitions, and Pydantic input/output schemas
      registry.py          Agent tools registry (search, compare, cart, stock, delivery)
    main.py                FastAPI application factory (`create_app`) & uvicorn entrypoint
  tests/
    fixtures/              Catalog and parity fixtures generated from TypeScript
    conftest.py            Pytest fixtures and test client setup
    test_api.py            HTTP endpoint integration tests
    test_domain.py         Domain logic unit tests
    test_parity.py         Parity tests asserting Python matches TS outputs
    test_services.py       Service orchestration, stock rules, and concurrency tests
    test_tools.py          Tool registry and execution tests
  Dockerfile               Multi-stage container (production & test runner)
  Makefile                 Workflow tasks (install, run, test, lint, typecheck, docker)
  pyproject.toml           Ruff, mypy strict, and pytest coverage configuration
```

## Run Locally

### 1. Using Python Virtual Environment
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8080
```

### 2. Using Docker
```bash
cd backend
docker build -t persona-api .
docker run -p 8080:8080 persona-api
```

Interactive API documentation is available at `http://localhost:8080/docs`.

## Test and Verification

All quality checks can be run locally or via Docker:

```bash
# Run tests with coverage (>= 85% required on domain/ and services/)
pytest

# Lint and check formatting with Ruff
ruff check .
ruff format --check .

# Static type check in strict mode
mypy app tests

# Run all quality checks inside Docker
make docker-check
```

## API Routes

| Method | Route | Description | Query / Body | Success Response | Error Codes |
|---|---|---|---|---|---|
| `GET` | `/healthz` | Liveness check | None | `{"status": "ok", "gemini": bool}` | - |
| `GET` | `/readyz` | Readiness check | None | `{"status": "ok", "catalog_loaded": bool}` | - |
| `GET` | `/api/products` | Catalog search with filters | `?q=&category=&brand=&minPrice=&maxPrice=&minRam=&minBattery=&maxWeight=&tag=&inStock=1&sort=&limit=&chaos=&latency=` | `{"products": [...], "total": int, "tookMs": int}` | `INVALID_INPUT`, `TRANSIENT` |
| `GET` | `/api/products/{id}` | Single product lookup | `?chaos=&latency=` | `{"product": Product}` | `NOT_FOUND`, `TRANSIENT` |
| `GET` | `/api/cart` | Get session cart | Cookie: `persona_sid` (auto-generated if missing) | `{"cart": Cart}` | `TRANSIENT` |
| `POST` | `/api/cart` | Add product to cart | `{"productId": str, "qty": int}` | `{"cart": Cart}` | `NOT_FOUND`, `OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `INVALID_INPUT`, `TRANSIENT` |
| `PATCH` | `/api/cart` | Update item quantity | `{"productId": str, "qty": int}` (0 removes item) | `{"cart": Cart}` | `NOT_IN_CART`, `INSUFFICIENT_STOCK`, `INVALID_INPUT`, `TRANSIENT` |
| `DELETE` | `/api/cart` | Remove item or clear cart | `?productId=...` (clears cart if omitted) | `{"cart": Cart}` | `NOT_IN_CART`, `TRANSIENT` |

Errors always follow the uniform error structure:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No product with id \"xyz\"."
  }
}
```
