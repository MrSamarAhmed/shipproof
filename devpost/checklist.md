---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Load the synthetic sample and see the honest ledger**
  Becomes usable: A running ShipProof opens to the three authentication requirements in the empty state, and **Load sample evidence** produces one VERIFIED, one FAILED, and one UNVERIFIED requirement with the failing message and the REQ-003 gap visible.
  Why now: Bootstraps the app and delivers the unique kernel plus the central demo moment before supporting interactions; every later slice lands on this ledger.
  PRD ref: `prd.md > The Core Journey` (steps 1–4, 6, 9); `prd.md > Bundled sample project and empty state`; `prd.md > Loading synthetic sample evidence`; `prd.md > Reading the evidence dashboard`; `prd.md > Readiness status rules`
  Spec ref: `spec.md > Stack`; `spec.md > Where It Runs and How Someone Tries It`; `spec.md > Components > Domain Model and Status Engine`; `spec.md > Components > JUnit Import Boundary`; `spec.md > Components > Bundled Sample`; `spec.md > Components > Application State and Transitions`; `spec.md > Components > Dashboard and Mapper`; `spec.md > Data Model`; `spec.md > File Structure`
  Build: Scaffold Vite/TypeScript/Vitest with the approved scripts and strict config; add domain types, the pure ledger evaluator for empty and all outcome rules, sample requirements and initial mappings, the raw synthetic JUnit fixture, a minimal PASS/FAIL parser path for that fixture, in-memory state, the dashboard with exact empty-state copy and source label, the sample load action, restrained responsive CSS, and automated tests. Do not expose import, mapping, or export actions yet.
  Verify (mechanical): Run `npm test`, `npm run typecheck`, and `npm run build`; start the dev server; confirm the empty state and then sample load in the browser or DOM test; confirm 1 VERIFIED / 1 FAILED / 1 UNVERIFIED, the R2 failure message, REQ-003 “No linked test evidence,” and no console errors.
  Learner check: Open the app, confirm the three requirements are UNVERIFIED before evidence, load the sample, and say whether REQ-003 remains clearly unverified despite the passing checks elsewhere.
  Commit: `Build sample evidence dashboard`

- [x] **2. Import a JUnit XML report without losing the last good evidence**
  Becomes usable: A user can import a local JUnit XML report, see its filename and imported-source label, inspect PASS/FAIL/SKIPPED/ERROR evidence, and keep the previous valid state when the file is malformed, empty, unsupported, oversized, or ambiguous.
  Why now: This is the second evidence path and the highest parser/validation risk; finding it early lets the remaining mapper and export work build on real imported state.
  PRD ref: `prd.md > Importing JUnit XML evidence`; `prd.md > States and Boundaries`; `prd.md > Required Verification` (5–7, 10–12)
  Spec ref: `spec.md > Components > JUnit Import Boundary`; `spec.md > Components > Application State and Transitions`; `spec.md > Important Failure Modes`; `spec.md > Verification Plan` (parser and state)
  Build: Add the file input, reading/loading state, full validated JUnit subset with stable IDs and diagnostic messages, duplicate/empty/unsupported/DOCTYPE/size protections, imported source and filename display, error alert, atomic replacement that preserves mappings and prior evidence on failure, missing-link reconciliation, and test fixtures for normal, missing, skipped, errored, and malformed reports.
  Verify (mechanical): Run `npm test`, `npm run typecheck`, and `npm run build`; import the sample fixture through the file path; import a malformed fixture and confirm the prior statuses/source remain; confirm a mapped ID absent from a new report is shown MISSING.
  Learner check: Try both evidence paths, then attempt a malformed import; confirm the error is understandable and the previous valid report is still shown. This is the planned early checkpoint; report what feels unclear or worth changing.
  Commit: `Add JUnit XML import`

- [x] **3. Link and unlink tests to requirements**
  Becomes usable: Each requirement has an inline mapper showing current tests and links; adding or removing a link immediately recomputes statuses, reasons, and counts, with shared-test and missing-link relationships visible.
  Why now: Manual explicit mappings are the product’s trust boundary; the mapper needs the current evidence and stable ledger before export can reflect it.
  PRD ref: `prd.md > Manual evidence mapper`; `prd.md > Required Verification` (9–11)
  Spec ref: `spec.md > Components > Application State and Transitions`; `spec.md > Components > Dashboard and Mapper`; `spec.md > Data Model`
  Build: Add per-requirement mapping panels, labeled test selection, Add link and per-link Remove actions, duplicate-pair prevention, shared-test notes, missing-link preservation/removal, immediate recomputation through the shared evaluator, focus retention, and tests.
  Verify (mechanical): Run `npm test`, `npm run typecheck`, and `npm run build`; verify removing REQ-001’s only passing link makes it UNVERIFIED, restoring it returns VERIFIED, adding the failing test to REQ-001 makes it FAILED, and missing links survive a report replacement.
  Learner check: Change a mapping in the app and confirm the status, reason, and counts update honestly; try a shared test and explain what the UI shows.
  Commit: `Add manual evidence mapping`

- [x] **4. Export the current readiness report as JSON**
  Becomes usable: A user can download `shipproof-readiness-report.json` containing the current source, summary, requirement statuses, linked checks, messages, gaps, schema version, timestamp, and limitations; mapping and import changes are reflected.
  Why now: The export closes the core journey and must be derived from the now-complete current state and shared ledger.
  PRD ref: `prd.md > JSON readiness export`; `prd.md > Required Verification` (13–14)
  Spec ref: `spec.md > Components > JSON Export`; `spec.md > Data Model`; `spec.md > Verification Plan` (export)
  Build: Add the report builder with schema `1.0`, provenance and limitations, disabled pre-evidence state, download wiring and honest “Download requested” feedback, fixed-clock tests, and a real-browser download check.
  Verify (mechanical): Run `npm test`, `npm run typecheck`, and `npm run build`; export a report, parse it as JSON, confirm schema/version/source/counts and requirement details match the dashboard; change a mapping and confirm a new export changes accordingly.
  Learner check: Export the sample report, inspect its metadata and counts, then change a link and confirm the next export reflects the new status.
  Commit: `Add JSON readiness export`

- [x] **5. Harden, document, and verify the complete demo**
  Becomes usable: The full journey is accessible and responsive, failure and loading states are clear, the README explains setup/demo/tests/schema/limitations, the project has an open-source license, and the verified demo can be repeated reliably.
  Why now: Documentation and accessibility need the finished behavior; this is the last slice before the learner’s final kick-the-tires review.
  PRD ref: `prd.md > States and Boundaries` (accessibility, session-only); `prd.md > Look and Feel`; `prd.md > What We're Building`; `prd.md > Non-Goals`
  Spec ref: `spec.md > Look and Feel`; `spec.md > Verification Plan`; `spec.md > Important Failure Modes`; `spec.md > What Was Simplified and Why`; `spec.md > Where It Runs and How Someone Tries It`; `spec.md > File Structure`
  Build: Verify and refine keyboard/focus/live-region behavior, text-plus-color statuses, contrast, narrow layout, and untrusted-text rendering; add the optional reset-to-sample only if the core passes; write the README with exact commands, demo steps, supported JUnit subset, JSON schema, and honest limitations; add the MIT license; clean generated artifacts from staging; run the full regression.
  Verify (mechanical): Run `npm test`, `npm run typecheck`, and `npm run build`; run the production preview; complete the golden path plus invalid import and actual JSON download; inspect keyboard operation, narrow viewport, console errors, and network requests; parse the downloaded file and compare it with the visible statuses.
  Learner check: Start the app, walk the complete demo yourself, read the README, and report anything broken, confusing, or inaccurate. This is the planned final kick-the-tires checkpoint.
  Commit: `Document and harden ShipProof`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2: sample evidence, real JUnit import, and malformed-import preservation; learner feedback recorded and resolved.
- [x] Final kick-the-tires exploration and feedback completed — after slice 5: complete journey, README accuracy, and demo repeatability. Learner reported the final checkpoint complete and requested no product changes; current implementation retained.

## Final Review

- [x] Final verification evidence recorded — exact outcomes for `npm test`, `npm run typecheck`, `npm run build`, real-browser golden path, and an actual downloaded JSON parsed and compared with the dashboard.
  - Final source commit: `9f42959`.
  - `npm test`: 5 files, 68 tests passed.
  - `npm run typecheck`: passed with no output.
  - `npm run build`: passed; `dist/index.html`, `dist/assets/index-DgFwRlpK.css`, `dist/assets/index-BePFH92e.js`.
  - Production preview at `http://127.0.0.1:4173`: empty state, sample load (1 VERIFIED / 1 FAILED / 1 UNVERIFIED), mapper, malformed import preservation, and export feedback verified in the running browser. No console errors; only the two local JS/CSS assets were requested.
  - Keyboard: skip link → sample button → file input → wrap; visible 3px focus rings; skip link focused `#app`. Disabled export is skipped.
  - Widths: 516 px and a 390 px iframe had no horizontal overflow; a 1200 px iframe used the desktop layout with status labels beside titles. Mapper controls stack at 390 px.
  - Actual download: `~/Downloads/shipproof-readiness-report.json` (2,914 bytes) parsed as valid schema `1.0` JSON with source `synthetic-sample`, filename `sample-auth.junit.xml`, counts 1/1/1, and requirement statuses matching the dashboard at download time. After removing REQ-001's passing link, the in-browser generated Blob payload was parsed and matched the changed dashboard counts 0/1/2; the automation did not observe a second file save.
- [x] Final review complete — feedback resolved and learner confirms ready to ship (learner declined further changes and directed the workflow to shipping preparation).
  - Post-wrap-up regression with source code unchanged at `42bc8cf` and the app map present: `npm test` = 5 files, 68 tests passed; `npm run typecheck` passed with no output; `npm run build` passed with `dist/index.html`, `dist/assets/index-DgFwRlpK.css`, `dist/assets/index-BePFH92e.js`.

## Code Tour and App Map

- [x] Learning activity complete — focused alternative for a familiar plan-first learner, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: brief recap for a plan-first learner, not a new guided tour. Anchored in one verification decision: the `all-linked-checks-pass` rule in `src/domain.ts` (`statusFor`), the outcome combinations pinned in `tests/domain.test.ts`, and the observed sample result (1 VERIFIED / 1 FAILED / 1 UNVERIFIED) where REQ-003 stays UNVERIFIED because it has no linked evidence while other tests pass.
Route and stops: reference route only (not toured interactively). Stops: `src/ui.ts` `buildHeader` → `src/main.ts` `loadSample` → `src/domain.ts` `statusFor`; recorded with "to change this, start here" pointers in `devpost/app-map.html`.
Edit outcome: not offered; the learner requested no unnecessary product changes at the final checkpoint, so no edit was made.
Reflection: already covered during planning in the learner's own statements about letting requirements and test results, not the AI, decide status. No new personal reflection was solicited or invented.
Activity mode: focused recap plus offline app map.

## Revisions
