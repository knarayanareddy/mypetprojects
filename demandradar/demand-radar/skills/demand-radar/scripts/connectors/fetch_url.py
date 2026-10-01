#!/usr/bin/env python3
"""Fetch one public web page and print readable text (fallback for hosts without a fetch tool).

Usage:
  python3 fetch_url.py "<url>" [--max-chars N]

Output: JSON on stdout: {source, url, title, text, truncated}. Plain GET of a public URL only:
no login, no JavaScript rendering, no anti-bot evasion. If a page needs any of those, record it
in `not_verified` instead of working around it. Hosts with a native fetch / browser tool should
prefer it (Hermes `web_extract`, Roo `browser_action` or a fetch MCP server, Claude WebFetch).
"""
import argparse
import os
import re
import sys
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _http as H  # noqa: E402

_SKIP = {"script", "style", "noscript", "svg", "nav", "footer", "header", "form", "iframe"}
_BLOCK = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section", "article", "blockquote"}


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.title, self._skip, self._in_title = [], "", 0, False

    def handle_starttag(self, tag, attrs):
        if tag in _SKIP:
            self._skip += 1
        elif tag == "title":
            self._in_title = True
        elif tag in _BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in _SKIP and self._skip:
            self._skip -= 1
        elif tag == "title":
            self._in_title = False
        elif tag in _BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip and data.strip():
            self.parts.append(data)


def main():
    ap = argparse.ArgumentParser(description="Fetch a public page as plain text.")
    ap.add_argument("url")
    ap.add_argument("--max-chars", type=int, default=6000)
    a = ap.parse_args()
    if not re.match(r"^https?://", a.url):
        H.emit({"source": "fetch", "url": a.url, "error": "only http(s) URLs are supported"})
        return
    try:
        raw = H.get(a.url, headers={"Accept": "text/html,application/xhtml+xml,text/plain"}, raw=True)
    except H.NET_ERRORS as e:
        H.emit({"source": "fetch", "url": a.url, "error": str(e)})
        return
    p = _Text()
    p.feed(raw)
    text = re.sub(r"[ \t]+", " ", "".join(p.parts))
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    H.emit({"source": "fetch", "url": a.url, "title": p.title.strip(), "text": text[: a.max_chars],
            "truncated": len(text) > a.max_chars})


if __name__ == "__main__":
    main()
