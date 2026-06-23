import time
import hmac
import hashlib
import json
import base64

SECRET = "careeros_secret_key_2024"

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def create_token(payload: dict) -> str:
    payload = {**payload, "iat": int(time.time()), "exp": int(time.time()) + 86400 * 7}
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64(json.dumps(payload).encode())
    sig = _b64(hmac.new(SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def verify_token(token: str) -> dict | None:
    try:
        header, body, sig = token.split(".")
        expected = _b64(hmac.new(SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if sig != expected:
            return None
        payload = json.loads(base64.urlsafe_b64decode(body + "=="))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
