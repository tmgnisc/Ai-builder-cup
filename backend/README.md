# Persona backend (FastAPI)

Python API for Pip, built to deploy on Cloud Run with Gemini.

## Layout

```
backend/
  app/
    main.py            create_app() factory + `app` for uvicorn
    config.py          Settings (pydantic-settings, env / .env)
    errors.py          JSON error responses
    schemas.py         request/response models
    routers/           health, products, cart, agent
    services/gemini.py Gemini client (google-genai, async)
  tests/               pytest + TestClient
```

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env           # add GEMINI_API_KEY
uvicorn app.main:app --reload --port 8080
pytest
```

Interactive API docs: http://localhost:8080/docs

## Routes

| Route | Notes |
|---|---|
| `GET /healthz` | liveness, and whether a Gemini key is set |
| `GET /api/products?q=` / `GET /api/products/{id}` | catalog (empty until ported from `src/data/products.ts`) |
| `GET/POST/DELETE /api/cart` | cart keyed by the `persona_sid` cookie |
| `POST /api/agent` | `{ message }` → `{ reply }` from Gemini (503 without a key) |

Errors are always `{"error": {"code", "message"}}`.

## Deploy to Cloud Run

```bash
gcloud run deploy persona-api --source backend --region asia-south1 \
  --allow-unauthenticated --set-env-vars GEMINI_MODEL=gemini-2.5-flash,CORS_ORIGINS=https://<frontend-url> \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

## TODO

- Port the catalog and the agent tools (search, compare, add/remove with verify-after-act) from `src/lib/`.
- Stream NDJSON `AgentEvent`s from `/api/agent` with Gemini function calling.
- Move carts to Firestore so they survive multiple instances.
