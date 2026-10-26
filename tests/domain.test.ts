import { describe, expect, it } from 'vitest';
import { evaluateLedger } from '../src/domain';
import type { AppState, Evidence, Mapping, TestResult } from '../src/model';
import { INITIAL_MAPPINGS, REQUIREMENTS, SAMPLE_XML } from '../src/sample';
import { createInitialState } from '../src/state';
import { parseJUnitReport } from '../src/junit';

function pass(id: string): TestResult {
  return { id, name: id, classname: null, outcome: 'PASS', message: null };
}

function fail(id: string, message = 'expected HTTP 401, received HTTP 200'): TestResult {
  return { id, name: id, classname: null, outcome: 'FAIL', message };
}

function skipped(id: string, message: string | null = 'not applicable'): TestResult {
  return { id, name: id, classname: null, outcome: 'SKIPPED', message };
}

function errored(id: string, message: string | null = 'database unavailable'): TestResult {
  return { id, name: id, classname: null, outcome: 'ERROR', message };
}

function evidenceWith(tests: readonly TestResult[]): Evidence {
  return {
    source: { kind: 'imported-junit', filename: 'report.xml', synthetic: null },
    tests,
  };
}

function stateWith(
  tests: readonly TestResult[] | null,
  mappings: readonly Mapping[] = INITIAL_MAPPINGS,
): AppState {
  return {
    requirements: REQUIREMENTS,
    mappings,
    evidence: tests === null ? null : evidenceWith(tests),
  };
}

function requirement(state: AppState, id: string) {
  const result = evaluateLedger(state).requirements.find((item) => item.id === id);
  if (result === undefined) {
    throw new Error(`Missing requirement ${id}`);
  }
  return result;
}

describe('empty evidence', () => {
  it('marks every requirement unverified without inventing test results', () => {
    const ledger = evaluateLedger(createInitialState());

    expect(ledger.requirements.map((result) => result.status)).toEqual([
      'UNVERIFIED',
      'UNVERIFIED',
      'UNVERIFIED',
    ]);
    expect(ledger.requirements[0]?.explanation).toBe('No test evidence loaded yet.');
    expect(ledger.requirements[0]?.checks).toEqual([]);
    expect(ledger.requirements[0]?.linkedTestIds).toEqual(['test_valid_credentials_succeed']);
    expect(ledger.requirements[2]?.explanation).toBe(
      'No test evidence loaded yet. No linked test evidence.',
    );
    expect(ledger.requirements[2]?.gaps).toEqual([
      { testId: null, kind: 'NO_LINKED_TESTS', message: 'No linked test evidence.' },
    ]);
    expect(ledger.summary.readinessStatement).toContain('No evidence loaded');
  });
});

describe('bundled sample', () => {
  it('produces one verified, one failed, and one unverified requirement', () => {
    const parsed = parseJUnitReport(SAMPLE_XML);
    const state: AppState = {
      ...createInitialState(),
      evidence: {
        source: {
          kind: 'synthetic-sample',
          filename: 'sample-auth.junit.xml',
          synthetic: true,
        },
        tests: parsed.tests,
      },
    };
    const ledger = evaluateLedger(state);

    expect(ledger.requirements.map((result) => result.status)).toEqual([
      'VERIFIED',
      'FAILED',
      'UNVERIFIED',
    ]);
    expect(ledger.summary).toMatchObject({
      totalRequirements: 3,
      verified: 1,
      failed: 1,
      unverified: 1,
    });
    expect(ledger.summary.readinessStatement).toContain(
      '1 of 3 requirements failed and 1 remains unverified',
    );
    expect(ledger.requirements[1]?.checks[0]?.message).toContain('Synthetic fixture');
    expect(ledger.requirements[1]?.explanation).toContain(
      'test_invalid_credentials_rejected reported an assertion failure',
    );
    expect(ledger.requirements[2]?.explanation).toBe('No linked test evidence.');
    expect(ledger.requirements[2]?.gaps).toEqual([
      { testId: null, kind: 'NO_LINKED_TESTS', message: 'No linked test evidence.' },
    ]);
  });
});

describe('release decision', () => {
  it('cannot verify without evidence and lists every unevaluated requirement', () => {
    const ledger = evaluateLedger(createInitialState());

    expect(ledger.summary.decision).toBe('CANNOT_VERIFY');
    expect(ledger.summary.blockers.map((blocker) => blocker.requirementId)).toEqual([
      'REQ-001',
      'REQ-002',
      'REQ-003',
    ]);
    expect(ledger.summary.blockers.every((blocker) => blocker.status === 'UNVERIFIED')).toBe(
      true,
    );
    expect(ledger.summary.blockers[0]?.reason).toBe('No test evidence loaded yet.');
    expect(ledger.summary.blockers[2]?.reason).toBe(
      'No test evidence loaded yet. No linked test evidence.',
    );
  });

  it('is not ready when a linked assertion fails and another requirement is unverified', () => {
    const parsed = parseJUnitReport(SAMPLE_XML);
    const state: AppState = {
      ...createInitialState(),
      evidence: {
        source: {
          kind: 'synthetic-sample',
          filename: 'sample-auth.junit.xml',
          synthetic: true,
        },
        tests: parsed.tests,
      },
    };
    const ledger = evaluateLedger(state);

    expect(ledger.summary.decision).toBe('NOT_READY');
    expect(ledger.summary.blockers.map((blocker) => blocker.requirementId)).toEqual([
      'REQ-002',
      'REQ-003',
    ]);
    expect(ledger.summary.blockers[0]).toMatchObject({
      title: 'Invalid credentials are rejected',
      status: 'FAILED',
    });
    expect(ledger.summary.blockers[0]?.reason).toContain(
      'reported an assertion failure',
    );
    expect(ledger.summary.blockers[1]).toMatchObject({
      title: 'Rate limiting is enforced',
      status: 'UNVERIFIED',
      reason: 'No linked test evidence.',
    });
  });

  it('stays not ready when every test passes but one requirement has no links', () => {
    const state = stateWith([
      pass('test_valid_credentials_succeed'),
      pass('test_invalid_credentials_rejected'),
    ]);
    const ledger = evaluateLedger(state);

    expect(ledger.summary).toMatchObject({
      verified: 2,
      failed: 0,
      unverified: 1,
      decision: 'NOT_READY',
    });
    expect(ledger.summary.blockers).toEqual([
      {
        requirementId: 'REQ-003',
        title: 'Rate limiting is enforced',
        status: 'UNVERIFIED',
        reason: 'No linked test evidence.',
      },
    ]);
  });

  it('passes only the linked checks when every requirement is verified', () => {
    const state = stateWith(
      [pass('a')],
      [
        { requirementId: 'REQ-001', testId: 'a' },
        { requirementId: 'REQ-002', testId: 'a' },
        { requirementId: 'REQ-003', testId: 'a' },
      ],
    );
    const ledger = evaluateLedger(state);

    expect(ledger.summary).toMatchObject({
      verified: 3,
      failed: 0,
      unverified: 0,
      decision: 'LINKED_CHECKS_PASSED',
      blockers: [],
    });
    expect(ledger.summary.readinessStatement).toContain(
      'This does not prove the application is correct beyond those checks.',
    );
  });
});

describe('status precedence', () => {
  it('verifies a requirement when every linked check passes', () => {
    const state = stateWith([pass('a')], [{ requirementId: 'REQ-001', testId: 'a' }]);
    const result = requirement(state, 'REQ-001');

    expect(result.status).toBe('VERIFIED');
    expect(result.explanation).toBe('Verified against linked checks.');
    expect(result.gaps).toEqual([]);
  });

  it('verifies with multiple passing links', () => {
    const state = stateWith(
      [pass('a'), pass('b')],
      [
        { requirementId: 'REQ-001', testId: 'a' },
        { requirementId: 'REQ-001', testId: 'b' },
      ],
    );

    expect(requirement(state, 'REQ-001').status).toBe('VERIFIED');
  });

  it('fails when any linked check is an assertion failure, even beside a pass', () => {
    const state = stateWith(
      [pass('a'), fail('b')],
      [
        { requirementId: 'REQ-001', testId: 'a' },
        { requirementId: 'REQ-001', testId: 'b' },
      ],
    );
    const result = requirement(state, 'REQ-001');

    expect(result.status).toBe('FAILED');
    expect(result.explanation).toContain('b reported an assertion failure');
    expect(result.checks.map((check) => check.outcome)).toEqual(['PASS', 'FAIL']);
  });

  it('keeps gaps visible on a failed requirement', () => {
    const state = stateWith(
      [fail('a')],
      [
        { requirementId: 'REQ-001', testId: 'a' },
        { requirementId: 'REQ-001', testId: 'missing' },
      ],
    );
    const result = requirement(state, 'REQ-001');

    expect(result.status).toBe('FAILED');
    expect(result.gaps).toEqual([
      {
        testId: 'missing',
        kind: 'MISSING',
        message: 'Test "missing" was not found in the current report.',
      },
    ]);
  });

  it('does not verify PASS plus MISSING', () => {
    const state = stateWith(
      [pass('a')],
      [
        { requirementId: 'REQ-002', testId: 'a' },
        { requirementId: 'REQ-002', testId: 'missing' },
      ],
    );
    const result = requirement(state, 'REQ-002');

    expect(result.status).toBe('UNVERIFIED');
    expect(result.checks.map((check) => check.outcome)).toEqual(['PASS', 'MISSING']);
    expect(result.explanation).toContain('missing: missing');
    expect(result.gaps.map((gap) => gap.kind)).toEqual(['MISSING']);
  });

  it('does not verify PASS plus SKIPPED', () => {
    const state = stateWith(
      [pass('a'), skipped('b')],
      [
        { requirementId: 'REQ-001', testId: 'a' },
        { requirementId: 'REQ-001', testId: 'b' },
      ],
    );
    const result = requirement(state, 'REQ-001');

    expect(result.status).toBe('UNVERIFIED');
    expect(result.gaps).toEqual([
      { testId: 'b', kind: 'SKIPPED', message: 'Skipped: not applicable' },
    ]);
  });

  it('does not verify PASS plus ERROR', () => {
    const state = stateWith(
      [pass('a'), errored('b')],
      [
        { requirementId: 'REQ-001', testId: 'a' },
        { requirementId: 'REQ-001', testId: 'b' },
      ],
    );
    const result = requirement(state, 'REQ-001');

    expect(result.status).toBe('UNVERIFIED');
    expect(result.gaps).toEqual([
      {
        testId: 'b',
        kind: 'ERROR',
        message: 'Errored during setup or execution: database unavailable',
      },
    ]);
  });

  it('leaves a requirement unverified when it has no links', () => {
    const state = stateWith([pass('a')], []);
    const result = requirement(state, 'REQ-001');

    expect(result.status).toBe('UNVERIFIED');
    expect(result.gaps).toEqual([
      { testId: null, kind: 'NO_LINKED_TESTS', message: 'No linked test evidence.' },
    ]);
  });

  it('does not leave VERIFIED after removing the only passing link', () => {
    const tests = [pass('a')];
    const linked = evaluateLedger(
      stateWith(tests, [{ requirementId: 'REQ-001', testId: 'a' }]),
    ).requirements[0];
    const unlinked = evaluateLedger(stateWith(tests, [])).requirements[0];

    expect(linked?.status).toBe('VERIFIED');
    expect(unlinked?.status).toBe('UNVERIFIED');
  });

  it('evaluates shared checks independently for each requirement', () => {
    const state = stateWith(
      [pass('shared')],
      [
        { requirementId: 'REQ-001', testId: 'shared' },
        { requirementId: 'REQ-002', testId: 'shared' },
      ],
    );

    expect(requirement(state, 'REQ-001').status).toBe('VERIFIED');
    expect(requirement(state, 'REQ-002').status).toBe('VERIFIED');
  });

  it('ignores unlinked passing and failing tests', () => {
    const state = stateWith([pass('passing'), fail('failing')], []);

    expect(evaluateLedger(state).requirements.map((result) => result.status)).toEqual([
      'UNVERIFIED',
      'UNVERIFIED',
      'UNVERIFIED',
    ]);
  });
});
