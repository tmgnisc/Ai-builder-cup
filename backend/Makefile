.PHONY: install run test lint typecheck check docker-build docker-test docker-lint docker-typecheck docker-check

install:
	pip install -r requirements-dev.txt

run:
	uvicorn app.main:app --reload --port 8080

test:
	pytest

lint:
	ruff check .
	ruff format --check .

typecheck:
	mypy app tests

check: lint typecheck test

docker-build:
	docker build -t persona-api .

docker-test:
	docker build --target test -t persona-backend-test .
	docker run --rm persona-backend-test pytest

docker-lint:
	docker build --target test -t persona-backend-test .
	docker run --rm persona-backend-test ruff check .
	docker run --rm persona-backend-test ruff format --check .

docker-typecheck:
	docker build --target test -t persona-backend-test .
	docker run --rm persona-backend-test mypy app tests

docker-check:
	docker build --target test -t persona-backend-test .
	docker run --rm persona-backend-test ruff check .
	docker run --rm persona-backend-test ruff format --check .
	docker run --rm persona-backend-test mypy app tests
	docker run --rm persona-backend-test pytest
