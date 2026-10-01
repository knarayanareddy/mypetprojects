#!/usr/bin/env python3
"""Hacker News connector: official Algolia search API (free, no key, not a scraper).

Usage:
  python3 hn_algolia.py "<query>" [--tags comment|story|"(story,comment)"] [--limit N] [--days N]

Output (JSON on stdout):
  {source, query, count, items: [{type, text, url, points, num_comments, author, created, hn_url}]}

Platform label for evidence items: "HN". Caveat: HN over-represents developer and startup
voices; calibrate with top-down data before treating it as mass-market demand.
"""
import argparse
import datetime
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402

API = "https://hn.algolia.com/api/v1/search"
_ENT = {"&#x27;": "'", "&#39;": "'", "&quot;": '"', "&amp;": "&", "&#x2F;": "/",
        "&gt;": ">", "&lt;": "<", "&#62;": ">", "&#60;": "<"}


def clean(s):
    if not s:
        return ""
    s = re.sub(r"<[^>]+>", "", s)
    for a, b in _ENT.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def fetch(query, tags, limit, days):
    params = {"query": query, "tags": tags, "hitsPerPage": str(min(limit, 100))}
    if days:
        cutoff = int((datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)).timestamp())
        params["numericFilters"] = f"created_at_i>{cutoff}"
    return H.get(API + "?" + H.qs(params))


def main():
    ap = argparse.ArgumentParser(description="Search Hacker News via the Algolia API.")
    ap.add_argument("query")
    ap.add_argument("--tags", default="(story,comment)", help="story | comment | (story,comment)")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--days", type=int, default=0, help="only the last N days (0 = no limit)")
    a = ap.parse_args()
    try:
        d = fetch(a.query, a.tags, a.limit, a.days)
    except H.NET_ERRORS as e:
        H.emit({"source": "hackernews", "query": a.query, "error": str(e)})
        return
    items = []
    for h in d.get("hits", []):
        text = clean(h.get("comment_text") or h.get("story_text") or h.get("title"))
        if not text:
            continue
        items.append({
            "type": "comment" if h.get("comment_text") else "story",
            "text": text[:500],
            "url": h.get("url") or h.get("story_url"),
            "points": h.get("points"),
            "num_comments": h.get("num_comments"),
            "author": h.get("author"),
            "created": h.get("created_at"),
            "hn_url": f"https://news.ycombinator.com/item?id={h.get('objectID')}",
        })
    H.emit({"source": "hackernews", "query": a.query, "count": len(items), "items": items})


if __name__ == "__main__":
    main()
