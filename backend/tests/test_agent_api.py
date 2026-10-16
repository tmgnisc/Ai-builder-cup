from fastapi.testclient import TestClient
from google.genai import types

from app.api.routers.agent import set_agent_model_override
from app.core.config import Settings, get_settings
from app.main import create_app
from tests.scripted_llm import ScriptedLlm


def test_agent_api_fallback_mock() -> None:
    """When AGENT_BACKEND=mock, /api/agent returns 503 to signal fallback to frontend mockAgent."""
    set_agent_model_override(None)
    mock_settings = Settings(agent_backend="mock", gemini_api_key="")
    app = create_app(mock_settings)
    app.dependency_overrides[get_settings] = lambda: mock_settings
    client = TestClient(app)

    res = client.post("/api/agent", json={"message": "hello"})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "AGENT_MOCK"


def test_agent_api_fallback_missing_gemini_key() -> None:
    """When AGENT_BACKEND=gemini but GEMINI_API_KEY is missing, returns 503."""
    set_agent_model_override(None)
    gemini_settings = Settings(agent_backend="gemini", gemini_api_key="")
    app = create_app(gemini_settings)
    app.dependency_overrides[get_settings] = lambda: gemini_settings
    client = TestClient(app)

    res = client.post("/api/agent", json={"message": "hello"})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_agent_api_validation_max_length() -> None:
    """Message over 500 characters is rejected with 400 INVALID_INPUT."""
    test_settings = Settings(agent_backend="gemini", gemini_api_key="fake")
    app = create_app(test_settings)
    app.dependency_overrides[get_settings] = lambda: test_settings
    client = TestClient(app)

    res = client.post("/api/agent", json={"message": "a" * 501})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_INPUT"


def test_agent_api_rate_limiting() -> None:
    """Excessive requests from the same session get 429."""
    llm = ScriptedLlm(turns=[[[types.Part.from_text(text="Hi")]] for _ in range(70)])
    set_agent_model_override(llm)
    rate_settings = Settings(agent_backend="gemini", gemini_api_key="fake", agent_rate_limit_per_minute=5)
    app = create_app(rate_settings)
    app.dependency_overrides[get_settings] = lambda: rate_settings
    client = TestClient(app, cookies={"persona_sid": "sess_ratelimit"})

    # Send 5 requests (should succeed)
    for _ in range(5):
        res = client.post("/api/agent", json={"message": "test"})
        assert res.status_code == 200

    # 6th request triggers rate limit
    res6 = client.post("/api/agent", json={"message": "test"})
    assert res6.status_code == 429
    assert res6.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    set_agent_model_override(None)


def test_agent_api_streaming_success() -> None:
    """POST /api/agent returns valid NDJSON stream with content-type application/x-ndjson."""
    llm = ScriptedLlm(
        turns=[
            [
                [types.Part.from_text(text="Hello! How can I assist you with electronics today?")],
            ]
        ]
    )
    set_agent_model_override(llm)
    app = create_app(Settings(agent_backend="gemini", gemini_api_key="fake"))
    client = TestClient(app, cookies={"persona_sid": "sess_stream_ok"})

    res = client.post("/api/agent", json={"message": "hello"})
    assert res.status_code == 200
    assert "application/x-ndjson" in res.headers["content-type"]

    lines = [line for line in res.text.strip().split("\n") if line.strip()]
    assert len(lines) >= 3  # state_change, message_start, text_delta, done
    assert "done" in lines[-1]
    set_agent_model_override(None)
