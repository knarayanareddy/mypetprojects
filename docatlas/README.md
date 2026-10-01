# docatlas

**DOC ATLAS — many documents in, one briefing out, every claim traceable.**

Feed it a pile of documents; get back a distilled briefing. The point is traceability: each
claim in the output links back to the document it came from, so you can verify rather than
trust.

Pipeline stages live in `src/lib/atlas/` — ingest, parse markdown, normalise, distil, then
validate and fact-check the result before rendering. Projects are browsable and each atlas
reports its own page, word and table counts.

## Stack

Next.js 16 · React 19 · PostgreSQL · Drizzle ORM · TypeScript

## Run

```bash
npm install
npm run dev
```
