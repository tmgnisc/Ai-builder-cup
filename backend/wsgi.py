"""Entry point for gunicorn (`wsgi:app`) and `python wsgi.py` in development."""

import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=app.config["DEBUG"])
