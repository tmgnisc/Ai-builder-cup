import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from .config import get_settings


def hash_password(password: str, salt: str | None = None) -> str:
    """Hashes a password with PBKDF2-HMAC-SHA256 and salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}:{key.hex()}"


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verifies a plain text password against a stored PBKDF2 hash."""
    try:
        if ":" not in password_hash:
            return False
        salt, key_hex = password_hash.split(":", 1)
        new_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return secrets.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False


def create_access_token(payload: dict[str, Any], expires_in_seconds: int = 86400 * 7) -> str:
    """Generates an HMAC-SHA256 signed session token."""
    settings = get_settings()
    secret = (settings.agent_shared_secret or "persona_secret_key_2026").encode("utf-8")
    
    data = dict(payload)
    data["exp"] = int(time.time()) + expires_in_seconds
    data["nonce"] = secrets.token_hex(8)

    raw_json = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
    import base64
    b64_data = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")
    sig = hmac.new(secret, b64_data.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_data}.{sig}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodes and validates HMAC-SHA256 signed session token."""
    try:
        if "." not in token:
            return None
        b64_data, sig = token.split(".", 1)
        settings = get_settings()
        secret = (settings.agent_shared_secret or "persona_secret_key_2026").encode("utf-8")
        
        expected_sig = hmac.new(secret, b64_data.encode("utf-8"), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(sig, expected_sig):
            return None

        import base64
        # Add back padding
        pad = len(b64_data) % 4
        if pad:
            b64_data += "=" * (4 - pad)
        raw_json = base64.urlsafe_b64decode(b64_data).decode("utf-8")
        data = json.loads(raw_json)

        if data.get("exp", 0) < time.time():
            return None

        return data
    except Exception:
        return None
