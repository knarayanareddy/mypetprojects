#!/usr/bin/env python3
"""Stack Exchange connector: official public API (free, no key, 300 requests/day per IP).

Search questions on Stack Overflow (default) or any Stack Exchange site. Question volume, votes
and "how do I work around X" phrasing are behavioral evidence of a recurring pain.

Usage:
  python3 stackexchange.py "<query>" [--site stackoverflow] [--limit N] [--sort votes|relevance|activity]

Output: JSON on stdout. Platform label for evidence items: "Stack Overflow" (or "Stack Exchange"
for other sites).
"""
import argparse
import html
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402

API = "https://api.stackexchange.com/2.3/search/advanced"


def main():
    ap = argparse.ArgumentParser(description="Search Stack Exchange questions (official API).")
    ap.add_argument("query")
    ap.add_argument("--site", default="stackoverflow")
    ap.add_argument("--limit", type=int, default=15)
    ap.add_argument("--sort", default="relevance", choices=["votes", "relevance", "activity", "creation"])
    a = ap.parse_args()
    try:
        d = H.get(API + "?" + H.qs({"order": "desc", "sort": a.sort, "q": a.query, "site": a.site,
                                     "pagesize": min(a.limit, 50), "filter": "default"}))
    except H.NET_ERRORS as e:
        H.emit({"source": "stackexchange", "query": a.query, "error": str(e)})
        return
    items = [{"title": html.unescape(q.get("title", "")), "score": q.get("score"),
              "answers": q.get("answer_count"), "views": q.get("view_count"),
              "answered": q.get("is_answered"), "tags": q.get("tags"),
              "created": q.get("creation_date"), "url": q.get("link")} for q in d.get("items", [])]
    H.emit({"source": "stackexchange", "site": a.site, "query": a.query, "count": len(items),
            "quota_remaining": d.get("quota_remaining"), "items": items})


if __name__ == "__main__":
    main()
