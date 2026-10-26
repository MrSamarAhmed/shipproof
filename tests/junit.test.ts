import { describe, expect, it } from 'vitest';
import { JUnitImportError, MAX_JUNIT_BYTES, parseJUnitReport } from '../src/junit';
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

describe('supported structure', () => {
  it('collects cases from suites nested under testsuites', () => {
    const report = parseJUnitReport(
      '<testsuites><testsuite name="outer"><testcase name="a"/>' +
        '<testsuite name="inner"><testcase name="b"/></testsuite>' +
        '</testsuite></testsuites>',
    );

    expect(report.tests.map((test) => test.id)).toEqual(['a', 'b']);
  });

  it('builds stable class-qualified IDs without separator collisions', () => {
    const report = parseJUnitReport(
      '<testsuite name="s">' +
        '<testcase classname="com.example.AuthTest" name="test login"/>' +
        '<testcase name="a::b"/>' +
        '<testcase classname="a" name="b"/>' +
        '</testsuite>',
    );

    expect(report.tests.map((test) => test.id)).toEqual([
      'com.example.AuthTest::test%20login',
      'a%3A%3Ab',
      'a::b',
    ]);
  });

  it('preserves UTF-8 identifiers with stable encoding', () => {
    const report = parseJUnitReport(
      '<testsuite name="s"><testcase name="tést_認証"/></testsuite>',
    );

    expect(report.tests[0]?.id).toBe('t%C3%A9st_%E8%AA%8D%E8%A8%BC');
  });

  it('normalizes skipped and errored cases with their diagnostics', () => {
    const report = parseJUnitReport(
      '<testsuite name="s">' +
        '<testcase name="skip"><skipped message="not ready">environment</skipped></testcase>' +
        '<testcase name="error"><error message="boom">stack detail</error></testcase>' +
        '</testsuite>',
    );

    expect(report.tests[0]).toMatchObject({ outcome: 'SKIPPED' });
    expect(report.tests[0]?.message).toContain('not ready');
    expect(report.tests[0]?.message).toContain('environment');
    expect(report.tests[1]).toMatchObject({ outcome: 'ERROR' });
    expect(report.tests[1]?.message).toContain('boom');
    expect(report.tests[1]?.message).toContain('stack detail');
  });

  it('recognizes the synthetic property only as disclosure', () => {
    const marked = parseJUnitReport(
      '<testsuite name="s"><properties><property name="shipproof.synthetic" value="TRUE"/></properties><testcase name="a"/></testsuite>',
    );
    const unmarked = parseJUnitReport(
      '<testsuite name="s"><properties><property name="shipproof.synthetic" value="false"/></properties><testcase name="a"/></testsuite>',
    );

    expect(marked.synthetic).toBe(true);
    expect(unmarked.synthetic).toBe(false);
  });
});

describe('conservative dialect rejection', () => {
  it('rejects unsupported status and result attributes', () => {
    expect(() =>
      parseJUnitReport('<testsuite name="s"><testcase name="a" status="notrun"/></testsuite>'),
    ).toThrow('Only status="run" is supported.');
    expect(() =>
      parseJUnitReport(
        '<testsuite name="s"><testcase name="a" result="failed"/></testsuite>',
      ),
    ).toThrow('Only result="completed" is supported.');
  });

  it('rejects suite-level failures that cannot be attributed', () => {
    expect(() =>
      parseJUnitReport(
        '<testsuite name="s"><failure message="suite broke"/><testcase name="a"/></testsuite>',
      ),
    ).toThrow('A suite-level failure or error cannot be attributed');
  });

  it('rejects unknown test-case markers', () => {
    expect(() =>
      parseJUnitReport(
        '<testsuite name="s"><testcase name="a"><flakyFailure/></testcase></testsuite>',
      ),
    ).toThrow('Unsupported <flakyFailure> marker');
  });

  it('rejects namespaced reports', () => {
    expect(() =>
      parseJUnitReport(
        '<testsuite xmlns="urn:junit" name="s"><testcase name="a"/></testsuite>',
      ),
    ).toThrow('Namespaced JUnit XML is not supported.');
  });

  it('rejects reports beyond the byte limit', () => {
    const oversized = `<testsuite name="s">${' '.repeat(MAX_JUNIT_BYTES)}</testsuite>`;
    expect(() => parseJUnitReport(oversized)).toThrow('larger than 1 MiB');
  });

  it('rejects reports beyond the test-case limit', () => {
    const cases = Array.from(
      { length: 1_001 },
      (_, index) => `<testcase name="t${index}"/>`,
    ).join('');
    expect(() => parseJUnitReport(`<testsuite name="s">${cases}</testsuite>`)).toThrow(
      'more than 1,000 test cases',
    );
  });
});
