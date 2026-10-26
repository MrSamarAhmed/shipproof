import { describe, expect, it } from 'vitest';
import { evaluateLedger } from '../src/domain';
import { JUnitImportError } from '../src/junit';
import { applyImportedReport, createInitialState } from '../src/state';
import allPassXml from '../fixtures/all-pass.junit.xml?raw';
import gapsXml from '../fixtures/gaps.junit.xml?raw';
import malformedXml from '../fixtures/malformed.junit.xml?raw';

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
