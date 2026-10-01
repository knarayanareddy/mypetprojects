# Notice and attribution

## Original work

**Demand Radar**, Copyright (c) 2026 Leif Diao. Source: https://github.com/lemomo-ai/demand-radar
Licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0): https://creativecommons.org/licenses/by-nc/4.0/legalcode
The full upstream license text, including the author's commercial-use clause, is in [LICENSE](LICENSE).

## This adaptation

This repository is an adapted version of the original work. It is **not endorsed by the original author**. Changes were made; they are listed in [CHANGES.md](CHANGES.md).
It is distributed under the same license (CC BY-NC 4.0) and adds no rights beyond it.

What that means in practice:

- You may share and adapt it for non-commercial purposes, with credit to the original repository, a link to the license, and an indication of changes (this file and CHANGES.md do that for you; keep them when you redistribute).
- Commercial use (paid products, paid hosted services, for-profit internal use beyond individual scope, selling reports made with its scoring) requires a separate license from the original author: leifdiao@gmail.com.
- Reports produced by `generate_report.py` carry a footer crediting the original project. Keep it when you share them publicly.
- The software is provided "as is", without warranty. A verdict is a decision aid built from public evidence, not a guarantee about any market.

## Third-party services the scripts talk to (when you run them)

Hacker News Algolia API, GitHub REST API, Stack Exchange API, Apple iTunes Search / RSS, optionally Reddit, Google Play (via the `google-play-scraper` package) and a SearXNG instance of your choice.
Respect each service's terms and rate limits; the connectors keep request volume small by default and never bypass access controls.
