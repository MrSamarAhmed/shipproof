---
doc: scope
status: approved
---

# ShipProof

An evidence ledger that maps explicit software requirements to test evidence and reports which requirements are verified, failed, or unverified.

## The Unique Kernel
ShipProof refuses to turn a requirement green just because an AI agent says the work is done or because the overall test suite passes. Each status is earned by linked evidence: a requirement with no adequate linked check stays UNVERIFIED, and a linked failure makes it FAILED. The app makes the gap between a completion claim and demonstrated evidence visible.

## Who It's For
Solo developers and small engineering teams who use AI coding agents and need to judge whether a feature is actually finished. Today they read green test output, mentally map tests to requirements, and trust an agent's completion claim. ShipProof gives them one place to see what is verified, what failed, and what still lacks proof.

## The Core Loop
Open ShipProof and land on the bundled sample project: three explicit requirements and the evidence dashboard are visible immediately, with no project setup. Evidence begins empty until the user loads the clearly labeled synthetic sample report or imports a JUnit XML report. Then inspect how each test maps to a requirement, review each status, and open its supporting evidence. Adjust explicit links with a simple manual mapping interface if needed. Export a concise readiness report.

## Inspiration & Identity
No visual references were volunteered. The tone should feel like an honest audit ledger: calm, factual, and legible. Failures and missing evidence are as visible as passes. Sample evidence is labeled as synthetic, and imported evidence is clearly distinguished; the app never implies that the bundled sample came from a real test run.

## Why This Matters to the Learner
In their words: an AI coding agent can say a feature is complete even when the implementation is incomplete, a test is missing, or the result does not meet the original requirement. Passing tests alone do not prove the whole feature works as intended. The goal is not to prove software perfectly correct, but to make unsupported completion claims harder to miss.

## What "Working" Looks Like
The app opens directly into the three-requirement sample project with no project configuration. The requirements are already loaded; evidence starts empty until the user loads the labeled synthetic sample report or imports a JUnit XML. After evidence is loaded, the dashboard shows:

- Requirement 1: **VERIFIED** — linked passing checks.
- Requirement 2: **FAILED** — a linked check fails, with the failure visible.
- Requirement 3: **UNVERIFIED** — no adequate linked evidence, even though other tests pass.

Statuses are recomputed from the imported results and explicit links, not hard-coded for the sample. The user can inspect the evidence behind every status, review or change explicit links, and export a concise readiness report listing requirements, supporting checks, failures, and gaps.

The "oh, that's cool" moment: the overall suite contains passing tests, yet Requirement 3 stays UNVERIFIED because nothing adequate is linked to it — and ShipProof explains exactly why.

## The POC Boundary
In:

- One bundled fictional sample project with three requirements.
- One supported import path: JUnit XML, including a deterministic sample report.
- Explicit, reviewable links between imported tests and requirements; manual mapping only.
- Deterministic status logic for VERIFIED, FAILED, and UNVERIFIED, with unit tests covering passing, failing, and missing evidence.
- Evidence detail per requirement, including supporting checks and visible failures.
- A readable exported readiness report.
- Useful empty, loading, invalid-file, and error states.
- One polished, accessible end-to-end journey that works offline with no API keys.
- Clear labeling of sample versus imported evidence, README, setup instructions, license, and honest limitations.

The proof of concept does not claim correctness. It reports the evidence it was given.

## Later
- Importing a requirements file instead of using the bundled sample. Useful, but it adds a second setup path and does not strengthen the core proof.
- Additional test formats beyond JUnit XML.
- Multiple projects or persistent history.
- Editing requirements directly in the app.

## Explicitly Cut
- AI or automatic test-to-requirement mapping. It would weaken the explicit-evidence kernel and add LLM/API dependency.
- AI summaries or judgments about readiness. The deterministic evidence rules decide status.
- Login, database, multi-user collaboration, and deployment. Not needed to prove the kernel.
- Any claim that a green suite or a passing test universally proves correctness.

## Notes
Hackathon deadline: October 26, 2026, 5:00 PM EDT. Submissions require a demo video and public repository, but no publishing, pushing, video upload, or Devpost submission happens without the learner's explicit authorization. The learner writes their own submission text, narration, and survey answers.
