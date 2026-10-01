"""Tiny shared HTTP helper for the connectors (standard library only).

Every connector prints ONE JSON document to stdout and never raises on network errors:
failures come back as {"source": ..., "error": "...", "hint": "..."} so an agent can read the
result, log the gap in `not_verified`, and move on.
"""
import gzip
import json
import os
import urllib.error
import urllib.parse
import urllib.request

UA = os.environ.get("DEMAND_RADAR_UA", "demand-radar/1.0 (+https://github.com/lemomo-ai/demand-radar)")
TIMEOUT = float(os.environ.get("DEMAND_RADAR_TIMEOUT", "20"))
NET_ERRORS = (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ConnectionError, ValueError)


def get(url, headers=None, raw=False):
    h = {"User-Agent": UA, "Accept": "application/json"}
    h.update(headers or {})
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        body = r.read()
        charset = r.headers.get_content_charset() or "utf-8"
        if (r.headers.get("Content-Encoding") or "").lower() == "gzip":  # e.g. the Stack Exchange API
            body = gzip.decompress(body)
    text = body.decode(charset, errors="replace")
    return text if raw else json.loads(text)


def qs(params):
    return urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, "")})


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2))
