# demandradar

**Demand Radar — find out if the demand is real before you build it.**

A demand-validation methodology packaged two ways: a landing site for the method, and a
self-contained agent kit you install into your own assistant.

A run is **Go**, **Conditional**, **Pivot** or **No-go** — never a vague "looks promising".
Evidence is collected, hypotheses judged, then red-teamed against forbidden patterns before a
report is written. Every conclusion traces back to sources.

## What's in here

- `demand-radar/` — the Claude plugin + skill: protocol, judge prompts, red-team checklist,
  report template, connectors (GitHub, HN, Reddit, StackExchange, Play, iTunes, SearXNG,
  fetch_url), and validation scripts.
- `install.py` — installs the kit into your agent.
- Site at the repo root — Next.js landing page with a scoring playground.

Adapters exist for Hermes and Roo Code alongside Claude.

## Stack

Next.js 16 · React 19 · PostgreSQL · Drizzle ORM · Python (connectors, scripts)

## Run

```bash
npm install
npm run dev        # site
python3 install.py # install the kit
```

The kit ships with its own runnable tests: `skills/demand-radar/scripts/tests/test_scripts.py`.
