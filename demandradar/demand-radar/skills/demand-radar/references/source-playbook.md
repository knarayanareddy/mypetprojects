# Source playbook: which sources to mine for which demand type

Decide the demand type first, then pick sources. Write 2-4 query variants per source, in every language the market needs, with
competitor names in the queries.

## Demand type to source priority

| Demand type | Top-down (authoritative) | Bottom-up (community / reviews) |
|---|---|---|
| **B2B SaaS / tool** | Gartner / IDC / Forrester, funding data, competitor filings, pricing pages | HN, Stack Overflow, GitHub issues, G2 / Capterra summaries, Product Hunt, Reddit if reachable |
| **Developer tool / open-source project** | GitHub topic and repo stats (stars, release cadence), package-registry download counts, vendor pricing pages, Stack Overflow survey | GitHub issues sorted by reactions, HN, Stack Overflow questions, Lobsters, Discord / Discourse communities |
| **Consumer app / mini-program** | Statista, QuestMobile, store charts | App Store / Google Play reviews, Xiaohongshu, TikTok, Reddit |
| **Physical / e-commerce** | industry reports, customs / statistics offices, Google Trends | marketplace reviews (paid sources), Reddit, social product-recommendation posts |
| **Content / creator** | platform official data, MCN reports | YouTube / Bilibili comments, creator communities, Discord |
| **General / unsure** | start with a web search for an industry overview to size the board | HN + GitHub + app-store reviews as a base |

## Query variants (2-4 per source)

Cover different sides of the hypothesis, not just synonyms:

1. **Pain**: `<situation> frustrating OR "pain" OR "hate that"`, `<product> too hard to use OR complaints`
2. **Alternatives**: `<job> alternative OR "instead of" OR "I use"`, `<competitor> vs`
3. **Payment signal**: `<solution> worth it OR pricing OR "would pay"`, `<category> is it worth paying for`
4. **Market size**: `<category> market size OR CAGR OR forecast <year>`
5. **Trend**: `<category> growing OR declining OR trend`, Google Trends comparison
6. **The opposite view (mandatory, at least one per source)**: `why nobody uses <category>`, `<category> failed`, `<workaround> is good enough`

## Search filters (denoise)

Use whatever your host's search tool supports to restrict to real communities (a domain filter or a `site:` operator; some
hosts ignore `site:` inside the query and offer a separate domain parameter instead, so check once and adapt).

- Real-community focus: news.ycombinator.com, lobste.rs, stackoverflow.com, github.com, v2ex.com, zhihu.com
- Drop SEO farms and press releases: exclude phrases like "sponsored", "press release", "top 10 best" listicles from affiliate sites
- Focus on genuine reviews: `"review" OR "comparison" OR "experience"`
- For Chinese-market products, run at least one variant targeting Chinese communities (Zhihu / Xiaohongshu / V2EX / Jike) to avoid English-source bias

## Connector cheat sheet

Run from anywhere with `python3 "$DR/scripts/connectors/<file>"`. All print one JSON document and never crash on network errors
(look for an `"error"` key). Standard library only, no keys, except where noted.

| Source | Command | You get |
|---|---|---|
| Hacker News | `hn_algolia.py "<query>" [--tags story\|comment] [--days N]` | comments / stories, points, URL |
| GitHub repos | `github_search.py repos "<keywords>" [--language python]` | competing projects: stars, forks, open issues, last push, license (set `GITHUB_TOKEN` for a higher rate limit) |
| GitHub issues | `github_search.py issues "<keywords>" [--state open]` | real feature requests and complaints ranked by reactions |
| Stack Overflow / Exchange | `stackexchange.py "<query>" [--site stackoverflow] [--sort votes]` | question volume, votes, answered or not |
| App Store lookup | `itunes.py search "<app name>" [--country us]` | app id, rating, rating count, price |
| App Store reviews | `itunes.py reviews <app_id> [--pages 3]` | real reviews with stars |
| Google Play (optional lib) | `play_reviews.py "<package>"` | reviews with stars; needs `pip install google-play-scraper` |
| Reddit (best effort) | `reddit.py "<query>" [--subreddit all]` | posts, votes; often blocked for agent IPs |
| Web search fallback | `searxng.py "<query>" [--time-range year]` | results; needs `SEARXNG_URL`. Prefer the host's native search |
| Page fetch fallback | `fetch_url.py "<url>" [--max-chars 6000]` | readable text of one public page. Prefer the host's native fetch |
| Reports / trends | host SEARCH + FETCH | market size, growth, capital |

## Evidence logging reminders

- Write `platform` from the fixed vocabulary (framework section G). "HN" / "Hacker News" / "news.ycombinator.com" are normalised,
  but spellings outside the vocabulary count as a new platform and can inflate the independent-source count.
- Mark `origin`: two blogs quoting one interview are not two independent sources.
- Fill `dims` (scorecard dimensions supported) and `claims` (sub-claim supported); the follow-up loop's gap check relies on `dims`.
- Keep the verbatim quote short and exact; paraphrase goes in `claim`.

## Anti-bias reminders

- Do not search only for words that support the hypothesis; leave one variant per source for the opposite view.
- Negative reviews carry more information than positive ones. Mine 1-3 star reviews first.
- Silent markets (B2B, elderly, blue-collar) have little community discussion; that is not proof of no demand. Fill with the top-down pillar.
- For open-source ideas, remember maintainers and contributors are not the same as users, and stars are not usage or payment.
