# Persona backend (Flask)

Python API for Pip, built to deploy on Cloud Run with Gemini.

## Layout

```
backend/
  wsgi.py              entry point (gunicorn wsgi:app)
  app/
    __init__.py        create_app() factory
    config.py          env-driven config (Config, TestConfig)
    errors.py          JSON error responses
    routes/            blueprints: health, products, cart, agent
    services/gemini.py Gemini client (google-genai)
  tests/               pytest
```

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env           # add GEMINI_API_KEY
python wsgi.py                 # http://localhost:8080
pytest
```

## Routes

| Route | Notes |
|---|---|
| `GET /healthz` | liveness, and whether a Gemini key is set |
| `GET /api/products?q=` / `GET /api/products/:id` | catalog (empty until ported from `src/data/products.ts`) |
| `GET/POST/DELETE /api/cart` | cart keyed by the `persona_sid` cookie |
| `POST /api/agent` | `{ message }` → `{ reply }` from Gemini (503 without a key) |

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
