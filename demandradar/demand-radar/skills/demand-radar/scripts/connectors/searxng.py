#!/usr/bin/env python3
"""Web-search fallback for agent hosts WITHOUT a built-in search tool.

Uses a SearXNG instance (open-source metasearch, self-hostable, JSON API, no API key).
Point SEARXNG_URL at your instance, e.g.  export SEARXNG_URL=http://localhost:8080
(the instance must have `json` listed under search.formats in its settings.yml).

Hosts that already have web search should use it instead:
  Hermes `web_search`/`web_extract`  |  Roo Code: a search MCP server (Brave, Tavily, Exa, ...)  |
  Claude Code WebSearch / WebFetch  |  any other agent's native search tool.

Usage:
  python3 searxng.py "<query>" [--limit N] [--time-range day|month|year] [--engines a,b] [--lang en]

Output: JSON on stdout: {source, query, count, items: [{title, url, snippet, engine, published}]}
Platform label for evidence items: the site the result comes from (e.g. "Medium", "G2"), not
"SearXNG".
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="Web search through a SearXNG instance (SEARXNG_URL).")
    ap.add_argument("query")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--time-range", default="", choices=["", "day", "month", "year"])
    ap.add_argument("--engines", default="")
    ap.add_argument("--lang", default="")
    a = ap.parse_args()

    base = os.environ.get("SEARXNG_URL", "").rstrip("/")
    if not base:
        H.emit({"source": "searxng", "query": a.query, "error": "SEARXNG_URL is not set",
                "hint": "use the host's native web search tool, or export SEARXNG_URL=http://<your-instance>"})
        return
    try:
        d = H.get(base + "/search?" + H.qs({"q": a.query, "format": "json", "language": a.lang or None,
                                             "time_range": a.time_range, "engines": a.engines}))
    except H.NET_ERRORS as e:
        H.emit({"source": "searxng", "query": a.query, "error": str(e),
                "hint": "check SEARXNG_URL and that settings.yml enables the json format"})
        return
    items = [{"title": r.get("title"), "url": r.get("url"), "snippet": (r.get("content") or "")[:400],
              "engine": r.get("engine"), "published": r.get("publishedDate")}
             for r in d.get("results", [])[: a.limit]]
    H.emit({"source": "searxng", "query": a.query, "count": len(items), "items": items})


if __name__ == "__main__":
    main()
