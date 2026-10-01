#!/usr/bin/env python3
"""App Store connector: Apple's official iTunes Search API + customer-review RSS (free, no key).

Usage:
  python3 itunes.py search "<app name or keywords>" [--limit N] [--country us]
      -> app id, rating, rating count, price (hard supply-side competitor metrics)
  python3 itunes.py reviews <app_id> [--pages N] [--country us]
      -> real user reviews with star ratings (pain points, complaints from paying users)

Output: JSON on stdout. Platform label for evidence items: "App Store".
Tip: read the 1-3 star reviews first; they carry the gaps.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402

SEARCH = "https://itunes.apple.com/search"
RSS = "https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={app_id}/sortby=mostrecent/json"


def do_search(term, limit, country):
    d = H.get(SEARCH + "?" + H.qs({"term": term, "entity": "software", "limit": min(limit, 50),
                                    "country": country}))
    apps = [{
        "id": r.get("trackId"), "name": r.get("trackName"), "seller": r.get("sellerName"),
        "rating": r.get("averageUserRating"), "rating_count": r.get("userRatingCount"),
        "price": r.get("formattedPrice"), "genres": r.get("genres"), "url": r.get("trackViewUrl"),
    } for r in d.get("results", [])]
    return {"source": "appstore_search", "term": term, "count": len(apps), "apps": apps}


def do_reviews(app_id, pages, country):
    out = []
    for p in range(1, pages + 1):
        try:
            d = H.get(RSS.format(country=country, page=p, app_id=app_id))
        except H.NET_ERRORS:
            break
        entries = d.get("feed", {}).get("entry", [])
        if isinstance(entries, dict):
            entries = [entries]
        # on page 1 the first entry is app metadata; reviews start at the second
        for e in entries[1:] if p == 1 else entries:
            if "im:rating" not in e:
                continue
            out.append({
                "rating": int(e["im:rating"]["label"]),
                "title": e.get("title", {}).get("label", ""),
                "text": e.get("content", {}).get("label", "")[:600],
                "version": e.get("im:version", {}).get("label", ""),
                "author": e.get("author", {}).get("name", {}).get("label", ""),
            })
    return {"source": "appstore_reviews", "app_id": app_id, "count": len(out), "reviews": out}


def main():
    ap = argparse.ArgumentParser(description="App Store search and reviews (official free endpoints).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("term")
    s.add_argument("--limit", type=int, default=5)
    s.add_argument("--country", default="us")
    r = sub.add_parser("reviews")
    r.add_argument("app_id")
    r.add_argument("--pages", type=int, default=3)
    r.add_argument("--country", default="us")
    a = ap.parse_args()
    try:
        res = do_search(a.term, a.limit, a.country) if a.cmd == "search" else do_reviews(a.app_id, a.pages, a.country)
    except H.NET_ERRORS as e:
        res = {"source": "appstore", "error": str(e)}
    H.emit(res)


if __name__ == "__main__":
    main()
