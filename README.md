# ShipProof — Proof Before Done

ShipProof is a local, browser-only evidence ledger for software completion claims. It maps explicit requirements to JUnit test results, reports each requirement as **VERIFIED**, **FAILED**, or **UNVERIFIED**, and turns those results into one release decision: **CANNOT VERIFY**, **NOT READY**, or **LINKED CHECKS PASSED**.

The product exists for the gap between "the agent says it is done" and "there is evidence that it is done." A passing test suite elsewhere never proves an unrelated requirement. Only the checks explicitly linked to a requirement can verify it.

This is a proof of concept, not a hosted service.

## What it does

- Opens on a fictional **Authentication** project with three requirements and no evidence loaded, so the decision is **CANNOT VERIFY** and all three requirements are UNVERIFIED.
- Loads a clearly labeled **synthetic sample** JUnit report: one requirement VERIFIED, one FAILED, one UNVERIFIED, and an overall **NOT READY** decision.
- Shows **What blocks confidence** once evidence is loaded: every non-verified requirement with its status and reason, so the next action is not hidden in a count.
- Imports a local JUnit XML report through the browser file picker. A valid report replaces the current evidence; a malformed or unsupported report leaves the previous state intact.
- Lets you add and remove requirement-to-test links manually. Every change recomputes statuses, blockers, and the release decision through the same deterministic evaluator used by the dashboard and export.
- Preserves links across imports. A linked test that disappears from the new report becomes `MISSING` and remains visible and removable.
- Exports the current state as `shipproof-readiness-report.json`, including the decision, blockers, provenance, and limitations.

ShipProof never runs tests, uploads a report, calls a network API, or decides whether a test is relevant. Linking a test is a human assertion about relevance.

## Quick start

Requirements:

- Node.js 24.x, version 24.15 or newer. This build was developed and tested with Node 24.22.1.
- npm.
- A current desktop browser. The build was exercised in a Chromium-based browser; Firefox and Safari are intended targets but were not tested here.

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>.

Network access is needed only for the initial dependency install. The app, tests, production build, and demo run locally. No API keys, accounts, database, or external services are used.

Other commands:

```sh
npm test          # Vitest in jsdom
npm run typecheck # tsc --noEmit
npm run build     # typecheck + static production build into dist/
npm run preview   # serve dist/ at http://127.0.0.1:4173
```

If a port is already occupied, Vite reports the conflict. Do not kill an unrelated process; stop the existing server or use a different checkout.

## Demo walkthrough

1. Open the app. Confirm **CANNOT VERIFY**, the message **"No evidence loaded yet. ShipProof cannot verify completion claims without supporting test results."**, three UNVERIFIED rows, guidance to load evidence, and a disabled JSON export with a visible explanation.
2. Choose **Load sample evidence**. The source is labeled **"Synthetic sample evidence — not a real test run"** and the decision is **NOT READY** with two blockers.
   - REQ-001: VERIFIED — `test_valid_credentials_succeed` passed.
   - REQ-002: FAILED — `test_invalid_credentials_rejected` has an assertion failure with a synthetic message.
   - REQ-003: UNVERIFIED — no linked test exists, even though passing tests appear elsewhere.
3. Open **Manage test links** on REQ-001 and remove its only passing link. REQ-001 becomes UNVERIFIED and the counts, blockers, and decision update immediately. Add the link back to restore VERIFIED. Linking the failing test to REQ-003 makes REQ-003 FAILED. A test linked to two requirements shows an **Also linked to** note in each mapper.
4. Import `fixtures/all-pass.junit.xml`. Every test in that report passes, yet the decision is still **NOT READY** with counts **2 VERIFIED / 0 FAILED / 1 UNVERIFIED** because REQ-003 has no linked evidence. Open REQ-003's mapper and link `test_valid_credentials_succeed`; the decision becomes **LINKED CHECKS PASSED** with no blockers. Remove that link again to restore **NOT READY**.
5. Import `fixtures/gaps.junit.xml` to see a mapped test become `MISSING` and skipped/errored tests remain unlinked but available in the mapper. Blocker reasons change with the evidence.
6. Import `fixtures/malformed.junit.xml`. The error is announced and focused, and the previous evidence, source, mappings, statuses, blockers, and decision remain unchanged.
7. Choose **Export readiness report (JSON)**. The UI says **"Download requested: shipproof-readiness-report.json"**. A browser cannot confirm that a file was saved to disk, so the app deliberately does not claim it was.
8. Inspect the downloaded JSON and compare its source, summary decision, blockers, requirement statuses, checks, and gaps with the dashboard.

Refreshing the page resets everything to the initial empty state. There is no persistence.

## Status rules

The single verification rule is `all-linked-checks-pass`. It is not configurable in this proof of concept.

Apply these in order:

1. **FAILED** — any linked test present in the current report has an assertion failure.
2. **UNVERIFIED** — no tests are linked, or any linked test is missing from the current report, skipped, errored, or otherwise does not satisfy the rule.
3. **VERIFIED** — at least one test is linked, every linked test is present, every linked test passed, and no linked test is skipped, errored, missing, or failing.

Consequences worth stating explicitly:

- A PASS plus a MISSING linked test is **UNVERIFIED**. A passing check does not erase an incomplete evidence set.
- A FAILED requirement keeps its gap details; failure does not hide other missing or inconclusive evidence.
- Unlinked tests never affect a requirement's status. They are available only in the mapper.
- `VERIFIED` means the linked checks passed. It does not prove the application is correct, complete, or safe.

## Release decision

The requirement statuses reduce to one decision shown above the counts:

1. **CANNOT VERIFY** — no evidence report is loaded.
2. **NOT READY** — at least one requirement is FAILED or UNVERIFIED.
3. **LINKED CHECKS PASSED** — every requirement is VERIFIED.

A **What blocks confidence** list names every non-verified requirement, its status, and its reason once a report is loaded. In the empty state, the panel explains how to begin instead. The list is empty only when the decision is LINKED CHECKS PASSED. The labels are deliberately not "READY" or "APPROVED": a report of passing linked checks is not proof of correctness, completeness, authenticity, or test relevance.

The decision and blockers are derived by the same evaluator as the requirement rows and are included in the JSON export.

## Supported JUnit XML subset

ShipProof intentionally accepts a conservative, completed-test format. Anything it cannot interpret confidently is rejected as a whole report.

Supported structure:

- A non-namespaced `<testsuite>` or `<testsuites>` root.
- Nested `<testsuite>` elements and `<testcase>` elements under suites.
- A nonblank `name` on each test case. `classname` is optional.
- Direct `<failure>`, `<error>`, or `<skipped>` children normalize to `FAIL`, `ERROR`, or `SKIPPED`. A test case with none of them is `PASS`.
- Diagnostic `message` attributes and text are concatenated into a readable message. Multiple nodes of the same outcome are allowed; conflicting outcome kinds are rejected.
- If a test case has `status`, only `run` is accepted. If it has `result`, only `completed` is accepted.
- `properties`, `system-out`, and `system-err` metadata may be ignored. The bundled suite property `shipproof.synthetic=true` is recognized only as a synthetic disclosure.
- Suite aggregate counters are not used as evidence.

Test IDs are stable:

- No classname: `encodeURIComponent(name)`.
- With a nonempty classname: `encodeURIComponent(classname) + '::' + encodeURIComponent(name)`.

The two bundled sample IDs are exactly `test_valid_credentials_succeed` and `test_invalid_credentials_rejected`. A class-qualified imported test has a different ID and must be linked explicitly; the old link remains `MISSING` until removed or matched by a later report.

Rejected inputs include:

- Empty XML, malformed XML, and reports with no test cases.
- Namespaced documents or elements.
- Unsupported roots, misplaced test cases, missing test names, unknown outcome markers, and suite-level failure/error markers that cannot be attributed to a test case.
- Duplicate canonical test IDs, even when the duplicates are identical.
- Unsupported `status`/`result` dialects and retry/flaky/incomplete markers.
- Reports larger than 1 MiB or containing more than 1,000 test cases.
- `DOCTYPE` and `ENTITY` declarations. External entity resolution is never used.

Import is local. The file is treated as untrusted input, parsed with the browser's `DOMParser`, and all imported names, IDs, and messages are rendered as text, never as HTML.

## JSON readiness report

The export action downloads `shipproof-readiness-report.json` with schema version `1.0`:

```text
metadata: {
  product: "ShipProof",
  schemaVersion: "1.0",
  generatedAt: ISO 8601 timestamp,
  evidenceSource: { kind, filename, synthetic }
}
summary: {
  totalRequirements, verified, failed, unverified, decision, blockers,
  readinessStatement
}
requirements: [{
  id, title, verificationRule: "all-linked-checks-pass",
  status, explanation, linkedTestIds,
  checks: [{ testId, outcome, message }],
  gaps: [{ testId, kind, message }]
}]
provenance: { method, limitations: [string, ...] }
```

Field notes:

- `evidenceSource.kind` is `synthetic-sample` or `imported-junit`.
- `synthetic` is `true` for the bundled sample or a report declaring `shipproof.synthetic=true`. It is `null` when authenticity is unknown, never an unsupported claim that the evidence is real.
- `filename` always names the current report.
- `summary.decision` is `CANNOT_VERIFY`, `NOT_READY`, or `LINKED_CHECKS_PASSED` under the rules above.
- `summary.blockers` lists every non-verified requirement as `{ requirementId, title, status, reason }`; it is empty when all requirements are verified.
- `checks[].outcome` is `PASS`, `FAIL`, `SKIPPED`, `ERROR`, or `MISSING`.
- `checks[].message` is a string or `null`.
- `gaps[].kind` is `NO_LINKED_TESTS`, `SKIPPED`, `ERROR`, or `MISSING`. A requirement-level no-links gap has `testId: null`.
- Gap entries are preserved on FAILED requirements too.
- `generatedAt` uses the browser clock at export time. It is not a test execution timestamp.
- `provenance.limitations` repeats the synthetic warning when applicable and always states the limited meaning of VERIFIED, human responsibility for test relevance, and that ShipProof does not execute or authenticate tests.

The report is generated from current application state through the same evaluator as the dashboard. It is not hard-coded sample output. The browser download is requested through a temporary object URL; the UI reports that a download was requested, not that the operating system saved the file.

## Project structure

```text
.
├── index.html                  Entry point and app mount
├── src/
│   ├── main.ts                 Controller: file reading, events, focus, download
│   ├── model.ts                Domain types
│   ├── sample.ts               Fixed requirements, mappings, bundled XML
│   ├── junit.ts                Validated JUnit XML parser
│   ├── state.ts               State construction and mapping operations
│   ├── domain.ts               Pure status evaluator
│   ├── ui.ts                   Dashboard, mapper, and export feedback rendering
│   ├── export.ts               Versioned readiness report builder
│   └── styles.css              Audit-ledger styling and responsive rules
├── fixtures/                   Synthetic sample and test-case fixtures
├── tests/                      Domain, parser, state, export, and UI tests
├── devpost/                    Approved scope, PRD, spec, and build checklist
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── LICENSE
```

There is exactly one current evidence report in memory. Requirements and mappings are recreated on refresh. No raw XML, report history, or status cache is persisted.

## Tests and verification

`npm test` runs the domain tests, JUnit parser tests, state transition tests, export tests, and jsdom UI tests. They cover:

- Empty, sample, all-pass, missing, skipped, errored, and malformed evidence.
- The full status precedence, including PASS + MISSING = UNVERIFIED.
- Release-decision precedence, blocker contents, and the all-pass-but-unlinked case.
- Atomic import replacement and mapping preservation.
- Duplicate links, shared links, missing-link removal, and immediate recomputation.
- Fixed-clock export contents and serialization.
- Disabled/loading/export states, focus restoration, and hostile diagnostic text.

`npm run typecheck` and `npm run build` must also pass. The production build is static and can be served with `npm run preview`.

## Accessibility

The dashboard uses semantic landmarks and headings, native buttons, a labeled file input, native select controls, labeled mapping forms, lists, and a skip link. Status is always written as text as well as color. Disabled actions have visible explanations. Import errors use an alert with programmatic focus. Mapping and export updates are announced through a polite live region. Focus is restored to a stable control after a mapping change or export. Long identifiers and diagnostic text wrap instead of creating horizontal overflow.

Palette contrast was checked with WCAG relative-luminance calculations: body and secondary text, status text on its pale background, primary button text, danger text, and the focus ring exceed the applicable ratios; the select border was darkened to exceed 3:1 against white. This is not a substitute for a full accessibility audit, and Firefox/Safari were not exercised.

## Privacy and limitations

- Session only. Refreshing the page clears evidence, mappings, statuses, and export feedback.
- No backend, database, accounts, analytics, cookies, external fonts, CDN scripts, or remote API calls.
- No test execution and no verification of whether an imported report is genuine. Test relevance, truthfulness, and coverage require human review.
- The bundled sample and its failure message are fictional and labeled as synthetic.
- Only explicit, manual test links are supported. There is no fuzzy matching, AI mapping, automatic repair, requirements editing, or requirements-file import.
- One evidence report at a time. No report history, comparison view, or persistence.
- One JUnit XML subset only, with the 1 MiB and 1,000-test-case limits above.
- JSON export only. No PDF, HTML report, cloud storage, or sharing.
- Requirement counts are fixed at three; the reset-to-sample action was intentionally omitted from the proof of concept.
- The browser cannot confirm that a downloaded file reached disk. The UI says "Download requested" for that reason.
- The development server is not a PWA or a `file://` app. Keep it running while demoing.

## License

MIT. See [LICENSE](LICENSE).
