import { describe, expect, it } from 'vitest';
import { evaluateLedger } from '../src/domain';
import { JUnitImportError } from '../src/junit';
import {
  addMapping,
  applyImportedReport,
  createInitialState,
  removeMapping,
} from '../src/state';
import type { AppState, Status } from '../src/model';
import allPassXml from '../fixtures/all-pass.junit.xml?raw';
import gapsXml from '../fixtures/gaps.junit.xml?raw';
import malformedXml from '../fixtures/malformed.junit.xml?raw';
import sampleXml from '../fixtures/sample-auth.junit.xml?raw';

describe('import replacement', () => {
  it('replaces evidence and preserves explicit mappings', () => {
    const initial = createInitialState();
    const imported = applyImportedReport(initial, allPassXml, 'all-pass.junit.xml');

    expect(imported.mappings).toEqual(initial.mappings);
    expect(imported.evidence?.source).toEqual({
      kind: 'imported-junit',
      filename: 'all-pass.junit.xml',
      synthetic: true,
    });
    expect(
      evaluateLedger(imported).requirements.map((result) => result.status),
    ).toEqual(['VERIFIED', 'VERIFIED', 'UNVERIFIED']);
  });

  it('marks a mapped test absent from the new report as MISSING', () => {
    const imported = applyImportedReport(
      createInitialState(),
      gapsXml,
      'gaps.junit.xml',
    );
    const ledger = evaluateLedger(imported);
    const invalidCredentials = ledger.requirements.find(
      (result) => result.id === 'REQ-002',
    );

    expect(invalidCredentials?.status).toBe('UNVERIFIED');
    expect(invalidCredentials?.linkedTestIds).toEqual([
      'test_invalid_credentials_rejected',
    ]);
    expect(invalidCredentials?.checks).toEqual([
      {
        testId: 'test_invalid_credentials_rejected',
        outcome: 'MISSING',
        message:
          'Test "test_invalid_credentials_rejected" was not found in the current report.',
      },
    ]);
  });

  it('reports an unknown authenticity as null when no synthetic marker exists', () => {
    const imported = applyImportedReport(
      createInitialState(),
      '<testsuite name="s"><testcase name="test_valid_credentials_succeed"/></testsuite>',
      'plain.xml',
    );

    expect(imported.evidence?.source).toEqual({
      kind: 'imported-junit',
      filename: 'plain.xml',
      synthetic: null,
    });
  });

  it('leaves the previous valid state untouched when parsing fails', () => {
    const prior = applyImportedReport(
      createInitialState(),
      allPassXml,
      'all-pass.junit.xml',
    );
    const priorStatuses = evaluateLedger(prior).requirements.map(
      (result) => result.status,
    );

    expect(() => applyImportedReport(prior, malformedXml, 'malformed.junit.xml')).toThrow(
      JUnitImportError,
    );
    expect(prior.evidence?.source.filename).toBe('all-pass.junit.xml');
    expect(evaluateLedger(prior).requirements.map((result) => result.status)).toEqual(
      priorStatuses,
    );
    expect(createInitialState().evidence).toBeNull();
  });
});

function statusOf(state: AppState, requirementId: string): Status | undefined {
  return evaluateLedger(state).requirements.find(
    (result) => result.id === requirementId,
  )?.status;
}

function sampleState(): AppState {
  return applyImportedReport(
    createInitialState(),
    sampleXml,
    'sample-auth.junit.xml',
  );
}

describe('mapping changes', () => {
  it('turns a verified requirement unverified when its only passing link is removed', () => {
    const sample = sampleState();
    expect(statusOf(sample, 'REQ-001')).toBe('VERIFIED');

    const without = removeMapping(
      sample,
      'REQ-001',
      'test_valid_credentials_succeed',
    );

    expect(statusOf(without, 'REQ-001')).toBe('UNVERIFIED');
    expect(
      evaluateLedger(without).requirements.find((r) => r.id === 'REQ-001')
        ?.gaps,
    ).toEqual([
      {
        testId: null,
        kind: 'NO_LINKED_TESTS',
        message: 'No linked test evidence.',
      },
    ]);

    const restored = addMapping(
      without,
      'REQ-001',
      'test_valid_credentials_succeed',
    );
    expect(statusOf(restored, 'REQ-001')).toBe('VERIFIED');
  });

  it('marks a verified requirement failed when a linked test fails', () => {
    const sample = sampleState();
    const withFailure = addMapping(
      sample,
      'REQ-001',
      'test_invalid_credentials_rejected',
    );

    expect(statusOf(withFailure, 'REQ-001')).toBe('FAILED');
    expect(statusOf(withFailure, 'REQ-002')).toBe('FAILED');
  });

  it('allows a shared test and evaluates each requirement independently', () => {
    const shared = addMapping(
      sampleState(),
      'REQ-003',
      'test_valid_credentials_succeed',
    );

    expect(statusOf(shared, 'REQ-001')).toBe('VERIFIED');
    expect(statusOf(shared, 'REQ-003')).toBe('VERIFIED');
    expect(
      shared.mappings.filter(
        (mapping) => mapping.testId === 'test_valid_credentials_succeed',
      ),
    ).toHaveLength(2);

    const unshared = removeMapping(
      shared,
      'REQ-003',
      'test_valid_credentials_succeed',
    );
    expect(statusOf(unshared, 'REQ-003')).toBe('UNVERIFIED');
    expect(statusOf(unshared, 'REQ-001')).toBe('VERIFIED');
  });

  it('rejects duplicate pairs, unknown requirements, and tests outside the report', () => {
    const sample = sampleState();

    expect(() =>
      addMapping(sample, 'REQ-001', 'test_valid_credentials_succeed'),
    ).toThrow('already linked');
    expect(() =>
      addMapping(sample, 'REQ-999', 'test_valid_credentials_succeed'),
    ).toThrow('Unknown requirement');
    expect(() => addMapping(sample, 'REQ-003', 'unknown_test')).toThrow(
      'is not in the current report',
    );
    expect(() =>
      addMapping(
        createInitialState(),
        'REQ-001',
        'test_valid_credentials_succeed',
      ),
    ).toThrow('Load test evidence before linking tests.');
  });

  it('keeps a missing link removable while preserving the other mappings', () => {
    const imported = applyImportedReport(
      createInitialState(),
      gapsXml,
      'gaps.junit.xml',
    );
    expect(statusOf(imported, 'REQ-002')).toBe('UNVERIFIED');

    const removed = removeMapping(
      imported,
      'REQ-002',
      'test_invalid_credentials_rejected',
    );

    expect(removed.mappings).toEqual([
      {
        requirementId: 'REQ-001',
        testId: 'test_valid_credentials_succeed',
      },
    ]);
    expect(statusOf(removed, 'REQ-002')).toBe('UNVERIFIED');
  });
});
