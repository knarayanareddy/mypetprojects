# mypetprojects — collection review

## 1. Scope and verdict

Repository: `mypetprojects` at pinned SHA `db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d`. Stage: **collection** of multiple independent products, not one deployable system. Runtime **NOT RUN**.

The README says `"Each folder is a self-contained project"`, `"a few are full-stack Next.js apps backed by Postgres"` ([`README.md:5-6`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/README.md#L5-L6)), and `"Every project is independent"` ([`README.md:30-35`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/README.md#L30-L35)). That rules out any collection-wide readiness claim.

Inspected evidence in this revision: full snapshot tree metadata with `"tree_truncated": false` (`fleet-hardening-review/evidence/mypetprojects/snapshot.json:13-16`), the numbered top-level `README.md`, eleven numbered top-level manifests, and three extra pinned read-only manifests for `robot-control-interface-development`, `robotcontrol`, and `robots-final`.

Uninspected boundaries remain material: source behavior, auth logic, document parsers, runtime migrations, robot actuation, deployment/runtime config, secrets handling, and every folder not opened beyond tree metadata or a manifest.

## 2. Architecture and product boundary

This repository is a **portfolio with subproducts**, not a monorepo with shared guarantees.

| Unit family | Observed paths | Dependency/path signal | Boundary conclusion |
| --- | --- | --- | --- |
| Visual/interactive React/Vite projects | `AIevolution/package.json`, `P-doom/package.json`, `expand-tower-dataset-countries/package.json`, `implement-lemo-opuscar-project/package.json`, `interactive-camera-anatomy-website/package.json`, `interactive-f1-car-simulation/package.json`, `interactive-storytelling-flipbook-application/package.json`, `reconstruct-global-religious-architecture/package.json`, `recreate-and-enhance-seijaku/package.json` | README lists these separately (`README.md.txt:12-22`); manifests are standalone Vite-style frontends | Independent frontend projects; sibling results do not transfer. |
| `demandradar` top-level app | `demandradar/src/app/api/kit/file/route.ts`, `demandradar/src/app/api/kit/zip/route.ts`, `demandradar/src/db/schema.ts` (`snapshot.json:126-140`) | `"next"`, `"drizzle-orm"`, `"pg"`, `"jszip"` ([`demandradar/package.json:11-18`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/demandradar/package.json#L11-L18)) | Separate Next.js/Postgres app with file-generation routes. |
| Nested `demandradar/demand-radar` toolkit | `demandradar/demand-radar/install.py`, `.../adapters/...`, `.../skills/demand-radar/scripts/tests/test_scripts.py` (`snapshot.json:72-120`) | Nested subtree includes installer, adapters, prompts, scripts, and its own tests path | Separate nested deliverable; parent app status cannot certify it. |
| `docatlas` app | `docatlas/src/app/api/projects/[id]/files/route.ts`, `.../docs/[docId]/route.ts`, `.../vendor/[name]/route.ts`, `docatlas/src/lib/atlas/*` (`snapshot.json:148-180`) | `"exceljs"`, `"mammoth"`, `"jszip"`, `"turndown"`, `"unpdf"`, `"drizzle-orm"`, `"pg"` ([`docatlas/package.json:12-25`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/docatlas/package.json#L12-L25)) | Separate document-ingestion app with file, parser, model, and persistence surfaces. |
| README-listed robot app | `robot-control-interface-development/bridge/policy_server.py`, `.../src/app/api/plan/route.ts`, `.../src/lib/feetech.ts`, `.../src/lib/policy.ts` (`snapshot.json:345-395`) | `"next": "16.2.6"`, `"pg": "8.20.0"`, `"three": "^0.170.0"` ([`robot-control-interface-development/package.json:11-19`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/robot-control-interface-development/package.json#L11-L19)) | Hardware-adjacent family requiring its own safety review. |
| Unlisted robot variants | `robotcontrol/bridge/so101_bridge.py`, `robotcontrol/src/deck/pages/HardwarePage.tsx`, `robotfinaltest/src/lib/arm.ts`, `robotfinaltestfixed/src/lib/commands.ts` (`snapshot.json:396-514`) | Separate `robotcontrol/package.json` plus dedicated tests under `robotfinaltest` and `robotfinaltestfixed` | Extra robot-control variants not listed in the README table; triage individually. |
| Robot simulation/guide frontends | `robots-final/src/pages/*`, `so-101-robot-assembly-and-simulation/src/sim/*`, `so-101-robot-development-guide/src/sim/*` (`snapshot.json:515-589`) | `robots-final` uses Vite/React `dev`, `build`, `preview` scripts ([`robots-final/package.json:6-16`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/robots-final/package.json#L6-L16)) | May be simulation or presentation UIs; do not assume live control. |

Collection mapping gap corrected here: the README lists fourteen projects (`README.md.txt:12-25`), but the full tree additionally exposes `robotcontrol`, `robotfinaltest`, and `robotfinaltestfixed` (`snapshot.json:396-514`), plus the nested `demandradar/demand-radar` subtree (`snapshot.json:72-120`). None inherits security, safety, automation, or production readiness from sibling manifests.

## 3. Findings ledger

- **MPP-1 — Medium, confirmed static:** automation is inconsistent across sampled units, so there is no collection-wide executable quality gate. `AIevolution/package.json` explicitly says `"test": "vitest run"` ([`AIevolution/package.json:6-11`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/AIevolution/package.json#L6-L11)), while `demandradar/package.json` contains only `"dev"`, `"build"`, `"start"`, `"lint"`, and `"typecheck"` ([`demandradar/package.json:4-10`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/demandradar/package.json#L4-L10)); `docatlas/package.json` shows the same script set and likewise no `test` entry ([`docatlas/package.json:4-10`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/docatlas/package.json#L4-L10)). **Impact:** any statement like “tests pass for the repo” would be misleading. **Recommended correction:** define and verify per-folder gates before making quality or release claims.

- **MPP-2 — High, unverified risk:** the README advertises SO-101 control-oriented products, but this review did not inspect or run any real hardware control path. The README names `"SO-101 command deck: control, policy server, recordings"`, `"SO-101 control deck + AI model coverage"`, and `"SO-101 exploded view, build guide, playground"` ([`README.md:23-25`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/README.md#L23-L25)). The tree also shows bridge/control files such as `robot-control-interface-development/bridge/policy_server.py` and `robotcontrol/bridge/so101_bridge.py` (`snapshot.json:347-400`). **Impact:** physical-safety assumptions, motion limits, and stop behavior are unknown. **Recommended correction:** inspect each selected robot folder separately and require supervised hardware validation before authorizing actuation.

- **MPP-3 — Medium, unverified risk:** `docatlas` declares a document-processing and persistence stack, but upload, parser, model, and retention controls were not inspected. The manifest includes `"exceljs"`, `"mammoth"`, `"jszip"`, `"turndown"`, `"unpdf"`, plus `"drizzle-orm"` and `"pg"` ([`docatlas/package.json:12-25`](https://github.com/knarayanareddy/mypetprojects/blob/db9ae810cdd60f3f6bb5e91d26a6dfacf9c69a8d/docatlas/package.json#L12-L25)); the tree shows upload and retrieval routes under `docatlas/src/app/api/projects/[id]/files*` and `.../docs/[docId]/route.ts` (`snapshot.json:149-153`). **Impact:** malicious files, oversized uploads, cross-project document access, or data retention bugs remain unverified. **Recommended correction:** trace ingestion-to-storage-to-output behavior with negative tests for access denial and hostile inputs.

## 4. Five-discipline assessment

- **Correctness / code review:** applicable, but only at boundary level. The repo describes independent units rather than shared code (`README.md:5-6,30-35`). Tree evidence shows real API, bridge, simulator, and UI entry paths in `demandradar`, `docatlas`, and the robot families (`snapshot.json:126-180,345-589`). No collection-wide correctness conclusion is justified.

- **Automation / testing:** applicable. Sampled manifests diverge on whether a `test` script exists (MPP-1). The nested `demandradar/demand-radar` subtree has its own `scripts/tests/test_scripts.py`, and `robotfinaltest` / `robotfinaltestfixed` have `src/lib/__tests__/*` paths (`snapshot.json:117-118,461-462,499-501`). Automation exists in pockets, not one normalized layer.

- **DevOps / operations:** applicable for the Next/Postgres families and partly for static frontends. `demandradar`, `docatlas`, `robot-control-interface-development`, and `robotcontrol` all declare `drizzle-orm` and `pg`, implying per-app migration, backup, and release concerns. `dist/index.html` artifacts exist in several visual apps (`snapshot.json:183,200,221,244,268,294,319,516,542,566`), but that does not prove deployment ownership or rollback.

- **OWASP / security:** strongly applicable. `demandradar` exposes file-related routes; `docatlas` exposes project, file, doc, model, and vendor routes; robot families expose bridge and policy paths (`snapshot.json:127-128,149-157,347-349,397-400,444,481-482`). Authn/authz, injection resistance, parser sandboxing, dependency integrity, secrets handling, and data protection were not inspected.

- **UI/UX / accessibility:** applicable. The collection contains heavily interactive frontends and control surfaces, including `interactive-f1-car-simulation/src/components/TunnelUI.tsx`, `robotfinaltest/src/components/ManualTab.tsx`, and multiple robot `page.tsx` views (`snapshot.json:249-252,360-368,429-435,450-457,487-495`). Because nothing was rendered, keyboard support, reduced-motion handling, labelling, and failure-state communication remain unknown.

## 5. Production blockers and owner questions

1. Which exact folders are considered live, candidate, archived, or experimental? The tree shows more units than the README table names.
2. Is `demandradar/demand-radar/` intended to ship with the `demandradar` web app, or as a separately versioned toolkit?
3. Which robot folders can command real hardware versus only simulate or teach? The names alone are insufficient.
4. Which Postgres-backed apps have real data, migration history, backup ownership, and restore expectations?
5. Which folders, if any, have release pipelines, hosting accounts, or operational owners today?
6. For any hardware-capable folder, who can authorize supervised device testing and emergency-stop validation?

Current blockers are ownership, unit selection, data classification, deployment identity, and hardware authorization.

## 6. Evidence inventory and limitations

Inspected ranges in this revision:
- `fleet-hardening-review/evidence/mypetprojects/numbered-sources/README.md.txt:1-36`
- numbered manifests for the eleven sampled top-level projects listed above
- `fleet-hardening-review/evidence/mypetprojects/snapshot.json:1-16,71-180,183-235,243-395,396-589`
- pinned extra manifests: `robot-control-interface-development/package.json`, `robotcontrol/package.json`, `robots-final/package.json`

Not inspected:
- source contents for most application files named in the tree
- any GitHub Actions or other CI execution evidence for this repo
- runtime env files, credentials, secrets stores, deploy configs, hosting state, database contents, migrations in use, or restore procedures
- any live hardware bridge behavior, serial permissions, motion limits, or stop behavior
- any browser, accessibility, or UI rendering observations

No code was executed. No install, test, deployment, database, browser, or hardware action was performed. This is a boundary review only. It does **not** say all nested code was audited or that the repo's apps share one readiness result. See [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md).
