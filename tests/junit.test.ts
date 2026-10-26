import { describe, expect, it } from 'vitest';
import { JUnitImportError, parseJUnitReport } from '../src/junit';
import { SAMPLE_XML } from '../src/sample';

describe('bundled synthetic report', () => {
  it('parses the two stable test IDs, outcomes, and failure message', () => {
    const report = parseJUnitReport(SAMPLE_XML);

    expect(report.synthetic).toBe(true);
    expect(report.tests).toHaveLength(2);
    expect(report.tests[0]).toMatchObject({
      id: 'test_valid_credentials_succeed',
      name: 'test_valid_credentials_succeed',
      classname: null,
      outcome: 'PASS',
      message: null,
    });
    expect(report.tests[1]).toMatchObject({
      id: 'test_invalid_credentials_rejected',
      outcome: 'FAIL',
    });
    expect(report.tests[1]?.message).toContain('Synthetic fixture');
    expect(report.tests[1]?.message).toContain('was not produced by a real test run');
  });
});

describe('parser rejection', () => {
  it('rejects an empty report', () => {
    expect(() => parseJUnitReport('   ')).toThrow('The report is empty.');
  });

  it('rejects malformed XML', () => {
    expect(() => parseJUnitReport('<testsuite><testcase')).toThrow(JUnitImportError);
    expect(() => parseJUnitReport('<testsuite><testcase')).toThrow(
      'The file is not well-formed XML.',
    );
  });

  it('rejects DOCTYPE declarations', () => {
    expect(() =>
      parseJUnitReport(
        '<!DOCTYPE testsuite [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><testsuite name="s"/>',
      ),
    ).toThrow('DOCTYPE and ENTITY declarations are not supported.');
  });

  it('rejects a report with no test cases', () => {
    expect(() => parseJUnitReport('<testsuite name="empty"/>')).toThrow(
      'The report contains no test cases.',
    );
  });

  it('rejects an unsupported root element', () => {
    expect(() => parseJUnitReport('<report><testcase name="a"/></report>')).toThrow(
      'Unsupported root element <report>.',
    );
  });

  it('rejects duplicate canonical IDs even when results are identical', () => {
    expect(() =>
      parseJUnitReport(
        '<testsuite name="s"><testcase name="a"/><testcase name="a"/></testsuite>',
      ),
    ).toThrow('Duplicate canonical test ID "a".');
  });

  it('rejects conflicting outcome markers', () => {
    expect(() =>
      parseJUnitReport(
        '<testsuite name="s"><testcase name="a"><failure/><skipped/></testcase></testsuite>',
      ),
    ).toThrow('has conflicting outcome markers');
  });

  it('rejects a test case without a name', () => {
    expect(() =>
      parseJUnitReport('<testsuite name="s"><testcase classname="A"/></testsuite>'),
    ).toThrow('is missing a nonblank name');
  });
});
