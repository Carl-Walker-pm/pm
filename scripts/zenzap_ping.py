#!/usr/bin/env python3
"""Verify Zenzap bot credentials and identity."""
import hmac, hashlib, json, os, time, urllib.request, urllib.error
from pathlib import Path

def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

load_env(Path(__file__).resolve().parents[1] / ".env.zenzap")

API_KEY = os.environ["ZENZAP_API_KEY"]
API_SECRET = os.environ["ZENZAP_API_SECRET"]
BASE_URL = os.environ.get("ZENZAP_API_BASE_URL", "https://api.zenzap.co").rstrip("/")

def signed_get(path: str):
    ts = str(int(time.time() * 1000))
    sig = hmac.new(API_SECRET.encode(), f"{ts}.{path}".encode(), hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "X-Signature": sig,
            "X-Timestamp": ts,
        },
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

status, me = signed_get("/v2/members/me")
print(json.dumps({"http": status, "bot": me}, indent=2))
