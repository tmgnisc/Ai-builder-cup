# Cloud Run image. Cloud Run injects $PORT (default 8080).
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Dev & testing stage
FROM base AS test
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
CMD ["pytest"]

# Production stage (default if no target specified)
FROM base AS prod
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
