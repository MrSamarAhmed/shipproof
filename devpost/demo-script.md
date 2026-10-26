---
doc: demo-script
status: draft
---

# ShipProof demo run-of-show

Target length: **2:45**, inside the live Devpost requirement of **1 to 3 minutes**. This is an action and evidence sheet, not narration. Write and speak your own words; this document does not supply a script.

**The spine of the demo:** a labeled synthetic completion claim says all three authentication requirements are complete. A report where every test case passes still audits as **NOT READY**, because REQ-003 has no linked evidence. Linking a passing test changes the claim-audit result; removing the link changes it back. The audit is about evidence relevance, not suite pass rate.

## Before recording

- Run `npm run dev` and open `http://127.0.0.1:5173` in a clean browser window.
- Reload immediately before recording so the app is in the empty state with the original mappings.
- Use a window with no bookmarks bar, other tabs, notifications, or personal files visible.
- Have `fixtures/all-pass.junit.xml`, `fixtures/gaps.junit.xml`, and `fixtures/malformed.junit.xml` ready in the file picker.
- Open a plain text editor for the exported JSON, sized so line numbers and file paths are not distracting.
- Do **not** load the bundled sample first: this run needs the all-pass import to show the strongest contrast.
- Record at a readable zoom (100–125%) and keep pointer movements deliberate.
- No API keys, accounts, terminal history, or unrelated files should appear.

## Run of show

| Time | Action on screen | Evidence that must be visible |
| --- | --- | --- |
| 0:00–0:10 | Start on the app with no evidence. | Labeled **Synthetic completion claim**; claim audit **CANNOT VERIFY** with “Claim cannot be evaluated without evidence”; all three requirements **UNVERIFIED**; guidance to load the sample or import a report; export disabled with its visible explanation. |
| 0:10–0:35 | Click **Import JUnit XML** and choose `fixtures/all-pass.junit.xml`. | Source says imported evidence, declared synthetic. Claim audit **NOT READY** with “Claim is not supported by the current evidence.” Counts **2 VERIFIED / 0 FAILED / 1 UNVERIFIED**. **What blocks the claim** names only REQ-003: **No linked test evidence.** Point out that every test case in the file passed. |
| 0:35–0:55 | Open **Manage test links** on REQ-003, select `test_valid_credentials_succeed`, click **Add link**. | Claim audit changes to **LINKED CHECKS PASSED** with “Claim is supported by the linked checks, not proven true.” Counts become **3 / 0 / 0**; the blocker list clears. The linked test shows PASS and an **Also linked to REQ-001** note. |
| 0:55–1:10 | Click **Remove link** on that same test. | Claim audit returns to **NOT READY** and the REQ-003 blocker returns. The passing report did not change; only the explicit evidence link did. |
| 1:10–1:35 | Click **Import JUnit XML** and choose `fixtures/gaps.junit.xml`. | Filename changes. REQ-002 becomes **UNVERIFIED** because its linked test is **MISSING**; the link remains visible with a warning. Counts are **1 / 0 / 2**. Claim audit stays **NOT READY** with updated blocker reasons. |
| 1:35–1:55 | Click **Import JUnit XML** and choose `fixtures/malformed.junit.xml`. | A clear “not well-formed XML” alert receives focus. The previous source, links, counts, blockers, and claim audit remain unchanged. |
| 1:55–2:25 | Click **Export readiness report (JSON)** and open `shipproof-readiness-report.json` in the editor. | `schemaVersion` 1.0; source `gaps.junit.xml`; `summary.decision` is `NOT_READY` and matches the visible claim audit; `summary.blockers` names the blocked requirements; REQ-002 has a MISSING check; provenance and limitations are present. |
| 2:25–2:45 | Return to the dashboard and stop on the claim-audit panel and blocker list. | The limited meaning of **LINKED CHECKS PASSED**: only the explicitly linked checks passed, not proof that the application is correct, complete, or authentic. The claim is a demonstration statement, not an observed AI-agent message. |

If a step runs long, drop the gaps import (1:10–1:35) rather than rushing the all-pass reveal, the malformed import, or the export. The claim audit then remains based on the all-pass report with REQ-003 unlinked, and the exported `NOT_READY` blocker still tells the story.

## After recording

- Watch it once at normal speed. Confirm the synthetic claim label, claim-audit result, blocker names, status counts, missing-link warning, malformed-import alert, and JSON decision/blockers are readable without pausing.
- Confirm the all-pass contrast is unmistakable: everything passed, yet the claim remained unsupported until REQ-003 received relevant evidence.
- Confirm no personal information, credentials, unrelated tabs, or notification pop-ups appear.
- Upload it somewhere reviewers can open without signing in. Check the link in a private window before submitting.
- Record the video URL and repository URL in `devpost/spec.md` under its sharing instructions once both exist.
- Check the live Devpost form when submitting. It states a 1–3 minute video and notes that reviewers will not clone or run the code, so the working app must be visible on screen.
