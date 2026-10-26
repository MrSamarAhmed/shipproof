import type { ObservedOutcome, TestResult } from './model';

export interface ParsedJUnitReport {
  readonly tests: readonly TestResult[];
  readonly synthetic: boolean;
}

export class JUnitImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JUnitImportError';
  }
}

export const MAX_JUNIT_BYTES = 1024 * 1024;
const MAX_TEST_CASES = 1_000;
const TESTCASE_METADATA = new Set(['properties', 'system-out', 'system-err']);

export function parseJUnitReport(xmlText: string): ParsedJUnitReport {
  const text = xmlText.trim();
  if (text.length === 0) {
    throw new JUnitImportError('The report is empty.');
  }
  if (new TextEncoder().encode(text).byteLength > MAX_JUNIT_BYTES) {
    throw new JUnitImportError(
      'The report is larger than 1 MiB. ShipProof only accepts small reports for this demo.',
    );
  }
  if (/<!DOCTYPE\b/i.test(text) || /<!ENTITY\b/i.test(text)) {
    throw new JUnitImportError(
      'DOCTYPE and ENTITY declarations are not supported. Remove them and export a plain JUnit XML report.',
    );
  }

  const document = new DOMParser().parseFromString(text, 'application/xml');
  const root = document.documentElement;

  if (
    root === null ||
    root.localName === 'parsererror' ||
    document.getElementsByTagName('parsererror').length > 0
  ) {
    throw new JUnitImportError('The file is not well-formed XML.');
  }
  if (root.namespaceURI !== null) {
    throw new JUnitImportError(
      'Namespaced JUnit XML is not supported. Use a non-namespaced <testsuite> or <testsuites> report.',
    );
  }
  for (const element of Array.from(root.getElementsByTagName('*'))) {
    if (element.namespaceURI !== null) {
      throw new JUnitImportError(
        'Namespaced elements are not supported. Use a non-namespaced JUnit XML report.',
      );
    }
  }
  if (root.localName !== 'testsuite' && root.localName !== 'testsuites') {
    throw new JUnitImportError(
      `Unsupported root element <${root.localName}>. Expected <testsuite> or <testsuites>.`,
    );
  }

  const tests: TestResult[] = [];
  const seenIds = new Set<string>();

  if (root.localName === 'testsuite') {
    collectSuite(root, tests, seenIds);
  } else {
    for (const child of elementChildren(root)) {
      if (child.localName !== 'testsuite') {
        throw new JUnitImportError(
          `Unexpected <${child.localName}> under <testsuites>. Only nested <testsuite> elements are supported.`,
        );
      }
      collectSuite(child, tests, seenIds);
    }
  }

  if (tests.length === 0) {
    throw new JUnitImportError('The report contains no test cases.');
  }

  return { tests, synthetic: hasSyntheticMarker(root) };
}

function collectSuite(suite: Element, tests: TestResult[], seenIds: Set<string>): void {
  for (const child of elementChildren(suite)) {
    switch (child.localName) {
      case 'testcase':
        addTestCase(child, suite, tests, seenIds);
        break;
      case 'testsuite':
        collectSuite(child, tests, seenIds);
        break;
      case 'properties':
      case 'system-out':
      case 'system-err':
        break;
      case 'failure':
      case 'error':
        throw new JUnitImportError(
          'A suite-level failure or error cannot be attributed to a test case.',
        );
      default:
        throw new JUnitImportError(
          `Unsupported <${child.localName}> element inside a test suite.`,
        );
    }
  }
}

function addTestCase(
  testcase: Element,
  suite: Element,
  tests: TestResult[],
  seenIds: Set<string>,
): void {
  if (tests.length >= MAX_TEST_CASES) {
    throw new JUnitImportError(
      'The report contains more than 1,000 test cases, which is beyond this demo limit.',
    );
  }

  const name = testcase.getAttribute('name') ?? '';
  if (name.trim().length === 0) {
    throw new JUnitImportError(
      `A <testcase> in suite "${suiteName(suite)}" is missing a nonblank name.`,
    );
  }

  const rawClassname = testcase.getAttribute('classname');
  const classname =
    rawClassname !== null && rawClassname.trim().length > 0 ? rawClassname : null;
  const id =
    classname === null
      ? encodeURIComponent(name)
      : `${encodeURIComponent(classname)}::${encodeURIComponent(name)}`;

  if (seenIds.has(id)) {
    throw new JUnitImportError(
      `Duplicate canonical test ID "${id}". ShipProof cannot choose between ambiguous results.`,
    );
  }

  const status = testcase.getAttribute('status');
  if (status !== null && status !== 'run') {
    throw new JUnitImportError(
      `Test "${id}" uses unsupported status "${status}". Only status="run" is supported.`,
    );
  }
  const result = testcase.getAttribute('result');
  if (result !== null && result !== 'completed') {
    throw new JUnitImportError(
      `Test "${id}" uses unsupported result "${result}". Only result="completed" is supported.`,
    );
  }

  const failures: Element[] = [];
  const errors: Element[] = [];
  const skipped: Element[] = [];

  for (const child of elementChildren(testcase)) {
    switch (child.localName) {
      case 'failure':
        failures.push(child);
        break;
      case 'error':
        errors.push(child);
        break;
      case 'skipped':
        skipped.push(child);
        break;
      default:
        if (!TESTCASE_METADATA.has(child.localName)) {
          throw new JUnitImportError(
            `Unsupported <${child.localName}> marker inside test case "${id}".`,
          );
        }
    }
  }

  const outcomeKinds = [failures, errors, skipped].filter((nodes) => nodes.length > 0);
  if (outcomeKinds.length > 1) {
    throw new JUnitImportError(
      `Test "${id}" has conflicting outcome markers. ShipProof does not guess a favorable result.`,
    );
  }

  let outcome: ObservedOutcome = 'PASS';
  let message: string | null = null;

  if (failures.length > 0) {
    outcome = 'FAIL';
    message = joinDiagnostics(failures);
  } else if (errors.length > 0) {
    outcome = 'ERROR';
    message = joinDiagnostics(errors);
  } else if (skipped.length > 0) {
    outcome = 'SKIPPED';
    message = joinDiagnostics(skipped);
  }

  tests.push({ id, name, classname, outcome, message });
  seenIds.add(id);
}

function joinDiagnostics(nodes: readonly Element[]): string | null {
  const parts: string[] = [];
  for (const node of nodes) {
    const attribute = (node.getAttribute('message') ?? '').trim();
    const body = (node.textContent ?? '').trim();
    if (attribute.length > 0) parts.push(attribute);
    if (body.length > 0 && body !== attribute) parts.push(body);
  }
  return parts.length === 0 ? null : parts.join('\n');
}

function hasSyntheticMarker(root: Element): boolean {
  for (const property of Array.from(root.getElementsByTagName('property'))) {
    if (
      property.getAttribute('name') === 'shipproof.synthetic' &&
      (property.getAttribute('value') ?? '').toLowerCase() === 'true'
    ) {
      return true;
    }
  }
  return false;
}

function suiteName(suite: Element): string {
  const name = suite.getAttribute('name') ?? '';
  return name.trim().length > 0 ? name : 'unnamed suite';
}

function elementChildren(element: Element): Element[] {
  return Array.from(element.children);
}
