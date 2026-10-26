import { describe, expect, it } from 'vitest';
import { evaluateLedger } from '../src/domain';
import {
  buildReadinessReport,
  SCHEMA_VERSION,
  serializeReadinessReport,
} from '../src/export';
import { parseJUnitReport } from '../src/junit';
import type { AppState } from '../src/model';
import { SAMPLE_FILENAME, SAMPLE_XML } from '../src/sample';
import {
  applyImportedReport,
  createInitialState,
  removeMapping,
  replaceEvidence,
} from '../src/state';
import allPassXml from '../fixtures/all-pass.junit.xml?raw';
import gapsXml from '../fixtures/gaps.junit.xml?raw';
import sampleXml from '../fixtures/sample-auth.junit.xml?raw';

const GENERATED_AT = '2026-10-26T16:30:00.000Z';

function bundledSampleState(): AppState {
  return replaceEvidence(createInitialState(), {
    source: {
      kind: 'synthetic-sample',
      filename: SAMPLE_FILENAME,
      synthetic: true,
    },
    tests: parseJUnitReport(SAMPLE_XML).tests,
  });
}

function importedState(xml: string, filename: string): AppState {
  return applyImportedReport(createInitialState(), xml, filename);
}

describe('readiness report', () => {
  it('rejects export before any evidence is loaded', () => {
    expect(() => buildReadinessReport(createInitialState(), GENERATED_AT)).toThrow(
      'Load test evidence before exporting a readiness report.',
    );
  });

  it('describes the bundled synthetic sample and current summary', () => {
    const state = bundledSampleState();
    const report = buildReadinessReport(state, GENERATED_AT);

    expect(report.metadata).toEqual({
      product: 'ShipProof',
      schemaVersion: SCHEMA_VERSION,
      generatedAt: GENERATED_AT,
      evidenceSource: {
        kind: 'synthetic-sample',
        filename: SAMPLE_FILENAME,
        synthetic: true,
      },
    });
    expect(report.summary).toEqual(evaluateLedger(state).summary);
    expect(report.summary).toMatchObject({
      totalRequirements: 3,
      verified: 1,
      failed: 1,
      unverified: 1,
    });
    expect(report.provenance.limitations[3]).toContain(
      'not a real test run',
    );
  });

  it('carries linked checks, failure messages, and gaps without alteration', () => {
    const state = bundledSampleState();
    const ledger = evaluateLedger(state);
    const report = buildReadinessReport(state, GENERATED_AT);

    expect(report.requirements).toEqual(ledger.requirements);
    const invalidCredentials = report.requirements.find(
      (result) => result.id === 'REQ-002',
    );
    expect(invalidCredentials).toMatchObject({
      status: 'FAILED',
      verificationRule: 'all-linked-checks-pass',
      linkedTestIds: ['test_invalid_credentials_rejected'],
    });
    expect(invalidCredentials?.checks[0]?.outcome).toBe('FAIL');
    expect(invalidCredentials?.checks[0]?.message).toContain(
      'Synthetic fixture: expected HTTP 401',
    );

    const rateLimiting = report.requirements.find(
      (result) => result.id === 'REQ-003',
    );
    expect(rateLimiting?.gaps).toEqual([
      {
        testId: null,
        kind: 'NO_LINKED_TESTS',
        message: 'No linked test evidence.',
      },
    ]);
  });

  it('preserves missing and skipped evidence gaps from an imported report', () => {
    const state = importedState(gapsXml, 'gaps.junit.xml');
    const report = buildReadinessReport(state, GENERATED_AT);
    const invalidCredentials = report.requirements.find(
      (result) => result.id === 'REQ-002',
    );

    expect(invalidCredentials?.status).toBe('UNVERIFIED');
    expect(invalidCredentials?.checks).toEqual([
      {
        testId: 'test_invalid_credentials_rejected',
        outcome: 'MISSING',
        message:
          'Test "test_invalid_credentials_rejected" was not found in the current report.',
      },
    ]);
    expect(invalidCredentials?.gaps[0]).toMatchObject({
      testId: 'test_invalid_credentials_rejected',
      kind: 'MISSING',
    });
  });

  it('distinguishes an imported report with an unknown authenticity from a declared synthetic one', () => {
    const undeclared = importedState(
      '<testsuite name="s"><testcase name="test_one"/></testsuite>',
      'plain.xml',
    );
    const undeclaredReport = buildReadinessReport(undeclared, GENERATED_AT);

    expect(undeclaredReport.metadata.evidenceSource).toEqual({
      kind: 'imported-junit',
      filename: 'plain.xml',
      synthetic: null,
    });
    expect(
      undeclaredReport.provenance.limitations.some((line) =>
        line.includes('not a real test run'),
      ),
    ).toBe(false);

    const declared = importedState(sampleXml, 'sample-auth.junit.xml');
    const declaredReport = buildReadinessReport(declared, GENERATED_AT);

    expect(declaredReport.metadata.evidenceSource).toEqual({
      kind: 'imported-junit',
      filename: 'sample-auth.junit.xml',
      synthetic: true,
    });
    expect(
      declaredReport.provenance.limitations.some((line) =>
        line.includes('not a real test run'),
      ),
    ).toBe(true);
    expect(declaredReport.provenance.method).toContain(
      'all linked checks must pass',
    );
  });

  it('reflects mapping changes instead of hard-coded sample output', () => {
    const sample = importedState(sampleXml, 'sample-auth.junit.xml');
    const changed = removeMapping(
      sample,
      'REQ-001',
      'test_valid_credentials_succeed',
    );
    const report = buildReadinessReport(changed, GENERATED_AT);
    const authentication = report.requirements.find(
      (result) => result.id === 'REQ-001',
    );

    expect(report.summary.verified).toBe(0);
    expect(report.summary.unverified).toBe(2);
    expect(authentication).toMatchObject({
      status: 'UNVERIFIED',
      linkedTestIds: [],
      checks: [],
    });
    expect(authentication?.gaps[0]?.kind).toBe('NO_LINKED_TESTS');
  });

  it('serializes indented, valid JSON whose content matches the report', () => {
    const state = importedState(allPassXml, 'all-pass.junit.xml');
    const text = serializeReadinessReport(state, GENERATED_AT);

    expect(text.startsWith('{\n  "metadata": {')).toBe(true);
    const parsed: unknown = JSON.parse(text);
    expect(parsed).toEqual(buildReadinessReport(state, GENERATED_AT));
    expect(text).toContain(`"schemaVersion": "${SCHEMA_VERSION}"`);
  });
});
