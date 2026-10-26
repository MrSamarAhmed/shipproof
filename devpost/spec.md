---
doc: spec
status: approved
---

# ShipProof — Technical Spec

## How This Works, In Plain Language

ShipProof is a local browser application, not a backend service. Three fictional authentication requirements and their initial test links are bundled with it. Opening the app loads those requirements but no test results, so every requirement starts UNVERIFIED.

Loading the synthetic sample or choosing a JUnit XML file sends that XML through the same parser. The parser produces test IDs, outcomes, and diagnostic messages. The app retains one current report and explicit mappings in memory. A pure TypeScript function joins those mappings to the current results and calculates each requirement's status. The dashboard and JSON export use that same calculation, never separate versions of the rules.

An import replaces evidence only after the whole file passes validation. Failed imports leave the previous evidence and mappings unchanged. Closing or refreshing the page clears the session. Nothing is uploaded and no test is executed by ShipProof: it interprets supplied reports, whose truth and relevance still require human review.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. `main.ts` creates the initial state from `sample.ts`; `ui.ts` renders the three UNVERIFIED requirements and the exact empty-state message.
2. **Load sample evidence** passes bundled XML text to `junit.ts`; **Import JUnit XML** reads the chosen local file and passes its text to the same parser.
3. `junit.ts` validates the complete input and returns normalized tests plus any declared synthetic marker. It returns no partial report.
4. `state.ts` replaces the evidence and its source atomically, preserving mappings. Failure leaves the previous valid domain state intact; the controller displays an import error.
5. `domain.ts` derives requirement results, evidence gaps, counts, and the readiness statement. `ui.ts` displays that result and the current source.
6. A mapping add/remove action changes only mappings in `state.ts`; the domain function recomputes the ledger and the view updates.
7. **Export readiness report (JSON)** calls `export.ts` with current state and a generation time. It uses the domain calculation, serializes indented JSON, and requests a local browser download.

```text
Bundled XML or local file -> validated parser -> current evidence
Initial or edited mappings -------------------> pure ledger calculation
                                               |                    |
                                           dashboard          JSON export
```

## Stack

The learner approved Vite + TypeScript + vanilla DOM/CSS + Vitest + jsdom. No backend, database, UI framework, XML package, or runtime service.

| Tool | Planned exact version | Purpose and documentation |
|---|---|---|
| Node.js | 24.22.1 installed locally; require Node 24.15+ in the 24.x line | Development/test runtime; https://nodejs.org/en/docs |
| Vite | 8.3.5 | Local asset server and static production build; https://vite.dev/guide/ |
| TypeScript | 7.0.2 | Strict typed modules and `tsc --noEmit`; https://www.typescriptlang.org/docs/ |
| Vitest | 5.0.5 | Repeatable automated tests; https://vitest.dev/guide/ |
| jsdom | 30.1.3 | Browser-like DOM and XML parsing in tests; https://github.com/jsdom/jsdom |
| Browser DOMParser | Browser built-in | Parse XML without a runtime dependency; https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString |

Registry versions and declared Node engine ranges were checked with `npm view` on 2026-10-26. Those ranges accept the installed runtime; actual install, tool interoperability, tests, and build remain unverified until `5-build`. Pin direct versions and retain `package-lock.json`; do not claim maintenance or runtime compatibility from version metadata alone. All four packages are development dependencies.

Accepted tradeoff: TypeScript rather than the learner's familiar Python eliminates backend/request plumbing. The small domain function remains independent of browser code and easy to compare with testable requirements.

## Where It Runs and How Someone Tries It

Implements `prd.md > Bundled sample project and empty state` and `States and Boundaries`.

Planned npm scripts:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

- First implementation install generates the lockfile; subsequent installs use `npm ci`.
- `dev`: `vite --host 127.0.0.1 --port 5173 --strictPort`.
- Open `http://127.0.0.1:5173` for development. If occupied, report the conflict; do not kill an unrelated process.
- `test`: `vitest run`; `typecheck`: `tsc --noEmit`; `build`: `tsc --noEmit && vite build`.
- `preview`: `vite preview --host 127.0.0.1 --port 4173 --strictPort`; open `http://127.0.0.1:4173` to record the built app without the development hot-reload connection.
- This machine requires `export PATH="$HOME/.local/bin:$PATH"` before Node/npm commands. Do not change global shell configuration.
- Network access is needed for initial dependency installation, not for subsequent app, test, build, or demo use. The local asset server must remain running; this is not a service-worker/PWA or a double-click `file://` app.
- No keys, external fonts, CDN scripts, analytics, or remote API calls. Browser support targets current desktop Chromium, Firefox, and Safari; only actually exercised browsers may be reported as tested.
- Repeatable demo: reload; observe three UNVERIFIED requirements; load synthetic evidence; inspect 1 VERIFIED / 1 FAILED / 1 UNVERIFIED; remove and restore a link; import a fixture; export and inspect JSON.
- A short demo video and public GitHub repository are required by the curriculum. Deployment is optional and excluded here. No repository initialization, commits, public repository creation, push, upload, or submission is authorized by this spec; obtain the applicable permission at the workflow gate. The learner writes narration, submission text, and survey answers.

## Look and Feel

Implements `prd.md > Look and Feel` and `Screens and Layout`.

Use one responsive dashboard, not routes or a component framework. White panels on a light neutral background, charcoal body text, slate secondary text, and navy primary buttons. Initial CSS colors: page `#f5f6f8`, surface `#ffffff`, text `#1f2937`, secondary `#475569`, action `#1e3a5f`; status text green `#166534`, red `#991b1b`, amber `#92400e` on restrained pale backgrounds. Verify actual text/background contrast during build rather than claiming these choices alone establish accessibility.

Use local system sans-serif and system monospace stacks; no font downloads. Keep a compact header/source area and three status counters above the requirement rows. Each requirement shows its ID, title, readable status, rationale, links, and diagnostics. Wrap long identifiers and preserve multiline diagnostic text without horizontal overflow.

Use semantic headings, buttons, labels, lists, native select controls, and inline expandable mapping panels. No modal focus trap or complex navigation. Maintain keyboard focus across updates, expose expanded state, and announce concise changes through a live status region; import errors use an alert. Text labels always accompany semantic colors. No animations, charts, gradients, decorative imagery, or design-system build-out.

## Components

### Domain Model and Status Engine

Implements `prd.md > Readiness status rules` and `Reading the evidence dashboard`.

`model.ts` defines types; `domain.ts` exports one pure `evaluateLedger(state)` function. It accepts requirements, explicit mappings, and nullable normalized evidence; it has no DOM, filesystem, network, clock, or mutable global dependency. Requirements and tests retain stable input order, and links retain explicit order.

For each requirement:

1. With no loaded report: UNVERIFIED, reason `No test evidence loaded yet.` Existing mapping IDs remain visible but no observed test result is invented; an unlinked requirement also shows `No linked test evidence.`
2. With a loaded report: resolve each mapped ID to its current test result, or MISSING with an explicit reason. Preserve every mapping.
3. Any linked FAIL -> FAILED, regardless of additional gaps. Retain gaps and diagnostic details even when failure wins.
4. Otherwise no links, or any SKIPPED / ERROR / MISSING -> UNVERIFIED.
5. Otherwise at least one link and every linked outcome PASS -> VERIFIED, described as `Verified against linked checks.`

The single verification rule is `all-linked-checks-pass`; it is not configurable in this POC. A PASS + MISSING pair is UNVERIFIED. Suite counters and unlinked test results never determine requirement status.

The function returns requirement results, all linked outcomes/messages, structured gaps, status counts, and the readiness statement. A no-links requirement has a requirement-level gap even though it has no individual missing test. If a failure and gaps coexist, the summary warns about both. Even an all-VERIFIED ledger includes the limited-claim warning.

### JUnit Import Boundary

Implements `prd.md > Importing JUnit XML evidence`.

`junit.ts` accepts XML text and returns normalized tests, or throws a readable import error. It never changes application state. Parse using `new DOMParser().parseFromString(text, 'application/xml')`, reject a parser-error document, and check the supported structure explicitly.

Supported subset:

- Non-namespaced `<testsuite>` or `<testsuites>` root; nested suites; `<testcase>` under suites.
- A nonblank `name` is required; `classname` is optional. Preserve actual identifier strings and case; do not fuzzy-match or infer requirement mappings.
- Stable ID: without classname, `encodeURIComponent(name)`; with a nonempty classname, `encodeURIComponent(classname) + '::' + encodeURIComponent(name)`. Encoding prevents separator collisions. These IDs do not depend on order or on which other cases appear in a report.
- The bundled cases omit classname, preserving the agreed exact IDs `test_valid_credentials_succeed` and `test_invalid_credentials_rejected`. A class-qualified imported case has a different ID and must be explicitly mapped; the old link remains MISSING until removed or matched by another import.
- Direct testcase `<failure>` -> FAIL, `<error>` -> ERROR, `<skipped>` -> SKIPPED, otherwise PASS only within this supported completed-test format. Retain message attributes and text details, including skipped reasons. Multiple diagnostic nodes of the same outcome may be joined; conflicting outcome kinds are rejected as ambiguous.
- If a testcase has `status`, accept only `run`; if it has `result`, accept only `completed`. Other status/result dialects are rejected rather than guessed as PASS. Unsupported retry/flaky/incomplete markers are rejected. Explain this conservative subset in the README.
- Properties and system-out/system-err metadata may be ignored; they never execute. Suite aggregate counts are not used as evidence. Suite-level failure/error markers without attributable testcase outcomes, unknown outcome elements, and ambiguous duplicate canonical IDs (even identical duplicates) reject the whole report.
- Reject empty XML, zero-test reports, unsupported roots/namespaces, misplaced cases, missing names, and malformed XML with actionable errors.
- Reject DOCTYPE and ENTITY declarations before parsing; no external entity resolution. Reject files above 1 MiB and reports above 1,000 test cases to keep synchronous parsing bounded for this three-requirement demo. Check file size before reading and UTF-8 text size at the parser boundary.
- Recognize the bundled suite property `shipproof.synthetic=true` solely as a synthetic disclosure, not a verification credential. Importing that fixture through the picker keeps its synthetic warning. Absence of a marker does not establish a real execution.

Never render XML or diagnostic content as HTML. All input-derived names, IDs, filenames, and messages use DOM text nodes or `textContent`.

### Bundled Sample

Implements `prd.md > Bundled sample project and empty state` and `Loading synthetic sample evidence`.

`sample.ts` holds the three requirements and initial mappings. `fixtures/sample-auth.junit.xml` is the single source of sample report content, imported as raw text through Vite so the action requires no fetch. It contains the two named cases, one PASS and one FAIL, and the synthetic property. The FAIL message states it is synthetic, for example `Synthetic fixture: expected HTTP 401 for invalid credentials; observed HTTP 200.` REQ-003 has no mapping.

This is an illustrative report, not an authentication implementation or claimed execution. Additional small, explicitly synthetic XML fixtures exercise an all-passing report, gaps, missing IDs, and malformed import; they are not a second product or extra testing-format support.

### Application State and Transitions

Implements `prd.md > Manual evidence mapper`, `Importing JUnit XML evidence`, and `States and Boundaries`.

`state.ts` creates initial domain state, validates mapping operations, and applies evidence replacement. `main.ts` coordinates file reading and UI events; it keeps transient loading/error/expanded-panel state separate from valid domain state.

- Initial state: three fixed requirements, initial links, `evidence: null`.
- Import: disable evidence/mapping/export actions while reading; label any retained view as previous evidence while loading. Parse the complete report before replacing evidence. Keep mappings unchanged on success and keep all domain state unchanged on failure. Canceling the picker does nothing; clear the picker value after handling so the same file can be retried.
- Mapping add: require a known requirement and a current-report test ID; reject duplicate pairs. Mapping remove: allow removing existing links, including those now MISSING. No new arbitrary missing IDs are entered through the UI.
- Shared tests are allowed; use the mappings to display which other requirement IDs link to each test.
- All views and export are derived from current state through `evaluateLedger`; never retain a stale status cache or merge old reports.
- Reload restores the initial state. Optional Reset to sample invokes the same initial-state constructor only after the core journey passes; it does not auto-load evidence or introduce persistence.

### Dashboard and Mapper

Implements `prd.md > Screens and Layout`, `Reading the evidence dashboard`, and `Manual evidence mapper`.

`ui.ts` renders the dashboard from domain state, evaluated ledger, and transient interaction state. Use DOM creation/textContent for untrusted fields; static markup is allowed only where it cannot interpolate imported content.

Show source and filename, exact empty-state text, counts and readiness statement, requirement results, visible diagnostic messages, and permanent limited-claim language. Use a per-requirement inline mapping panel with a labeled available-test selector, explicit Add link button, and individually named Remove link buttons. Show existing missing links separately and make shared relationships visible. Keep selected panels open and restore meaningful focus after a mapping change.

The export button is labeled as JSON and disabled before evidence loads; explain the disabled state visibly. The mapper is unavailable without evidence. No extra onboarding surface, requirements editor, filter system, or chart is added.

### JSON Export

Implements `prd.md > JSON readiness export`.

`export.ts` builds a report from current state by calling `evaluateLedger`, accepting a supplied generation time for deterministic tests. It rejects export without evidence. The controller uses `new Date().toISOString()` for a real user export, serializes with two-space indentation, creates a Blob with `application/json`, and requests download as `shipproof-readiness-report.json` through a temporary object URL, then revokes the URL after dispatch.

Report schema version `1.0` is documented in the README using these stable keys:

```text
metadata: { product: "ShipProof", schemaVersion: "1.0", generatedAt: ISO8601,
            evidenceSource: { kind, filename, synthetic } }
summary: { totalRequirements, verified, failed, unverified, readinessStatement }
requirements: [{ id, title, verificationRule: "all-linked-checks-pass",
                 status, explanation, linkedTestIds,
                 checks: [{ testId, outcome, message }],
                 gaps: [{ testId, kind, message }] }]
provenance: { method, limitations: [string, ...] }
```

`evidenceSource.kind` is `synthetic-sample` or `imported-junit`. `synthetic` is `true` for bundled or declared synthetic evidence, otherwise `null` (unknown), never an unsupported claim of authenticity. `filename` always names the current report; importing a marked synthetic fixture gives `kind: imported-junit, synthetic: true` and both facts are visible.

Check outcomes are PASS / FAIL / SKIPPED / ERROR / MISSING. `message` is a string or null. Gaps use `NO_LINKED_TESTS`, `SKIPPED`, `ERROR`, or `MISSING`; a requirement-level no-links gap has `testId: null`. Gap entries are preserved on FAILED requirements too. Mapped missing checks have explicit MISSING entries and explanatory messages.

The provenance states deterministic evaluation of available report plus mappings, the limited meaning of VERIFIED, human responsibility for test relevance, no test execution/authenticity verification, and the synthetic warning when applicable. Pretty-printed JSON supplies the agreed readable export without PDF/HTML report generation.

A browser cannot confirm that the user saved the file to disk. UI feedback says `Download requested: shipproof-readiness-report.json`, not `File saved`. Tests must separately inspect the actual generated/downloaded content rather than treating that message as proof.

## Data Model

- `Requirement`: `{ id, title, verificationRule: 'all-linked-checks-pass' }`; fixed in the sample module.
- `TestResult`: `{ id, name, classname: string | null, outcome: 'PASS' | 'FAIL' | 'SKIPPED' | 'ERROR', message: string | null }`; produced by the parser. MISSING is derived by the engine, never claimed by a testcase.
- `Evidence`: `{ source: { kind, filename, synthetic: true | null }, tests: TestResult[] }`; exactly one current report in memory.
- `Mapping`: `{ requirementId, testId }`; unique pair, preserved across imports.
- `AppState`: `{ requirements: Requirement[], mappings: Mapping[], evidence: Evidence | null }`; recreated on refresh.
- `Ledger`: requirement evaluations, summary, readiness statement; derived, not persisted.
- UI-only state: busy flag, import error, status announcement, open mapper ID. It never replaces valid evidence on an error.

Test IDs are treated as opaque strings and indexed with `Map`, not unsafe object-property lookup. No raw XML persistence, localStorage, backend, database, report history, or automatic association with the user's actual codebase.

## File Structure

Planned files; application source is not implemented yet. Installed course assets remain untouched.

```text
ShipProof/
├── .agents/skills/              installed official curriculum
├── .gitignore                  existing profile/secrets/output exclusions
├── skills-lock.json            installed curriculum lock
├── devpost/
│   ├── learner-profile.md      private learning context; ignored by Git
│   ├── scope.md                approved scope
│   ├── prd.md                  approved product behavior
│   ├── spec.md                 this blueprint
│   └── checklist.md            created through 5-build, not yet complete
├── index.html                  semantic entry point and app mount
├── package.json                four dev dependencies and npm scripts
├── package-lock.json           reproducible dependency resolution
├── tsconfig.json               strict TS, ES modules, DOM types
├── vite.config.ts              Vite and Vitest/jsdom configuration
├── src/
│   ├── model.ts                domain and report types
│   ├── domain.ts               pure evaluation and summary
│   ├── junit.ts                validated XML -> normalized tests
│   ├── sample.ts               requirements, links, bundled raw fixture
│   ├── state.ts                initial state and validated transitions
│   ├── export.ts               current-state versioned JSON report
│   ├── ui.ts                   accessible dashboard and inline mapper
│   ├── main.ts                 file input, events, rendering, download
│   └── styles.css              restrained responsive audit-ledger styling
├── fixtures/
│   ├── sample-auth.junit.xml   explicitly synthetic default report
│   ├── all-pass.junit.xml      synthetic passes; REQ-003 still unlinked
│   ├── gaps.junit.xml          synthetic skipped/error/missing scenarios
│   └── malformed.junit.xml     intentional invalid input for tests/demo
├── tests/
│   ├── domain.test.ts          status precedence, reasons, counts
│   ├── junit.test.ts           subset, diagnostics, malformed/unsafe inputs
│   ├── state.test.ts           import replacement, mapping integrity
│   ├── export.test.ts          schema, JSON round trip, current-state facts
│   └── ui.test.ts              DOM interaction and download payload tests
├── README.md                   setup/demo, subset, schema, limitations
└── LICENSE                     open-source license; selection in build gate
```

## External Services and Dependencies

No application services, endpoints, credentials, hosting, or external network calls. npm registry access is development-time dependency installation only. Browser file input reads local data; DOMParser parses strings; Blob/object URLs support local downloads. Use system fonts and bundled fixtures. Documentation links above are references, not runtime resources.

## Verification Plan

Implements `prd.md > Required Verification` in small checks that the build checklist can cite.

1. **Domain tests:** all three sample outcomes; empty evidence; zero links; all passing; failure precedence with gaps; PASS + MISSING/SKIPPED/ERROR; all inconclusive evidence; removing the only passing link; independent evaluation of shared checks; unlinked failures/passes cannot decide a requirement; correct reasons, gap records, and counts.
2. **Parser tests:** single/multiple/nested suites; stable class-qualified IDs and collision rejection; failure/error/skipped messages; UTF-8 identifiers; malformed XML; zero cases; unsupported roots/outcomes/namespaces; conflicting markers; suite errors; size/case limits; DOCTYPE/entity rejection; synthetic marker; hostile HTML-like diagnostic text remains plain text.
3. **State tests:** valid replacement preserves mappings and never reuses old results; missing links remain; invalid/duplicate mappings rejected; removing missing links works; malformed replacement leaves the previous state identical; failed initial import stays empty.
4. **Export tests:** JSON parse round trip, version and ISO generation time with fixed test clock, source/filename/synthetic provenance, linked IDs/outcomes/messages/gaps, failure-plus-gap warning, mapping changes and imports reflected, counts identical to domain/dashboard, export absent evidence rejected.
5. **jsdom UI tests:** initial disabled actions and exact copy, sample load, mapping add/remove/shared links, missing-link visibility, failed import preservation, loading action guard, input-derived text safety, and download Blob/object URL payload. Mocked download tests verify wiring/payload only, not an actual saved file.
6. **Real browser review:** start the server; use the golden path and invalid-file/replacement paths; inspect an actual downloaded JSON file or directly capture its download bytes and parse them; compare counts after a mapping change. Inspect keyboard focus and screen-reader-relevant labels, narrow viewport, console errors, and network requests. Test the production preview for no external requests; local asset requests and the dev-server socket are not external services.
7. **Full commands:** run `npm test`, `npm run typecheck`, and `npm run build`; record exact outcomes. No unrun browser, accessibility, offline, download, or test check is marked passed.

The learner's hands-on review, learning wrap-up, and app-map activity remain separate curriculum gates. Agent tests do not count as learner actions. The JSON fixtures describe fictional test results; Vitest results are actual tests of ShipProof and must never be conflated with them.

## Important Failure Modes

- **Malformed/ambiguous/oversized input:** actionable error, no partial import, keep prior evidence/mappings/source; no automatic fallback to synthetic evidence.
- **Identity mismatch on replacement:** mapped IDs remain MISSING; explain the documented canonical ID and offer explicit remapping, never fuzzy relinking.
- **Mapping judged relevant when it is not:** warn that linking is a human assertion of relevance; a green status verifies only those checks, not semantic coverage, source authenticity, freshness, or universal correctness.
- **Download blocked by browser/environment:** retain state; disclose that a download was requested and report observed failure if available; do not claim an on-disk save without evidence.

## What Was Simplified and Why

- Browser-only session state instead of a Python service or database: one local process for assets, no request/storage plumbing.
- Three fixed requirements instead of authoring/importing requirements: one complete demonstrable journey.
- Strict all-linked-checks-pass rule instead of configurable predicates: deterministic small engine and clear precedence.
- Conservative documented JUnit subset instead of every vendor dialect: reject ambiguity rather than manufacture passing evidence.
- Vanilla DOM/CSS, inline mapping panels, and JSON instead of a UI framework, modal workflow, and report generator.
- Reload provides demo repeatability; the optional reset button is considered only after core verification.

## Decisions and Open Issues

- **Learner-approved architecture:** Vite, TypeScript, vanilla DOM/CSS, Vitest, jsdom; browser-only, no services; separate domain/parser/state/UI/export modules; preserve valid state on bad import; export the current state.
- **Learner-defined semantics:** all required linked checks must pass; any actual assertion failure wins; missing, skipped, or errored checks otherwise block verification. Preserve every explicit link across imports.
- **Derived implementation details proposed in this draft:** class-qualified encoded IDs, rejection of duplicate IDs, XML subset and limits, one shared ledger evaluator, in-memory state, inline mapper, pinned development packages, source-kind plus synthetic disclosure, and JSON keys above. These are not attributed to learner-authored choices.
- **Useful ambiguity resolved by the learner:** an earlier missing-test exception conflicted with all-linked-checks precedence. The learner explicitly resolved PASS + MISSING to UNVERIFIED. Carry that answer into a named domain test and compare it with `prd.md > Readiness status rules`; this practices the stated requirements-to-evidence learning goal without inventing a reflection or extra exercise.
- **No further learner uncertainty was stated:** do not fabricate one or ask optional discovery under deadline pressure.
- **Required review gate:** this file is a draft until the learner reviews it and approves; stack approval alone does not mark an unseen blueprint reviewed. Then invoke `5-build`, use its checklist and build-mode gate, and implement. No optional design interview is needed.
- **Not yet verified:** package install/interoperation, tests, build, browser workflow, contrast, download, offline behavior, or any publication.
- **Open build choices:** open-source license and permission for any local Git operations belong to the prescribed build/ship gates; no remote action is implied. Reset remains conditional, not a core acceptance requirement.

## Deadline Budget

Deadline: 2026-10-26 21:00 UTC / 17:00 EDT / 2026-10-27 02:30 IST. Observed clock at the start of this draft: 2026-10-26 01:17 UTC, approximately 19 hours 42 minutes remaining; recompute from the actual clock during execution rather than treating this estimate as current forever.

Target active work after required approval: about 30 minutes for scaffold/domain/parser, 45 minutes for state/UI/export, 30 minutes for browser/regression checks and corrections, and 15 minutes for README/license and checklist evidence. These are estimates, not completion claims. Reserve separate learner time for hands-on review, app map, reflection, recording, repository/video authorization, and submission. Report blockers immediately; cut only optional reset work, never evidence semantics or required curriculum activities.
