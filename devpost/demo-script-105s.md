---
doc: demo-script-105s
status: draft
---

# ShipProof 105-second demo script

Target length: **1:45 (105 seconds)**, inside the requested 90–120 second range.

This is a shot-by-shot evidence script. The talking points are prompts; deliver them in your own words. Do not claim that ShipProof observed a real AI agent, executed the tests, or proved the application correct.

## Before recording

- Use a clean browser window at 100–125% zoom.
- Reload the app so it opens in the empty state.
- Have `fixtures/all-pass.junit.xml` ready in the file picker.
- Have a plain text editor ready for the exported JSON.
- Keep terminals, credentials, personal files, and unrelated tabs off screen.
- Do not use a fabricated video URL or describe the sample as a real test run.

## Run of show

| Time | Action on screen | Evidence to show | Talking points |
| --- | --- | --- | --- |
| 0:00–0:10 | Open on the empty ShipProof dashboard. | Product name, the synthetic claim panel, and the three requirements. | AI coding agents can declare a task complete. ShipProof asks whether the explicit requirements have enough **linked test evidence** to support that completion claim. |
| 0:10–0:25 | Point to the claim panel, then the disabled export and **Load sample evidence** / **Import JUnit XML** actions. | **Synthetic completion claim**: “All three authentication requirements are complete.” Claim audit **CANNOT VERIFY**. Result: “Claim cannot be evaluated without evidence.” Counts **0 / 0 / 3**. | This is a fixed demonstration claim, clearly labeled synthetic — not a message observed from an AI agent. With no evidence, the audit cannot evaluate it. |
| 0:25–0:45 | Choose **Import JUnit XML** and open `fixtures/all-pass.junit.xml`. | Source: **Imported evidence — declared synthetic, not a real test run**. Claim audit **NOT READY**. Counts **2 VERIFIED / 0 FAILED / 1 UNVERIFIED**. **What blocks the claim** names only **REQ-003 — Rate limiting is enforced — UNVERIFIED — No linked test evidence.** | Every test case in this report passed. Two requirements have linked passing checks. The claim is still unsupported because REQ-003 has no linked evidence. |
| 0:45–1:00 | Keep the blocker visible; briefly indicate the two VERIFIED rows. | REQ-001 and REQ-002 each show a linked **PASS**. REQ-003 shows **No linked test evidence** and no passing test is counted for it. | This is the gap ShipProof exposes: a green suite does not automatically cover an unrelated requirement. The missing link is the specific reason the claim fails. |
| 1:00–1:20 | Open **Manage test links** on REQ-003, select `test_valid_credentials_succeed`, and choose **Add link**. | Claim audit changes to **LINKED CHECKS PASSED**. Result: “Claim is supported by the linked checks, not proven true.” Counts **3 / 0 / 0**. Blocker list clears. REQ-003 shows the linked **PASS** and **Also linked to REQ-001**. | The only change is one explicit evidence link. The result now says the linked checks support the claim — not that the application is universally correct. |
| 1:20–1:35 | Choose **Export readiness report (JSON)** and open `shipproof-readiness-report.json`. | `schemaVersion` **1.0**; source `all-pass.junit.xml`, declared synthetic; `summary.decision` **LINKED_CHECKS_PASSED**; `summary.blockers` empty; counts **3 / 0 / 0**; all three requirement statuses **VERIFIED**. | The export uses the same evaluator as the screen, so the visible claim audit and the machine-readable report agree. |
| 1:35–1:45 | Return to the claim panel and stop. | The limited-meaning sentence: “Claim is supported by the linked checks, not proven true.” | ShipProof audits evidence sufficiency, not universal code correctness. Whether each linked test is relevant remains a human responsibility. |

## Expected export fields

After the REQ-003 link is added, the exported report should show:

```text
metadata.schemaVersion: "1.0"
metadata.evidenceSource.kind: "imported-junit"
metadata.evidenceSource.filename: "all-pass.junit.xml"
metadata.evidenceSource.synthetic: true
summary.decision: "LINKED_CHECKS_PASSED"
summary.blockers: []
summary.verified: 3
summary.failed: 0
summary.unverified: 0
requirements[*].status: "VERIFIED"
```

If the dashboard and the exported fields do not match, stop and do not present the export as consistent.

## After recording

- Watch once at normal speed. Confirm the synthetic claim label, **NOT READY** blocker, status counts, link change to **LINKED_CHECKS_PASSED**, and exported decision are readable.
- Confirm the recording never calls the sample a real test run and never claims the app observed an AI agent.
- Confirm no personal information, credentials, terminals, or unrelated tabs appear.
- Upload the video only after choosing where it will be hosted, then verify the public link in a private window.
- Do not claim the repository, video, or Devpost submission is published until each is actually verified.
