import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    DEBUG = os.environ.get("FLASK_ENV") == "development"
    TESTING = False

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]


class TestConfig(Config):
    TESTING = True
    GEMINI_API_KEY = ""
