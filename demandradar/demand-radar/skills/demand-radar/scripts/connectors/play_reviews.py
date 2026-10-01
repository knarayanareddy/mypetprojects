#!/usr/bin/env python3
"""Google Play reviews connector (optional): wraps the google-play-scraper library.

Optional dependency:  pip install google-play-scraper
Usage:
  python3 play_reviews.py "<package id, e.g. com.notion.id>" [--limit N] [--lang en] [--country us]

Output: JSON on stdout. Platform label for evidence items: "Google Play".
If the library is missing the script says so in JSON instead of crashing; skip Play for that run
and note it in `not_verified`.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="Google Play reviews (needs google-play-scraper).")
    ap.add_argument("package")
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--country", default="us")
    a = ap.parse_args()

    try:
        from google_play_scraper import Sort, reviews
    except ImportError:
        H.emit({"source": "googleplay", "package": a.package, "error": "google-play-scraper is not installed",
                "hint": "pip install google-play-scraper (or skip Google Play this run and use other sources)"})
        return
    try:
        result, _ = reviews(a.package, lang=a.lang, country=a.country, sort=Sort.NEWEST, count=a.limit)
    except Exception as e:  # the library raises many different exception types
        H.emit({"source": "googleplay", "package": a.package, "error": str(e)})
        return
    out = [{"rating": r.get("score"), "text": (r.get("content") or "")[:600],
            "thumbs_up": r.get("thumbsUpCount"), "version": r.get("reviewCreatedVersion"),
            "date": str(r.get("at"))} for r in result]
    H.emit({"source": "googleplay", "package": a.package, "count": len(out), "reviews": out})


if __name__ == "__main__":
    main()
