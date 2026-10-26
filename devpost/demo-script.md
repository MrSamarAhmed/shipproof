---
doc: demo-script
status: draft
---

# ShipProof demo run-of-show

Target length: **2:45**, inside the live Devpost requirement of **1 to 3 minutes**. This is an action and evidence sheet, not narration. Write and speak your own words; this document does not supply a script.

## Before recording

- Run `npm run dev` and open `http://127.0.0.1:5173` in a clean browser window.
- Use a window with no bookmarks bar, other tabs, notifications, or personal files visible.
- Have `fixtures/gaps.junit.xml` and `fixtures/malformed.junit.xml` ready in the file picker.
- Open a plain text editor for the exported JSON, sized so line numbers and file paths are not distracting.
- Reload the app immediately before recording so it starts in the empty state.
- Record at a readable zoom (100–125%) and keep the pointer movements deliberate.
- No API keys, accounts, terminal history, or unrelated files should appear.

## Run of show

| Time | Action on screen | Evidence that must be visible |
| --- | --- | --- |
| 0:00–0:10 | Start on the loaded app with no evidence. | “No evidence loaded yet,” all three requirements **UNVERIFIED**, export disabled with its visible explanation. |
| 0:10–0:35 | Click **Load sample evidence**. | Source says synthetic sample; counts **1 VERIFIED / 1 FAILED / 1 UNVERIFIED**; REQ-002 shows its assertion-failure message; REQ-003 shows **No linked test evidence** while other tests pass. |
| 0:35–0:55 | Open **Manage test links** on REQ-001, click **Remove link**, then add the same test back. | REQ-001 moves to **UNVERIFIED** and counts become 0/1/2; restoring the link returns it to **VERIFIED** and 1/1/1. The change is immediate. |
| 0:55–1:20 | Click **Import JUnit XML** and choose `fixtures/gaps.junit.xml`. | Source filename changes; REQ-002 becomes **UNVERIFIED** because its linked test is **MISSING** and the link is preserved with a warning; counts are **1 / 0 / 2**. |
| 1:20–1:40 | Open REQ-003's **Manage test links**, select `test_session_store_errors`, click **Add link**. | REQ-003 remains **UNVERIFIED** with an **ERROR** reason, not **FAILED**. Counts stay 1/0/2. |
| 1:40–2:00 | Click **Import JUnit XML** and choose `fixtures/malformed.junit.xml`. | A clear “not well-formed XML” alert receives focus; the prior evidence, links, and counts remain unchanged. |
| 2:00–2:30 | Click **Export readiness report (JSON)**, open the downloaded `shipproof-readiness-report.json` in the editor. | `schemaVersion` 1.0, evidence source `gaps.junit.xml`, summary 1/0/2, REQ-002's missing check, REQ-003's ERROR check, and the provenance/limitations text. |
| 2:30–2:45 | Return to the dashboard and stop on the requirement rows. | The limited meaning of **VERIFIED**: only the explicitly linked checks passed; it is not a claim that the whole application is correct. |

If a step runs long, drop the REQ-003 error-link step (1:20–1:40) rather than rushing the import or export. The required story is still intact without it.

## After recording

- Watch it once at normal speed. Confirm the status counts, failure reason, missing-link warning, alert, and JSON fields are readable without pausing.
- Confirm no personal information, credentials, unrelated tabs, or notification pop-ups appear.
- Upload it somewhere reviewers can open without signing in. Check the link in a private window before submitting.
- Record the video URL and repository URL in `devpost/spec.md` under its sharing instructions once both exist.
- Check the live Devpost form when submitting. It states a 1–3 minute video and notes that reviewers will not clone or run the code, so the working app must be visible on screen.
