# mypetprojects — remediation plan

Planned only. Each folder must earn acceptance independently.

## Phase P0 — baseline boundary map and owner decisions

### MPP-T1 — Create the collection unit matrix
- **Linked requirement:** preventive requirement from the review scope and boundary sections.
- **Prerequisites:** none.
- **Observed paths:** `README.md`; `demandradar/package.json`; `docatlas/package.json`; `robot-control-interface-development/package.json`; `robotcontrol/package.json`; `robots-final/package.json`; snapshot tree ranges `71-180,345-589`.
1. Catalogue each top-level folder as static visual app, database-backed app, nested toolkit, robot-control candidate, robot simulation/guide, or archive.
2. Record owner, runtime target, data sensitivity, and release intent for each folder, explicitly separating `demandradar/` from `demandradar/demand-radar/` and separating the robot variants.
3. Mark every unit `review now`, `review later`, `do not ship`, or `unknown`, with a reason and approver.
- **Expected deliverable:** owner-approved unit matrix with one row per folder/subtree.
- **Verification procedure:** cross-check every matrix row against an observed path; confirm there is no merged row for the nested `demand-radar` subtree or the robot variants.
- **DoD:**
  - [ ] Every reviewed unit has a unique observed path prefix.
  - [ ] `demandradar` app and `demandradar/demand-radar` toolkit are separate rows.
  - [ ] All robot folders are split into distinct rows with explicit status.

## Phase P1 — application-family reviews

### MPP-T2 — Review the top-level `demandradar` app as its own Next/Postgres unit
- **Linked finding:** MPP-1.
- **Prerequisites:** MPP-T1 completed; owner selects `demandradar` for the first app review.
- **Observed paths:** `demandradar/package.json`; `demandradar/src/app/api/kit/file/route.ts`; `demandradar/src/app/api/kit/zip/route.ts`; `demandradar/src/db/schema.ts`; `demandradar/src/lib/kit.ts`; `demandradar/src/lib/radar.ts`.
1. Trace kit generation, file handling, database access, and any auth or project-isolation logic.
2. If no verified `test` script exists, define a project-local test command instead of assuming a root suite.
3. Add one negative test that breaks a file or authorization guard and proves the gate fails before the fix is accepted.
- **Expected deliverable:** `demandradar` app review packet with trust boundaries, test command, and negative-control evidence.
- **Verification procedure:** an independent reviewer can trace the paths, run the app-local gate, and observe the broken guard fail.
- **DoD:**
  - [ ] File and zip routes have documented trust boundaries.
  - [ ] A project-local automated gate exists and is runnable in isolation.
  - [ ] At least one negative test fails on deliberately broken behavior.

### MPP-T3 — Review the nested `demandradar/demand-radar` toolkit independently of the app
- **Linked requirement:** preventive requirement from the architecture section.
- **Prerequisites:** MPP-T1 completed; owner confirms the nested toolkit is an intended deliverable or maintained internal tool.
- **Observed paths:** `demandradar/demand-radar/install.py`; adapter READMEs; `skills/demand-radar/SKILL.md`; `skills/demand-radar/scripts/tests/test_scripts.py`.
1. Inspect installer, adapter, prompt, and script boundaries so the toolkit is not certified by the web app's manifest alone.
2. Define compatibility and safety expectations per adapter, including allowed host environments and credentials.
3. Plan toolkit-specific validation with a negative control for malformed evidence or broken adapter wiring.
- **Expected deliverable:** nested-toolkit review plan with adapter scope and versioning decision.
- **Verification procedure:** toolkit acceptance must reference toolkit-specific paths and tests, not only `demandradar/package.json`.
- **DoD:**
  - [ ] Toolkit scope is documented separately from the parent app.
  - [ ] Adapter compatibility and trust boundaries are enumerated.
  - [ ] Toolkit verification includes a planned negative control.

### MPP-T4 — Review `docatlas` as a document-ingestion and storage unit
- **Linked finding:** MPP-3.
- **Prerequisites:** MPP-T1 completed; owner selects `docatlas` for review; data-handling rules are approved.
- **Observed paths:** `docatlas/package.json`; `docatlas/src/app/api/projects/[id]/files/route.ts`; `docatlas/src/app/api/projects/[id]/docs/[docId]/route.ts`; `docatlas/src/app/api/vendor/[name]/route.ts`; `docatlas/src/db/schema.ts`; `docatlas/src/lib/atlas/pipeline.ts`; `docatlas/src/lib/atlas/store.ts`; `docatlas/src/lib/atlas/validate.ts`.
1. Trace file ingestion, parser invocation, model/vendor requests, persistence, and document retrieval.
2. Define an app-local automated gate for hostile files, access denial, oversized inputs, and retention/deletion expectations.
3. Verify one negative test fails when an access check, parser limit, or tenant boundary is deliberately broken.
- **Expected deliverable:** `docatlas` trust-boundary review with app-local gate and restore requirements.
- **Verification procedure:** an independent reviewer can reproduce the negative test and confirm restore expectations are concrete.
- **DoD:**
  - [ ] File, doc, and vendor endpoints are mapped to storage/model boundaries.
  - [ ] Negative tests cover at least one hostile-input and one access-control case.
  - [ ] Backup/restore ownership is documented before release.

## Phase P2 — robot-family safety split

### MPP-T5 — Separate simulation, UI-only, and hardware-capable robot folders before any deeper claim
- **Linked finding:** MPP-2.
- **Prerequisites:** MPP-T1 completed; owner explicitly authorizes which robot folders may undergo deeper review; no hardware motion yet.
- **Observed paths:** `robot-control-interface-development/bridge/policy_server.py`; `robotcontrol/bridge/so101_bridge.py`; `robotfinaltest/public/bridge/so101_bridge.py`; `robotfinaltest/src/lib/arm.ts`; `robotfinaltestfixed/public/bridge/so101_bridge.py`; `robotfinaltestfixed/src/lib/commands.ts`; `robots-final/src/lib/bridgeCode.ts`; `so-101-robot-assembly-and-simulation/src/sim/*`; `so-101-robot-development-guide/src/sim/*`.
1. Classify each robot folder as simulation-only, UI shell, or real hardware candidate based on bridge/control paths, not names.
2. For one selected hardware candidate, inspect command path, human override, stop behavior, motion limits, and logging before any live access.
3. For simulation-only units, verify they are labelled so users cannot mistake simulation success for physical safety proof.
- **Expected deliverable:** robot-family boundary dossier and approved list of folders that may proceed to device-safe review.
- **Verification procedure:** no acceptance artifact may group multiple robot folders under one verdict, and hardware candidates need explicit stop/rollback requirements.
- **DoD:**
  - [ ] Every robot folder is classified independently.
  - [ ] Simulation success is explicitly non-authoritative for hardware safety.
  - [ ] Hardware-capable review requires named owner approval and stop procedure.

## Phase P3 — per-unit acceptance, operations, and UX

### MPP-T6 — Accept or reject each selected unit independently
- **Linked requirement:** independent acceptance requirement from the contract.
- **Prerequisites:** relevant review task(s) complete for the chosen unit: MPP-T2, MPP-T3, MPP-T4, and/or MPP-T5.
- **Observed or proposed paths:** observed project-local manifests and review artifacts from the earlier tasks; proposed acceptance records under each selected unit's docs or release folder.
1. For each chosen unit, run only its own approved automation, including negative tests that fail on deliberately broken behavior.
2. Where a unit stores data, observe a backup/restore or rehearsal; where it drives hardware, observe approved stop behavior; where it is interactive UI, verify keyboard, reduced-motion, and status/error communication.
3. Produce one acceptance record per unit with pass/fail/blocked status, artifact version, owner sign-off, and rollback target.
- **Expected deliverable:** per-unit acceptance pack and release/rollback decision log.
- **Verification procedure:** an independent reviewer can match each verdict to exactly one unit, one artifact, one gate set, and one rollback path.
- **DoD:**
  - [ ] Each verdict names exactly one unit.
  - [ ] Negative tests, not just happy-path tests, are observed.
  - [ ] Rollback/recovery evidence is present or the unit is blocked.

## Task dependency map

| Task | Depends on | Can run in parallel with | Blocks |
| --- | --- | --- | --- |
| MPP-T1 | none | none | all later work |
| MPP-T2 | MPP-T1 | MPP-T3, MPP-T4 after selection | MPP-T6 for `demandradar` app |
| MPP-T3 | MPP-T1 | MPP-T2, MPP-T4 after selection | MPP-T6 for nested toolkit |
| MPP-T4 | MPP-T1 | MPP-T2, MPP-T3 after selection | MPP-T6 for `docatlas` |
| MPP-T5 | MPP-T1 | MPP-T2, MPP-T3, MPP-T4 after selection | MPP-T6 for robot units |
| MPP-T6 | relevant prior task(s) | none | release decision |

## Production acceptance checklist

- [ ] Unit matrix approved and scoped by folder/subtree.
- [ ] The selected unit has its own verified automation or an explicit documented gap.
- [ ] Negative tests fail on deliberately broken behavior.
- [ ] Data-handling units have backup/restore ownership and observed evidence or are blocked.
- [ ] Robot-capable units have supervised safety evidence and owner sign-off or are blocked.
- [ ] Accessibility/UI checks are complete for user-facing units or explicitly marked inapplicable.
- [ ] Final verdict is per unit, never per collection.

## Changes requiring owner approval

- Any live credential use or access to hosted environments
- Any restore drill against nonthrowaway data
- Any hardware connection, movement, or safety-stop exercise
- Any decision to publish or version `demandradar/demand-radar` independently

## Rollback and release policy

Release one selected unit at a time. Tie the release record to that unit's pinned artifact or commit, keep the previous known-good artifact/version available, and document the restore or disable path before rollout. For data-backed apps, rollback includes a restore decision; for robot-capable apps, a disable/no-motion procedure; for static UI projects, a prior artifact and hosting rollback owner.
