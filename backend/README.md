# Persona Backend (FastAPI & Google ADK)

Production-grade Python API for Pip and the autonomous multi-agent shopping team on the Persona agentic e-commerce platform.

---

## Directory Layout

```
backend/
  app/
    agent/                 # Google ADK Pip agent, event adapter, runner & choreography
      subagents/           # Autonomous Specialized Sub-Agent Team
        product_finder.py  # Scout Sub-Agent: Concurrent multi-product discovery & bundle pricing
        comparator.py      # Analyst Sub-Agent: Side-by-side spec scoring & trade-off matrices
        cart_guard.py      # Guard Sub-Agent: Stock verification & transactional batch cart additions
      adapter.py           # AgentEvent schemas (12 types), BundleBlock, NDJSON serializer
      agent.py             # Pip LlmAgent supervisor, callbacks (before/after/error), tool allowlist
      prompts.py           # Pip system instructions, multi-agent delegation, tone & guardrails
      runner.py            # Ephemeral session provider & real-time event streaming engine
      tools_adk.py         # ADK FunctionTool declarations (standard tools + subagent tools)
    api/
      dependencies.py      # FastAPI Depends providers for repos, services, and agent
      routers/             # health (/health), products, cart, orders, merchant, agent (/api/agent)
    core/
      config.py            # Settings (pydantic-settings, environment variables)
      database.py          # SQLAlchemy AsyncSession & asyncpg connection lifecycle
      errors.py            # Uniform JSON error handlers ({"error": {"code", "message"}})
      logging.py           # Structured JSON logging with request ID context
      middleware.py        # RequestIDMiddleware for distributed tracing
    data/
      products.json        # Seed catalog data
    domain/
      catalog.py           # In-memory tokenized search, filtering, and scoring
      chaos.py             # Chaos & latency simulation (transient 503 and silent drops)
      compare.py           # Catalog-grounded product comparisons and weighted scoring
      delivery.py          # Logistics rules (Express vs Standard delivery per city)
      format.py            # NPR currency formatting (South Asian commas), weight, storage
      models.py            # Pydantic v2 schemas for all commerce and cart entities
    repositories/
      cart.py              # CartRepository protocol + thread-safe InMemoryCartRepository
    services/
      cart.py              # CartService orchestrator with stock checks
      catalog.py           # CatalogService orchestrator
      verified_cart.py     # VerifiedCartService enforcing verify-after-act
    tools/
      executor.py          # Tool executor and schema generator
      models.py            # Tool context, definitions, and schemas
      registry.py          # Standard agent tools registry
    main.py                # FastAPI application factory (`create_app`) & uvicorn entrypoint
  tests/
    fixtures/              # Catalog, parity fixtures, and agent_events_schema.json
    conftest.py            # Pytest fixtures and test client setup
    scripted_llm.py        # Scripted LLM stub for deterministic ADK test scenarios
    test_agent_api.py      # Agent API rate limiting, fallback, and streaming tests
    test_agent_contract.py # Schema contract parity tests against TS schema fixture
    test_agent_scenarios.py# End-to-end scripted scenarios (search, compare, cart, chaos, missing info)
    test_agent_smoke.py    # Live Gemini API smoke test (opt-in via GEMINI_API_KEY)
    test_api.py            # HTTP endpoint integration tests
    test_domain.py         # Domain logic unit tests
    test_multi_agent.py    # Multi-agent orchestration unit & turn execution tests
    test_parity.py         # Parity tests asserting Python matches TS outputs
    test_services.py       # Service orchestration, stock rules, and concurrency tests
    test_tools.py          # Tool registry and execution tests
  Dockerfile               # Multi-stage production container
  pyproject.toml           # Ruff, mypy strict, and pytest coverage configuration
  requirements.txt         # Production dependencies
```

---

## Multi-Agent Architecture (Google ADK)

Persona uses Google ADK (`google-adk==2.12.0`) to orchestrate a team of autonomous agents:

### 1. Supervisor Agent (`Pip`)
* **Role**: Primary conversational interface, tone controller, and UI choreography orchestrator.
* **LLM Engine**: Powered by Google Gemini Flash (`gemini-2.5-flash`) with `thinking_budget=0` for sub-second reactive streaming latency.
* **Delegation Logic**:
  * Single category query &rarr; Direct catalog tools (`search_products`).
  * Cross-category or multi-item requests (e.g. *"laptop and noise-cancelling headphones"*) &rarr; Delegates to **Product Finder (`Scout`)**.
  * Deep side-by-side technical evaluations &rarr; Delegates to **Comparison Specialist (`Analyst`)**.
  * Batch additions with stock verification &rarr; Delegates to **Cart Guard (`Guard`)**.

### 2. Autonomous Sub-Agents
* **`scout_multiple_products` (Scout)**:
  * Accepts structured search specifications for multiple slots (e.g. `[{"label": "Laptop", "category": "laptops", "q": "developer"}, {"label": "Audio", "category": "headphones", "q": "travel"}]`).
  * Concurrently queries the catalog for each slot with fallback query relaxation.
  * Constructs a curated package bundle, calculates total package price in NPR, and emits `bundle` blocks.
* **`analyze_comparison` (Analyst)**:
  * Evaluates 2 to 4 products side-by-side across dimensions (Price, Battery, Weight, RAM, Storage, Display, Warranty).
  * Computes weighted scores based on user priorities and declares a grounded winner.
* **`batch_cart_with_guard` (Guard)**:
  * Performs pre-mutation stock checks for each requested item.
  * Executes atomic cart additions through `VerifiedCartService`.
  * Guarantees zero dropped writes via verify-after-act.

---

## Streaming Event Contract (NDJSON)

Each agent turn streams newline-delimited JSON `AgentEvent` objects:

| Event Type | Model | Description |
|---|---|---|
| `state_change` | `StateChangeEvent` | State transition (`thinking`, `searching`, `comparing`, `acting`, `success`, `error`, `idle`) with caption. |
| `subagent` | `SubAgentEvent` | Subagent lifecycle (`scout`, `analyst`, `guard`) with status, task description, and result count. |
| `message_start` | `MessageStartEvent` | Marks beginning of an assistant message stream. |
| `text_delta` | `TextDeltaEvent` | Streamed text chunk from the language model. |
| `tool_call` | `ToolCallEvent` | Tool invocation with call ID, tool name, and input arguments. |
| `tool_result` | `ToolResultEvent` | Execution outcome with `ok` boolean, duration, and human-readable summary. |
| `block` | `BlockEvent` | Rich interactive message card (`product_carousel`, `comparison`, `cart_action`, `clarify`, `bundle`). |
| `ui` | `UiEvent` | Client-side visual action (`highlight`, `move_to`, `scroll_to`, `set_filters`, `open_drawer`, `open_compare`, `cart_updated`, `navigate`). |
| `missing_info` | `MissingInfoEvent` | Records unlisted product specs requested by shoppers for the merchant dashboard. |
| `memory` | `MemoryEvent` | Updated client-held turn memory (focus product, result IDs, compared IDs). |
| `error` | `ErrorEvent` | Emitted when an unrecoverable turn exception occurs. |
| `done` | `DoneEvent` | Concludes the turn stream. |

---

## Core Guardrails Enforced in Code

1. **Verify-After-Act**: Add and remove mutations pass through `VerifiedCartService` which re-reads database persistence. If a write is dropped or rejected, the model is barred from claiming success, and a factual correction is emitted.
2. **Strictly No Checkout Tool**: Pip cannot complete purchases or charge money. If the user wants to buy, Pip uses `ui_action(kind="navigate", payload={"to": "/checkout"})`.
3. **Grounded Spec Integrity**: All product specifications, stock levels, and NPR prices come strictly from tools. Unknown facts trigger `record_missing_info` rather than hallucinations.
4. **Tool-Call Cap**: Hard cap of 8 tool invocations per turn to prevent infinite loops. Subagents execute compound multi-item searches within a single tool call slot.
5. **Read Retry Discipline**: Automated single retry applies exclusively to read operations on `TRANSIENT` errors; mutating cart writes are never blindly retried.

---

## Running Locally

### 1. Python Environment Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
source .venv/bin/activate       # On Windows: .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start local API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

### 2. Environment Variables

Create `.env` in the `backend/` directory:

```ini
ENVIRONMENT=development
LOG_LEVEL=INFO

# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
AGENT_BACKEND=gemini

# Database (PostgreSQL)
# Optional in dev (falls back to mock repository), required for production
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/persona

# Security
AGENT_SHARED_SECRET=your_secret_token_here
```

### 3. Running with Next.js Frontend

To connect the Next.js frontend to the Python backend:

In your root `.env`:
```env
BACKEND_URL=http://localhost:8000
```

`src/app/api/agent/route.ts` proxies user turns directly to `POST ${BACKEND_URL}/api/agent` and streams newline-delimited events to the browser.

---

## Testing & Quality Assurance

Run the test suite:

```bash
# Run all unit, contract, and multi-agent tests
pytest -v

# Run with test coverage report (96% domain coverage)
pytest --cov=app/domain --cov=app/services --cov-report=term-missing

# Run specific multi-agent tests
pytest tests/test_multi_agent.py -v

# Static type checking
mypy app tests

# Linting with Ruff
ruff check .
```

---

## API Endpoints

| Method | Route | Description | Query / Body | Success Response | Error Codes |
|---|---|---|---|---|---|
| `GET` | `/health` | Health and readiness check | None | `{"status": "ok", "gemini": bool, "database": bool}` | - |
| `GET` | `/api/products` | Catalog search with filters | `?q=&category=&brand=&minPrice=&maxPrice=&sort=&limit=&chaos=` | `{"products": [...], "total": int, "tookMs": int}` | `INVALID_INPUT`, `TRANSIENT` |
| `GET` | `/api/products/{id}` | Single product lookup | `?chaos=&latency=` | `{"product": Product}` | `NOT_FOUND`, `TRANSIENT` |
| `GET` | `/api/cart` | Get session cart | Cookie: `persona_sid` | `{"cart": Cart}` | `TRANSIENT` |
| `POST` | `/api/cart` | Add product to cart | `{"productId": str, "qty": int}` | `{"cart": Cart}` | `NOT_FOUND`, `OUT_OF_STOCK`, `TRANSIENT` |
| `PATCH` | `/api/cart` | Update item quantity | `{"productId": str, "qty": int}` | `{"cart": Cart}` | `NOT_IN_CART`, `TRANSIENT` |
| `DELETE` | `/api/cart` | Remove item or clear cart | `?productId=...` | `{"cart": Cart}` | `NOT_IN_CART`, `TRANSIENT` |
| `POST` | `/api/agent` | Pip agent turn (NDJSON stream) | `{"message": str, "memory": AgentMemory, "context": AgentContext}` | NDJSON `AgentEvent` stream | `RATE_LIMIT_EXCEEDED`, `INVALID_INPUT` |
