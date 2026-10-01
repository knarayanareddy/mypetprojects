#!/usr/bin/env python3
"""GitHub connector: official REST search API. Works without a token (low rate limit); set
GITHUB_TOKEN for a higher limit. Not a scraper.

Best signal for developer tools and open-source projects:
  - repos:  who already builds this, with how many stars, how recently active (supply + traction)
  - issues: real feature requests and complaints, ranked by reactions (demand in users' own words)

Usage:
  python3 github_search.py repos  "<keywords>" [--limit N] [--language python]
  python3 github_search.py issues "<keywords>" [--limit N] [--state open|closed]

Output: JSON on stdout. Platform label for evidence items: "GitHub".
Note: stars are attention, not payment. Treat them as behavioral evidence, never as hard evidence.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402

API = "https://api.github.com/search/"


def _headers():
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


def repos(q, limit, language):
    query = q + (f" language:{language}" if language else "")
    d = H.get(API + "repositories?" + H.qs({"q": query, "sort": "stars", "order": "desc", "per_page": min(limit, 50)}),
              headers=_headers())
    items = [{"name": r.get("full_name"), "description": (r.get("description") or "")[:300],
              "stars": r.get("stargazers_count"), "forks": r.get("forks_count"),
              "open_issues": r.get("open_issues_count"), "license": (r.get("license") or {}).get("spdx_id"),
              "last_push": r.get("pushed_at"), "created": r.get("created_at"),
              "archived": r.get("archived"), "url": r.get("html_url")} for r in d.get("items", [])]
    return {"source": "github_repos", "query": q, "total_count": d.get("total_count"),
            "count": len(items), "items": items}


def issues(q, limit, state):
    query = f"{q} is:issue" + (f" state:{state}" if state else "")
    d = H.get(API + "issues?" + H.qs({"q": query, "sort": "reactions", "order": "desc", "per_page": min(limit, 50)}),
              headers=_headers())
    items = [{"title": i.get("title"), "text": (i.get("body") or "")[:500],
              "reactions": (i.get("reactions") or {}).get("total_count"), "comments": i.get("comments"),
              "state": i.get("state"), "created": i.get("created_at"), "url": i.get("html_url")}
             for i in d.get("items", [])]
    return {"source": "github_issues", "query": q, "total_count": d.get("total_count"),
            "count": len(items), "items": items}


def main():
    ap = argparse.ArgumentParser(description="Search GitHub repositories or issues (official API).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("repos")
    r.add_argument("query")
    r.add_argument("--limit", type=int, default=10)
    r.add_argument("--language", default="")
    i = sub.add_parser("issues")
    i.add_argument("query")
    i.add_argument("--limit", type=int, default=15)
    i.add_argument("--state", default="", choices=["", "open", "closed"])
    a = ap.parse_args()
    try:
        res = repos(a.query, a.limit, a.language) if a.cmd == "repos" else issues(a.query, a.limit, a.state)
    except H.NET_ERRORS as e:
        res = {"source": "github", "query": a.query, "error": str(e),
               "hint": "unauthenticated search is rate limited; set GITHUB_TOKEN or retry in a minute"}
    H.emit(res)


if __name__ == "__main__":
    main()
