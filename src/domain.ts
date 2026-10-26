import type {
  AppState,
  CheckDetail,
  Gap,
  Ledger,
  Requirement,
  RequirementResult,
  Status,
  Summary,
  TestResult,
} from './model';

const NO_EVIDENCE = 'No test evidence loaded yet.';
const NO_LINKS = 'No linked test evidence.';
const VERIFIED_EXPLANATION = 'Verified against linked checks.';
const LIMITED_CLAIM =
  'VERIFIED means the linked checks passed, not that the application is correct.';

export function evaluateLedger(state: AppState): Ledger {
  const testsById = new Map<string, TestResult>();
  if (state.evidence !== null) {
    for (const test of state.evidence.tests) {
      testsById.set(test.id, test);
    }
  }

  const results = state.requirements.map((requirement) =>
    evaluateRequirement(state, requirement, testsById),
  );

  return {
    requirements: results,
    summary: summarize(results, state.evidence !== null),
  };
}

function evaluateRequirement(
  state: AppState,
  requirement: Requirement,
  testsById: ReadonlyMap<string, TestResult>,
): RequirementResult {
  const linkedTestIds = state.mappings
    .filter((mapping) => mapping.requirementId === requirement.id)
    .map((mapping) => mapping.testId);

  if (state.evidence === null) {
    const hasNoLinks = linkedTestIds.length === 0;
    return {
      ...requirement,
      status: 'UNVERIFIED',
      explanation: hasNoLinks ? `${NO_EVIDENCE} ${NO_LINKS}` : NO_EVIDENCE,
      linkedTestIds,
      checks: [],
      gaps: hasNoLinks
        ? [{ testId: null, kind: 'NO_LINKED_TESTS', message: NO_LINKS }]
        : [],
    };
  }

  const checks: CheckDetail[] = linkedTestIds.map((testId) => {
    const test = testsById.get(testId);
    if (test === undefined) {
      return {
        testId,
        outcome: 'MISSING',
        message: `Test "${testId}" was not found in the current report.`,
      };
    }
    return { testId, outcome: test.outcome, message: test.message };
  });

  const gaps: Gap[] = [];
  if (checks.length === 0) {
    gaps.push({ testId: null, kind: 'NO_LINKED_TESTS', message: NO_LINKS });
  }
  for (const check of checks) {
    const gap = toGap(check);
    if (gap !== null) {
      gaps.push(gap);
    }
  }

  const status = statusFor(checks);

  return {
    ...requirement,
    status,
    explanation: explanationFor(checks, status),
    linkedTestIds,
    checks,
    gaps,
  };
}

function statusFor(checks: readonly CheckDetail[]): Status {
  if (checks.some((check) => check.outcome === 'FAIL')) {
    return 'FAILED';
  }
  if (checks.length === 0) {
    return 'UNVERIFIED';
  }
  if (checks.every((check) => check.outcome === 'PASS')) {
    return 'VERIFIED';
  }
  return 'UNVERIFIED';
}

function explanationFor(checks: readonly CheckDetail[], status: Status): string {
  if (status === 'VERIFIED') {
    return VERIFIED_EXPLANATION;
  }

  if (status === 'FAILED') {
    const failedIds = checks
      .filter((check) => check.outcome === 'FAIL')
      .map((check) => check.testId);
    return `Failed against linked checks: ${failedIds.join(', ')} reported an assertion failure.`;
  }

  if (checks.length === 0) {
    return NO_LINKS;
  }

  const missing = idsWithOutcome(checks, 'MISSING');
  const skipped = idsWithOutcome(checks, 'SKIPPED');
  const errored = idsWithOutcome(checks, 'ERROR');
  const details: string[] = [];
  if (missing.length > 0) details.push(`missing: ${missing.join(', ')}`);
  if (skipped.length > 0) details.push(`skipped: ${skipped.join(', ')}`);
  if (errored.length > 0) details.push(`errored: ${errored.join(', ')}`);

  return `Unverified: required linked evidence is incomplete or inconclusive (${details.join('; ')}).`;
}

function idsWithOutcome(checks: readonly CheckDetail[], outcome: CheckDetail['outcome']): string[] {
  return checks.filter((check) => check.outcome === outcome).map((check) => check.testId);
}

function toGap(check: CheckDetail): Gap | null {
  switch (check.outcome) {
    case 'MISSING':
      return {
        testId: check.testId,
        kind: 'MISSING',
        message: `Test "${check.testId}" was not found in the current report.`,
      };
    case 'SKIPPED':
      return {
        testId: check.testId,
        kind: 'SKIPPED',
        message:
          check.message === null || check.message.length === 0
            ? 'Skipped without a reason.'
            : `Skipped: ${check.message}`,
      };
    case 'ERROR':
      return {
        testId: check.testId,
        kind: 'ERROR',
        message:
          check.message === null || check.message.length === 0
            ? 'Errored during setup or execution without a diagnostic message.'
            : `Errored during setup or execution: ${check.message}`,
      };
    case 'PASS':
    case 'FAIL':
      return null;
  }
}

function summarize(results: readonly RequirementResult[], hasEvidence: boolean): Summary {
  const verified = results.filter((result) => result.status === 'VERIFIED').length;
  const failed = results.filter((result) => result.status === 'FAILED').length;
  const unverified = results.filter((result) => result.status === 'UNVERIFIED').length;
  const totalRequirements = results.length;

  return {
    totalRequirements,
    verified,
    failed,
    unverified,
    readinessStatement: readinessStatement(
      totalRequirements,
      verified,
      failed,
      unverified,
      hasEvidence,
    ),
  };
}

function readinessStatement(
  total: number,
  verified: number,
  failed: number,
  unverified: number,
  hasEvidence: boolean,
): string {
  if (!hasEvidence) {
    return `No evidence loaded. All ${total} requirements are unverified.`;
  }
  if (failed > 0 && unverified > 0) {
    const remain = unverified === 1 ? 'remains' : 'remain';
    return `${failed} of ${total} requirements failed and ${unverified} ${remain} unverified. ${LIMITED_CLAIM}`;
  }
  if (failed > 0) {
    return `${failed} of ${total} requirements failed. ${LIMITED_CLAIM}`;
  }
  if (unverified > 0) {
    const remain = unverified === 1 ? 'remains' : 'remain';
    return `${unverified} of ${total} requirements ${remain} unverified because required evidence is missing or inconclusive. ${LIMITED_CLAIM}`;
  }
  if (verified === total) {
    return `All ${total} requirements are verified against their linked checks. This does not prove the application is correct beyond those checks.`;
  }
  return `${verified} of ${total} requirements are verified against their linked checks. ${LIMITED_CLAIM}`;
}
