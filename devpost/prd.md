---
doc: prd
status: approved
---

# ShipProof — Proof Before Done — Product Requirements

An evidence ledger for solo developers and small engineering teams using AI coding agents. It maps explicit requirements to linked JUnit test evidence, reports VERIFIED / FAILED / UNVERIFIED, and exports the current state as a JSON readiness report.

Source: `scope.md > The Unique Kernel`, `The Core Loop`, `What "Working" Looks Like`, `The POC Boundary`, `Explicitly Cut`.

## The Core Journey

1. The user opens ShipProof and immediately sees the bundled fictional sample project, **Authentication**, with three explicit requirements:
   - `REQ-001 — Authentication works`
   - `REQ-002 — Invalid credentials are rejected`
   - `REQ-003 — Rate limiting is enforced`
2. No evidence is loaded yet. The release decision is `CANNOT VERIFY`; all three requirements display `UNVERIFIED` with the explanation that no test evidence has been loaded. A dashboard message reads: “No evidence loaded yet. ShipProof cannot verify completion claims without supporting test results.”
3. Two primary actions are available: **Load sample evidence** and **Import JUnit XML**. No tutorial, onboarding wizard, or setup screen is added.
4. **Load sample evidence** loads a clearly labeled synthetic JUnit report. Its fixed mappings resolve to `test_valid_credentials_succeed` (PASS) for REQ-001 and `test_invalid_credentials_rejected` (FAIL) for REQ-002. REQ-003 has no linked tests. The dashboard shows one VERIFIED, one FAILED, and one UNVERIFIED requirement; the release decision is `NOT READY`, and the blocker list names REQ-002 and REQ-003 with their reasons.
5. **Import JUnit XML** opens a file picker. A valid report becomes the current evidence source, existing explicit mappings are preserved and reconciled against the new report, absent test IDs are flagged `MISSING`, and all statuses are recomputed. A malformed report shows an error and leaves the previous valid state intact.
6. The user inspects the summary, each requirement’s status and rationale, linked test IDs and outcomes, failure/error details, and evidence gaps.
7. The user opens the manual mapper, adds or removes requirement-to-test links, and sees affected statuses recompute immediately from the current evidence and links.
8. The user exports the current readiness report as `shipproof-readiness-report.json`. The file reflects the current evidence, mappings, statuses, and counts — never hard-coded sample output.
9. The key moment: REQ-003 stays `UNVERIFIED` even though the report contains passing tests, because no adequate test evidence is linked to it. ShipProof explains exactly why.

## Screens and Layout

A single dashboard surface, with supporting panel/dialog interactions. No extra setup or onboarding screens.

- **Header:** ShipProof wordmark and “Proof Before Done” tagline; sample project name; evidence-source label; primary actions: **Load sample evidence** (empty state only) and **Import JUnit XML**; **Export readiness report**; optional **Reset to sample** when time permits.
- **Readiness summary:** one release decision — `CANNOT VERIFY`, `NOT READY`, or `LINKED CHECKS PASSED` — with its reason; compact counts for VERIFIED, FAILED, and UNVERIFIED; and, once evidence is loaded, a **What blocks confidence** list naming each non-verified requirement. `LINKED CHECKS PASSED` is used instead of "ready" to avoid overclaiming.
- **Empty state:** the required “No evidence loaded yet…” message, the two evidence actions, and the three requirement rows at `UNVERIFIED`.
- **Requirement list:** the visual center of the dashboard. Each row shows requirement ID, title, status label, one-sentence rationale, linked test IDs with normalized outcomes, failure/error details, and a clear mapping action.
- **Evidence detail:** expands inline or in a panel to show linked checks, failure/error messages, skipped/missing/errored gaps, and whether the source is synthetic or imported.
- **Mapping panel:** available tests from the current report, existing links, add/remove controls, duplicate-link prevention, missing-link warnings, and explicit “also linked to” notes for shared tests.
- **Export feedback:** a clear success confirmation naming the downloaded file, or an inline error if the download cannot be produced.
- The layout is responsive and moderately dense, like a professional engineering tool. It prioritizes judge comprehension within 30 seconds.

## Look and Feel

- **Mood:** calm audit ledger; precise, trustworthy, restrained, engineering-focused. A simplified engineering audit console or CI test-results interface, not a clone of another product.
- **Color:** light neutral page background; white or near-white surfaces; dark charcoal primary text; muted slate secondary text; deep navy or indigo primary actions. Restrained semantic colors: green for VERIFIED, red for FAILED, amber for UNVERIFIED.
- **Never color alone:** every status shows a readable text label and an explanation. Status is not conveyed only by hue.
- **Typography:** clean, highly readable sans-serif for interface text; restrained monospace for requirement IDs, test IDs, timestamps, and technical evidence. Strong hierarchy, concise labels, readable failure messages, consistent spacing. No oversized marketing headlines or decorative typography.
- **Density:** moderately dense; requirement rows are the center; compact summary near the top.
- **Restraint:** consistent buttons, restrained borders, clear keyboard focus states, readable contrast. Avoid unnecessary animations, gradients, glassmorphism, excessive shadows, decorative charts, and extra UI frameworks.
- **Evidence source:** synthetic versus imported is visible near the top and repeated in the evidence details and export.
- **Accessibility:** semantic structure, keyboard operation, visible focus, sufficient contrast, and status text that does not depend on color. Empty, loading, error, and success states are explicit.

## Features and Behavior

### Bundled sample project and empty state

- The sample project is fictional and bundled locally. It requires no API key, network access, account, database, or setup beyond launching the app.
- The three requirements, initial mappings, and test fixtures are stable:

| Requirement | Initial mapping | Sample result | Expected status |
|---|---|---|---|
| REQ-001 — Authentication works | `test_valid_credentials_succeed` | PASS | VERIFIED |
| REQ-002 — Invalid credentials are rejected | `test_invalid_credentials_rejected` | FAIL | FAILED |
| REQ-003 — Rate limiting is enforced | None | — | UNVERIFIED |

- Before evidence is loaded, all three rows show `UNVERIFIED` and explain that no test evidence is loaded. The initial mappings are retained but are not evaluated until a report exists; the mapper is unavailable while there are no available tests. REQ-003 also shows “No linked test evidence.”
- The top-level empty-state message is exactly: “No evidence loaded yet. ShipProof cannot verify completion claims without supporting test results.”
- No test result, pass, or failure is implied before evidence is loaded. The app does not show a tutorial, wizard, or extra setup screen.
- The export action is present but disabled in the empty state with an explanation that evidence must be loaded first.

### Loading synthetic sample evidence

- **Load sample evidence** loads the bundled synthetic report in one action. No file picker is required.
- After loading, the evidence source is labeled **“Synthetic sample evidence — not a real test run”** and the bundled report filename is visible.
- The initial mappings resolve against the sample report. The dashboard shows REQ-001 `VERIFIED`, REQ-002 `FAILED`, and REQ-003 `UNVERIFIED`.
- REQ-002 shows the linked failing test ID and a realistic, explicitly synthetic failure message. The failure is labeled as an assertion failure, not an execution error.
- REQ-003 shows “No linked test evidence” and makes clear that passing tests elsewhere do not satisfy it.
- The synthetic report is never presented as a real test execution, in the UI or in the export.

### Importing JUnit XML evidence

- **Import JUnit XML** accepts a JUnit XML file through the browser’s file picker.
- Supported evidence is common JUnit XML containing test cases with names, class names, and outcomes. Passing, assertion-failing, skipped, and execution-errored cases are normalized.
- While reading and parsing, the UI shows an explicit loading state and prevents duplicate import actions.
- On a valid import, the imported report replaces the current evidence. The source label becomes **Imported evidence** and shows the imported filename.
- Existing explicit mappings are preserved. Each mapped test ID is reconciled against the new report; IDs absent from the report become `MISSING`. All statuses are recomputed from the new report only. Results from a previous report are never reused.
- A test present in the report but not linked to a requirement does not affect any requirement’s status. It is available in the mapper. If it is linked later, its current result participates in the rule.
- Malformed XML, an unsupported structure, an empty report with no test cases, or ambiguous duplicate test IDs produce a clear import error. The last valid evidence, mappings, and statuses remain intact.
- The app never silently chooses a favorable result for an ambiguous test. The error explains what could not be interpreted.
- Unsafe XML features, including external entity resolution, are not used. Import is local and makes no network request.
- A new import may be started after a previous import; the same replacement, reconciliation, and error-preservation rules apply.

### Reading the evidence dashboard

- The dashboard shows the release decision in every state: `CANNOT VERIFY` before evidence, `NOT READY` while any requirement is FAILED or UNVERIFIED, and `LINKED CHECKS PASSED` only when every requirement is VERIFIED. In the empty state the panel explains how to begin; once evidence is loaded it lists the blockers.
- The summary shows total requirements and counts of VERIFIED, FAILED, and UNVERIFIED. The counts always match the requirement rows.
- The readiness statement reflects actual failures and evidence gaps. It never implies that a passing suite proves the whole feature or application correct.
- Every requirement row shows:
  - Stable requirement ID and title.
  - Status label and a human-readable explanation.
  - Explicit linked test IDs and each observed outcome: PASS, FAIL, SKIPPED, ERROR, or MISSING.
  - Assertion failure or execution error details when available.
  - Missing, skipped, or errored evidence clearly identified as a gap.
- Assertion failures are visually and textually distinguished from execution errors, skipped tests, and missing test IDs.
- A test linked to multiple requirements is shown in each relevant requirement and is explicitly marked as shared in the mapper. Each requirement is evaluated independently.
- The dashboard exposes the same facts that appear in the JSON export: source, counts, requirement statuses, linked checks, outcomes, messages, gaps, and limitations.

### Manual evidence mapper

- The mapper lets the user add and remove links between known requirement IDs and test IDs from the current evidence report.
- It displays available tests, their normalized outcomes, existing links, and missing linked IDs.
- Adding a link is explicit; the same requirement/test pair cannot be added twice. A test may be linked to multiple requirements, and that shared relationship is visible.
- Removing the only passing link from a VERIFIED requirement immediately makes it UNVERIFIED. Adding a failing, skipped, errored, or missing link does not make a requirement VERIFIED unless the verification rule is satisfied.
- Every mapping change recomputes all affected statuses from the central status logic and updates the explanation. The updated rationale is the explanation of why the status changed; no separate history log is required.
- Missing links are preserved and remain visible after evidence replacement; they are not silently deleted.
- Mapping is manual only. There is no fuzzy matching, AI-generated mapping, automatic repair, or requirement editing.
- The mapper is unavailable before evidence is loaded because no current tests exist; the empty state explains this.

### Readiness status rules

All statuses come from one central, deterministic calculation used by the dashboard, mapper, tests, and export.

Normalized test outcomes: `PASS`, `FAIL`, `SKIPPED`, `ERROR`, `MISSING`. A linked test ID absent from the current report is `MISSING`; the mapping is preserved.

Apply the rules in order:

1. **FAILED** if any linked test is present in the current report and has an actual assertion failure. Show the failing test ID and failure message. An assertion failure is not the same as an execution error.
2. **UNVERIFIED** if there is no assertion failure and any of the following is true:
   - No tests are linked.
   - A linked test ID is absent from the current report.
   - A linked test is skipped.
   - A linked test errors during setup or execution.
   - The linked checks do not satisfy the requirement’s defined verification rule.
   - Evidence cannot be parsed or reliably interpreted.
3. **VERIFIED** only if at least one linked test exists, every linked test ID is present and accounted for, every linked test passes, the defined verification rule is satisfied, and no linked test is skipped, errored, missing, or failing.

The MVP verification rule is strict: all linked tests for a requirement must pass. A single problematic linked check blocks VERIFIED. Majority voting, sampling, and “the overall suite passed” inference are not used.

Explicit resolution: REQ-002 with one PASS and one MISSING linked test is `UNVERIFIED`, not `VERIFIED`. A passing check does not erase a missing check. Missing links are shown, never discarded.

### JSON readiness export

- The export action downloads a file named `shipproof-readiness-report.json` from the current application state.
- Export is enabled after evidence is loaded. In the empty state it is disabled with a clear explanation; the export does not invent an evidence source.
- The report contains:
  - **Metadata:** product name ShipProof; ISO 8601 generation timestamp; schema version; evidence source (synthetic sample or imported JUnit XML); imported filename when applicable.
  - **Summary:** total requirement count; VERIFIED, FAILED, and UNVERIFIED counts; the release decision and blockers; a readiness statement that warns about actual failures and evidence gaps.
  - **Requirement results:** stable ID and title; final status; explanation; explicit linked test IDs; normalized outcome for each linked test; failure/error message when available; unresolved missing, skipped, or errored gaps.
  - **Provenance and limitations:** statuses are computed deterministically from the current report and explicit mappings; VERIFIED means verified against linked checks, not proven correct in general; synthetic sample evidence is identified as synthetic and not a real test run.
- The report is valid, machine-readable JSON with a documented, versioned schema. The schema version for this MVP is `1.0`.
- Mapping changes, imported evidence, and recomputed statuses are reflected in the export. Sample output is never hard-coded into the exporter.
- No PDF generation, cloud storage, accounts, or external services are added.

### Reset to sample (stretch, only if time permits)

- A small **Reset to sample** action may be added after the core journey is complete and verified.
- It restores the initial bundled sample state: requirements, initial sample mappings, no evidence loaded, and all requirements UNVERIFIED.
- It does not add confirmation dialogs, project management, or persistence.
- If time does not permit, it is omitted and the app still runs the core journey reliably.

## States and Boundaries

- **First use / empty:** all three requirements UNVERIFIED; no evidence loaded; two primary evidence actions; export disabled; mapper unavailable; no implied test results.
- **Loading:** explicit reading/parsing state; duplicate actions prevented; no stale status is presented as freshly computed.
- **Sample loaded:** synthetic source label; REQ-001 VERIFIED, REQ-002 FAILED, REQ-003 UNVERIFIED; export enabled.
- **Imported evidence success:** imported filename and source label; mappings reconciled; missing links flagged; statuses recomputed; export enabled.
- **Import error:** clear, readable error; previous valid evidence, mappings, statuses, and source remain. If there was no previous evidence, the empty state remains.
- **Mapping change:** affected statuses and explanations recompute immediately; counts and export state update.
- **Export success:** confirmation naming the downloaded file; exported content matches the current screen.
- **Session-only:** evidence, mappings, and statuses are held for the current session. Reloading the page returns to the initial empty sample state. No login, database, or persistence is added.
- **Unlinked tests:** available in the mapper but do not affect requirement statuses and do not appear as requirement evidence in the export. This follows from explicit-only mappings.
- **Accessibility:** all actions are keyboard-reachable; focus is visible; status is conveyed by text as well as color; failure messages are associated with their test; loading and error changes are announced appropriately.
- **Privacy and safety:** all evidence stays in the browser session; no uploads, external calls, credentials, or analytics. Imported files are treated as untrusted input.

## Product Decisions

- Start with a bundled fictional sample and no setup; the first 10 seconds must communicate what is evaluated, why all three requirements are unverified, and how to load evidence. — Learner decision.
- Use the three authentication requirements and fixed initial mappings above; REQ-003 intentionally has no linked test. — Learner decision.
- Manual, explicit links only; no fuzzy or AI-generated mappings. — Learner decision.
- FAILED requires an actual assertion failure; skipped, errored, and missing linked checks block VERIFIED and otherwise leave the requirement UNVERIFIED. — Learner decision.
- A missing linked check makes the evidence set incomplete even when another linked check passes. — Explicit contradiction resolution from the learner’s requirements.
- Export JSON only, named `shipproof-readiness-report.json`, generated from current state with an ISO 8601 timestamp and provenance. — Learner decision.
- One calm audit-ledger dashboard, no onboarding wizard, moderately dense engineering-tool layout. — Learner decision.
- Requirements-file import, requirements editing, additional test formats, accounts, persistence, and deployment are out of the POC. — Learner decision.
- Export is disabled until evidence exists; the report’s evidence source is always labeled synthetic sample or imported evidence. — Agent assumption, aligned with the required metadata.
- Unlinked tests do not affect requirement statuses; they are visible only in the mapper. — Agent assumption derived from explicit-only mappings; documented as a limitation.
- A single visible release decision and blocker list, derived from the same evaluator as the rows and export, with `LINKED CHECKS PASSED` rather than "ready." — Agent refinement of the readiness summary, covered by domain, export, and UI tests.
- Reset to sample is a stretch, implemented only after the core journey is verified. — Learner instruction.

## What We're Building

- One working single-dashboard app that opens directly into the three-requirement sample.
- The exact empty state, sample-evidence action, and JUnit XML import behavior above.
- A central deterministic status engine with automated tests for every rule and normalized outcome.
- The manual add/remove mapper with immediate recomputation, duplicate prevention, missing-link preservation, and shared-test visibility.
- A dashboard showing the release decision, blocker list, summary counts, readiness statement, requirement rows, evidence details, failures, gaps, and source labels.
- A valid current-state JSON export with the required metadata, summary, requirement results, provenance, and limitations.
- Explicit loading, empty, import-error, export-success, and missing/skipped/errored evidence states.
- Accessible, responsive calm audit-ledger styling.
- Setup instructions, README, open-source license, and accurate limitations as part of the shipped project (detailed in the build checklist).
- The reset-to-sample action only if the core journey is complete and verified.

## Required Verification

Automated tests and a hands-on review must demonstrate:

1. The three default sample outcomes: VERIFIED, FAILED, UNVERIFIED.
2. No evidence loaded: all requirements UNVERIFIED.
3. One passing linked test: VERIFIED only when all verification conditions hold.
4. An assertion failure: FAILED, with the failure message.
5. One PASS plus one MISSING linked test: UNVERIFIED.
6. One PASS plus one SKIPPED linked test: UNVERIFIED.
7. One PASS plus one ERROR linked test: UNVERIFIED.
8. All linked tests passing: VERIFIED when the defined rule is satisfied.
9. Adding and removing links changes status correctly; removing the only passing link does not leave VERIFIED.
10. A missing mapping remains visible after a report import.
11. Importing new evidence recomputes statuses without silently deleting mappings.
12. Malformed XML produces a useful error and does not corrupt the current state.
13. Export is valid JSON with the correct schema version and provenance.
14. Exported counts and statuses match the current dashboard state.
15. Repeated demo runs produce the same sample statuses.
16. The release decision and blocker list match the requirement rows: `CANNOT VERIFY` with no evidence, `NOT READY` for the sample and for an all-passing report that leaves REQ-003 unlinked, and `LINKED CHECKS PASSED` only after every requirement is verified.
17. Exported decision and blockers match the visible dashboard in the same state.

The build must also verify the import's empty-report, unsupported-structure, and ambiguous-duplicate handling; keyboard and status-label accessibility; and the absence of network calls in the demo path. Tests are run, observed, and recorded honestly; no unrun check is reported as passing.

## Deferred From the POC

- Requirement-file import: adds a second setup path and does not strengthen the evidence-ledger proof.
- Editing or authoring requirements in the app: the sample requirements are intentionally fixed.
- Additional test-report formats beyond JUnit XML: outside the agreed import scope.
- Multiple projects, saved history, and persistence: not needed for the one-session demo.
- AI-generated or fuzzy mappings: would undermine explicit evidence and add an API dependency.
- Human-readable HTML/PDF reports: JSON is the agreed export.
- Accounts, teams, databases, cloud storage, deployment: no user or infrastructure need in the PoC.

## Possible Later Enhancements

- Import a requirements definition alongside evidence.
- Support additional test-report formats.
- Persist projects and mapping history locally or in an account.
- A configurable verification rule beyond “all linked checks pass.”
- A human-readable report view generated from the same status model.
- Reset-to-sample if it is not completed during the current build.

## Non-Goals

- Proving software universally correct, or claiming a green suite proves completeness.
- AI verification, AI-generated status decisions, automatic test repair, or code changes.
- A test-management system, requirement authoring, team collaboration, or billing.
- Deployment infrastructure, cloud integrations, or external analytics.
- Decorative charts, elaborate animation, or a design-system build-out.
- Any claim that sample evidence came from a real test run.

## Open Questions

None block `4-spec`. The technical spec will choose the stack, exact JUnit parsing subset, JSON key names, and duplicate-ID handling within these product rules. Reset-to-sample remains optional based on time.
