# Persona: Autonomous Multi-Agent AI Shopping Companion

[![Next.js 15](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![Google ADK](https://img.shields.io/badge/Google_ADK-2.12.0-4285F4?logo=google)](https://github.com/google/agent-development-kit)
[![Gemini 3.5 Flash](https://img.shields.io/badge/Model-Gemini_3.5_Flash-8E75C2?logo=googlegemini)](https://ai.google.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Container_Ready-2496ED?logo=docker)](https://www.docker.com/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success)](https://www.w3.org/WAI/WCAG21/quickref/)

**Persona** is an agentic e-commerce platform that reimagines shopping with an intelligent, grounded companion named **Pip**. Rather than a static chatbot widget in the corner, Pip is an interactive spatial companion that navigates the viewport, choreographs UI animations, searches and compares product options across categories, verifies cart transactions against silent database drops, and coordinates a team of autonomous sub-agents.

---

## Key Capabilities

### 1. Multi-Agent Orchestration (Google ADK)
* **Supervisor Agent (`Pip`)**: Maintains user context, conversational memory, voice interaction, and UI choreography. Powered by `gemini-3.5-flash` (with automated multi-model fallback to `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-1.5-flash`) with `thinking_budget=0` for immediate sub-second stream latency.
* **Product Finder Sub-Agent (`Scout`)**: When a shopper requests multiple distinct items (for example, "I need a lightweight laptop and noise-cancelling headphones" or "find a college outfit and backpack"), Pip delegates to Scout. Scout queries the catalog concurrently across multiple categories, compiles a structured package bundle, computes total NPR package pricing, and emits interactive bundle cards.
* **Comparison Specialist Sub-Agent (`Analyst`)**: Performs structured side-by-side evaluation across 2 to 4 products on key dimensions (Price, Battery, Weight, RAM, Storage, Materials, Fit, Warranty).
* **Cart and Fulfillment Guard Sub-Agent (`Guard`)**: Executes atomic stock checks, city delivery feasibility, and multi-item cart mutations with verify-after-act semantics.

### 2. Transactional "Verify-After-Act" Cart Protection
In traditional agentic systems, agents hallucinate write successes. Persona introduces **Verify-After-Act**:
* Every cart mutation (`add_to_cart`, `remove_from_cart`, `batch_cart_with_guard`) immediately re-reads the persisted cart from the database before declaring success.
* **Chaos Mode**: Append `?chaos=0.3` to simulate store network drops and silent failures. If the backend drops the write, Pip catches it, updates the UI block to `failed ✕`, and honestly tells the shopper rather than giving false confirmation.

### 3. Spatial Roaming Companion (`Pip`)
* **Physical Presence**: Pip is rendered as a responsive Three.js canvas that flies smoothly across the screen using curved bezier paths and GSAP easing.
* **5 Flight Modes**: `free` (gentle float), `anchored` (tracks scrolled elements), `follow` (trails cursor), `parked` (retires to corner), and `dragging`.
* **Proactive Guide Engine**: Context-aware check-ins when users hesitate or compare products, offering tips derived strictly from catalog analytics.
* **Voice Interaction**: Native Web Speech API integration (`lang=en-IN`) with real-time mic loudness envelopes and synchronized TTS speech pulses.

### 4. On-Device Virtual Try-On Studio (`/tryon`)
* **Live Pose Detection**: Runs client-side using MediaPipe Pose Landmarker without sending user camera frames to any remote server.
* **Interactive Canvas Fitting**: Real-time virtual try-on for hoodies, t-shirts, jackets, and accessories with customizable fabric colors and garment scaling.

### 5. Comparison Workspace (`/compare`)
* Dedicated comparison workspace supporting 2 to 4 products.
* Sticky product cards, mobile 390px scroll-snap columns with pinned attribute labels.
* **Differences-only toggle** with accessible `aria-live` announcements.
* Best-value highlights, cross-category guards, and grounded trade-off summaries.

### 6. Merchant Intelligence Dashboard (`/merchant`)
* **KPIs & Sparklines**: Real-time tracked metrics for assisted sessions, verified cart additions, and guide engagement.
* **Drop-off Funnel**: Full visibility from initial greeting to checkout navigation.
* **Missing Product Information Audit**: Logs shopper queries about specs not listed in the catalog (for example, keyboard backlighting or garment wash care), allowing store owners to enrich product data.

---

## Streaming Event Contract (NDJSON)

Each agent turn streams newline-delimited JSON events over HTTP `POST /api/agent`:

| Event Type | Payload Schema | Description |
|---|---|---|
| `state_change` | `{ type: "state_change", state: "searching" \| "comparing" \| ..., caption?: string }` | Drives Pip's animation state and bubble caption. |
| `subagent` | `{ type: "subagent", agent: "scout" \| "analyst" \| "guard", name: string, status: string, task: string, detail?: string }` | Real-time lifecycle and progress for sub-agents. |
| `tool_call` | `{ type: "tool_call", messageId: string, callId: string, name: string, input: object }` | Transparent audit trail for tool invocations. |
| `tool_result` | `{ type: "tool_result", messageId: string, callId: string, name: string, ok: boolean, summary: string }` | Grounded execution outcome. |
| `block` | `{ type: "block", block: ProductCarouselBlock \| ComparisonBlock \| CartActionBlock \| BundleBlock }` | Rich interactive message cards in chat. |
| `ui` | `{ type: "ui", action: { type: "highlight" \| "move_to" \| "open_compare" \| "cart_updated", ... } }` | Client side-effects and animations. |
| `text_delta` | `{ type: "text_delta", messageId: string, delta: string }` | Streamed conversational tokens. |
| `memory` | `{ type: "memory", memory: AgentMemory }` | Updated conversation and focus state. |
| `done` | `{ type: "done" }` | Turn lifecycle completion. |

---

## Project Structure

```
Ai-builder-cup/
├── backend/                        # Python FastAPI & Google ADK Backend
│   ├── app/
│   │   ├── agent/                 # Agent loop, adapter, prompts, and tools
│   │   │   ├── subagents/         # Autonomous Sub-Agent Team
│   │   │   │   ├── product_finder.py  # Scout Sub-Agent (Multi-item discovery)
│   │   │   │   ├── comparator.py      # Analyst Sub-Agent (Spec comparison)
│   │   │   │   └── cart_guard.py      # Guard Sub-Agent (Verified cart)
│   │   │   ├── adapter.py         # NDJSON event models and Pydantic schemas
│   │   │   ├── agent.py           # Pip ADK LlmAgent setup and callbacks
│   │   │   ├── runner.py          # Streaming runner and timeout management
│   │   │   └── tools_adk.py       # Allowlisted FunctionTools
│   │   ├── api/routers/           # FastAPI HTTP endpoints (/agent, /products, /cart, /health)
│   │   ├── core/                  # Configuration, database engine, error handlers
│   │   ├── domain/                # Catalog search, comparison engine, chaos injection
│   │   └── services/              # CatalogService, VerifiedCartService
│   ├── tests/                     # 78 Pytest test suite (contract, parity, scenarios)
│   └── requirements.txt
├── src/                           # Next.js 15 Frontend
│   ├── app/                       # App router pages (/, /compare, /merchant, /product/[id])
│   ├── components/                # UI components and Three.js Pip companion
│   ├── features/                  # Catalog, compare workspace, companion controls
│   ├── lib/                       # Agent client, commerce helpers, guide engine, signals
│   └── store/                     # Zustand stores (useChat, useCompanion, useCart)
├── .github/workflows/             # GitHub Actions CI/CD (GCP Cloud Run deployment)
└── README.md
```

---

## Quickstart & Local Development

### Prerequisites
* **Node.js**: v20.x or higher
* **pnpm**: v9.x or higher
* **Python**: v3.12.x

### 1. Frontend Setup
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
# Web app will be live at http://localhost:3000

# Run all 196 Vitest unit and integration tests
pnpm test

# Typecheck and production build
pnpm typecheck
pnpm build
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment & activate
python -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run backend development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run all 78 Pytest unit, contract, and multi-agent tests
pytest -v
```

### 3. Environment Variables

Create `.env` in the root and in `backend/`:

```ini
# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO

# Gemini LLM Settings
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash,gemini-1.5-flash
AGENT_BACKEND=gemini

# Database (PostgreSQL)
# Optional in dev (falls back to mock repository), required for production Cloud SQL
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/persona

# Security
AGENT_SHARED_SECRET=your_secret_token_here
```

---

## Deployment

The backend application is container-ready with Docker:

```bash
# Build and run backend container
docker build -t persona-backend ./backend
docker run -p 8000:8000 --env-file ./backend/.env persona-backend
```

CI/CD automation is configured with GitHub Actions in [`.github/workflows/deploy-backend.yml`](.github/workflows/deploy-backend.yml) for automated builds, testing, and deployment to container platforms (such as Google Cloud Run, AWS ECS, or Kubernetes).

---

## License

This project was built for the **AI Builder Cup**. Distributed under the MIT License.
