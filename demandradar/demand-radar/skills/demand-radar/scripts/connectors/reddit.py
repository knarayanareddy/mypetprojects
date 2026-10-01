#!/usr/bin/env python3
"""Reddit connector (best effort). Prefers the official PRAW OAuth path; falls back to the public
.json endpoint, which is rate limited and often blocked for cloud / agent IPs.

Optional credentials (free, from https://www.reddit.com/prefs/apps) as environment variables:
  REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USER_AGENT
Optional dependency for the stable mode:  pip install praw

Usage:
  python3 reddit.py "<query>" [--limit N] [--subreddit all] [--sort relevance]

Output: JSON on stdout. Platform label for evidence items: "Reddit".
Treat Reddit as optional: when it fails, say so in `not_verified` and lean on the other sources.
"""
import argparse
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402

UA = os.environ.get("REDDIT_USER_AGENT", H.UA)


def via_praw(query, limit, subreddit, sort):
    import praw
    r = praw.Reddit(client_id=os.environ["REDDIT_CLIENT_ID"],
                    client_secret=os.environ["REDDIT_CLIENT_SECRET"], user_agent=UA)
    out = [{"subreddit": str(p.subreddit), "title": p.title, "text": (p.selftext or "")[:600],
            "ups": p.score, "num_comments": p.num_comments,
            "url": f"https://reddit.com{p.permalink}", "created": p.created_utc}
           for p in r.subreddit(subreddit).search(query, sort=sort, limit=limit)]
    return {"source": "reddit", "mode": "praw", "query": query, "count": len(out), "items": out}


def via_json(query, limit, subreddit, sort):
    base = (f"https://www.reddit.com/r/{subreddit}/search.json" if subreddit != "all"
            else "https://www.reddit.com/search.json")
    url = base + "?" + urllib.parse.urlencode(
        {"q": query, "limit": limit, "sort": sort, "restrict_sr": "1" if subreddit != "all" else "0"})
    d = H.get(url, headers={"User-Agent": UA})
    out = []
    for c in d.get("data", {}).get("children", []):
        p = c["data"]
        out.append({"subreddit": p.get("subreddit"), "title": p.get("title"),
                    "text": (p.get("selftext") or "")[:600], "ups": p.get("ups"),
                    "num_comments": p.get("num_comments"),
                    "url": "https://reddit.com" + p.get("permalink", ""), "created": p.get("created_utc")})
    return {"source": "reddit", "mode": "json", "query": query, "count": len(out), "items": out}


def main():
    ap = argparse.ArgumentParser(description="Search Reddit (PRAW if configured, else public .json).")
    ap.add_argument("query")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--subreddit", default="all")
    ap.add_argument("--sort", default="relevance", help="relevance | hot | top | new | comments")
    a = ap.parse_args()

    has_creds = os.environ.get("REDDIT_CLIENT_ID") and os.environ.get("REDDIT_CLIENT_SECRET")
    try:
        if has_creds:
            try:
                res = via_praw(a.query, a.limit, a.subreddit, a.sort)
            except ImportError:
                res = via_json(a.query, a.limit, a.subreddit, a.sort)
                res["note"] = "credentials set but praw is not installed; fell back to .json (pip install praw)"
        else:
            res = via_json(a.query, a.limit, a.subreddit, a.sort)
            res["note"] = "no PRAW credentials; used the public .json endpoint (may be rate limited)"
    except H.NET_ERRORS as e:
        res = {"source": "reddit", "query": a.query, "error": str(e),
               "hint": "Reddit is rate limiting or blocking this IP; retry later, set PRAW credentials, or skip"}
    H.emit(res)


if __name__ == "__main__":
    main()
