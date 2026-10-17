# Persona backend (FastAPI)

Production-grade Python API for Pip and the commerce catalog, cart, and tool layer.

## Layout

```
backend/
  app/
    agent/                 ADK Pip agent, event adapter, runner & choreography
      adapter.py           AgentEvent schemas (11 types), NDJSON serializer, memory models
      agent.py             Pip LlmAgent, callbacks (before/after/error), tool allowlist
      prompts.py           Pip system instructions, tone, grounding & guardrails
      runner.py            Stateless SessionProvider, event streaming engine
      tools_adk.py         FunctionTool wrappers around tool registry + ui_action & missing_info
    api/
      dependencies.py      FastAPI Depends providers for repos, services, and agent
      routers/             health (/healthz, /readyz), products, cart, agent (/api/agent)
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
      delivery.py          Logistics rules (Express vs Standard delivery)
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
    fixtures/              Catalog, parity fixtures, and agent_events_schema.json
    conftest.py            Pytest fixtures and test client setup
    scripted_llm.py        Scripted LLM stub for deterministic ADK test scenarios
    test_agent_api.py      Agent API rate limiting, fallback, and streaming tests
    test_agent_contract.py Schema contract parity tests against TS schema fixture
    test_agent_scenarios.py 6 end-to-end scripted scenarios (search, compare, cart, chaos, missing info)
    test_agent_smoke.py    Live Gemini API smoke test (opt-in via GEMINI_API_KEY)
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
cp .env.example .env          # Set GEMINI_API_KEY if testing live agent
uvicorn app.main:app --reload --port 8080
```

### 2. Using Docker
```bash
cd backend
docker build -t persona-api .
docker run -p 8080:8080 -e GEMINI_API_KEY="your-key" persona-api
```

Interactive API documentation is available at `http://localhost:8080/docs`.

## Running Next.js Frontend with Python Backend Agent

To proxy the Next.js frontend agent calls to the Python FastAPI backend:

1. In `.env.local` (or root `.env`):
   ```env
   PERSONA_AGENT=gemini
   BACKEND_URL=http://localhost:8080
   ```
2. Start the backend:
   ```bash
   uvicorn app.main:app --port 8080
   ```
3. Start the Next.js dev server:
   ```bash
   pnpm dev
   ```

When `PERSONA_AGENT=gemini` and `BACKEND_URL` is set, `src/app/api/agent/route.ts` forwards user turns to `POST ${BACKEND_URL}/api/agent` and streams newline-delimited `AgentEvent` JSON directly to Pip. If the backend is unavailable or unconfigured, it transparently falls back to `mockAgent`.

## ADK Agent Design & Event Mapping

Pip is implemented using Google ADK (`google-adk==2.12.0`) with `BaseLlm` and `FunctionTool`.

### Event Mapping Contract

| Google ADK Event / Action | Emitted NDJSON `AgentEvent` | Notes / Payload |
|---|---|---|
| Turn start | `state_change` | `{state: "thinking", caption: "Thinking…"}` |
| Model text chunk | `message_start`, `text_delta` | Emitted lazily on first chunk, followed by incremental deltas |
| Tool invocation (before callback) | `state_change`, `tool_call` | State moves to tool state (`searching`, `comparing`, `acting`) |
| Read tool completion | `tool_result` | Summarized text, execution duration `durationMs`, `ok: true` |
| `search_products` result | `block` (`product_carousel`), `ui` (`highlight`) | Adapter generates carousel block with product IDs |
| `compare_products` result | `block` (`comparison`), `ui` (`open_compare`) | Adapter generates grounded comparison table & verdict |
| `add_to_cart` / `remove_from_cart` start | `block` (`cart_action`, status=`pending`) | Emitted before mutation acts |
| `add_to_cart` verified result | `block` (`cart_action`, status=`verified`), `ui` (`cart_updated`) | Re-read cart verification passed |
| `add_to_cart` failed / silent chaos | `block` (`cart_action`, status=`failed`), correction `text_delta` | Verified outcome honesty guardrail |
| `record_missing_info` call | `missing_info` | `{field, productId, question?}` for merchant dashboard |
| `ui_action` call | `ui` | Allowed kinds: `highlight`, `move_to`, `scroll_to`, `set_filters`, etc. |
| Tool error / retry | `tool_result` (`ok: false`) | Auto-retries read tools 1x on `TRANSIENT`; cart mutations are never retried |
| Turn finish | `memory`, `state_change`, `done` | `state_change` settles to `success` or `idle`; `done` is always final |

### Guardrails Enforced in Code
- **Verify-After-Act**: Add/remove operations pass through `VerifiedCartService` which re-reads persistence. The model cannot hallucinate success if verification fails; code appends a factual correction.
- **No Checkout Tool**: Explicitly excluded from tool registry and prompt declarations.
- **Grounded Facts**: All specs and stock come strictly from catalog tools. Unknown facts trigger `record_missing_info` and emit `missing_info` events to the merchant dashboard.
- **Tool Cap**: Max 8 tool invocations per turn.
- **Retry Discipline**: Retries apply exclusively to read tools encountering `TRANSIENT` errors.

## Test and Verification

All quality checks run cleanly locally or inside Docker:

```bash
# Run full test suite with coverage (90%+ overall)
pytest --cov=app/agent --cov=app/domain --cov=app/services

# Lint and check formatting with Ruff
ruff check .
ruff format --check .

# Static type check in strict mode
mypy app tests

# Run all checks in Docker
docker run --rm -v "${pwd}\backend:/app" persona-backend-test pytest
docker run --rm -v "${pwd}\backend:/app" persona-backend-test ruff check .
docker run --rm -v "${pwd}\backend:/app" persona-backend-test mypy app tests
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
| `POST` | `/api/agent` | Pip agent turn (NDJSON stream) | `{"message": str, "memory": AgentMemory, "context": AgentContext}` | NDJSON `AgentEvent` stream | `SERVICE_UNAVAILABLE`, `RATE_LIMIT_EXCEEDED`, `INVALID_INPUT` |

Errors always follow the uniform error structure:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No product with id \"xyz\"."
  }
}
```
