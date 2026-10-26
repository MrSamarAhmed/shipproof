import { describe, expect, it } from 'vitest';
import allPassXml from '../fixtures/all-pass.junit.xml?raw';
import gapsXml from '../fixtures/gaps.junit.xml?raw';
import malformedXml from '../fixtures/malformed.junit.xml?raw';
import { startApp } from '../src/main';

function mount(): HTMLElement {
  document.body.replaceChildren();
  const root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
  startApp(root);
  return root;
}

function statusTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('.requirement .status')).map(
    (node) => node.textContent ?? '',
  );
}

function countValue(root: HTMLElement, status: string): string {
  return root.querySelector(`.count-${status} dd`)?.textContent ?? '';
}

async function waitFor(check: () => boolean, attempts = 40): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for the expected UI state.');
}

function chooseFile(root: HTMLElement, file: File): void {
  const input = root.querySelector<HTMLInputElement>('input[type=file]');
  if (input === null) {
    throw new Error('File input not found.');
  }
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('empty dashboard', () => {
  it('shows the exact empty-state message and three unverified requirements', () => {
    const root = mount();

    expect(root.textContent).toContain(
      'No evidence loaded yet. ShipProof cannot verify completion claims without supporting test results.',
    );
    expect(statusTexts(root)).toEqual(['UNVERIFIED', 'UNVERIFIED', 'UNVERIFIED']);
    expect(root.querySelectorAll('.outcome')).toHaveLength(0);
    expect(root.querySelectorAll('.message')).toHaveLength(0);
    expect(root.textContent).toContain('Total requirements: 3');
    expect(countValue(root, 'verified')).toBe('0');
    expect(countValue(root, 'failed')).toBe('0');
    expect(countValue(root, 'unverified')).toBe('3');
    expect(root.textContent).toContain('No linked test evidence.');
    expect(root.querySelector('button')?.textContent).toBe('Load sample evidence');
    expect(root.querySelector('input[type=file]')).not.toBeNull();
  });
});

describe('sample load', () => {
  it('shows one verified, one failed, and one unverified requirement', () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>('button')?.click();

    expect(statusTexts(root)).toEqual(['VERIFIED', 'FAILED', 'UNVERIFIED']);
    expect(countValue(root, 'verified')).toBe('1');
    expect(countValue(root, 'failed')).toBe('1');
    expect(countValue(root, 'unverified')).toBe('1');
    expect(root.textContent).toContain(
      'Synthetic sample evidence — not a real test run',
    );
    expect(root.textContent).toContain('sample-auth.junit.xml');
    expect(root.textContent).toContain('Synthetic fixture: expected HTTP 401');
    expect(root.textContent).toContain('Assertion failure');
    expect(root.textContent).toContain('No linked test evidence.');
    expect(root.textContent).not.toContain('No evidence loaded yet.');
  });

  it('moves focus to the ledger heading after loading', () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>('button')?.click();

    expect(document.activeElement?.id).toBe('ledger-heading');
  });

  it('announces the loaded counts', () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>('button')?.click();

    expect(document.getElementById('shipproof-live-status')?.textContent).toBe(
      'Sample evidence loaded. 1 verified, 1 failed, 1 unverified.',
    );
  });

  it('produces the same sample statuses on a repeated run', () => {
    const first = mount();
    first.querySelector<HTMLButtonElement>('button')?.click();
    const firstStatuses = statusTexts(first);

    const second = mount();
    second.querySelector<HTMLButtonElement>('button')?.click();

    expect(statusTexts(second)).toEqual(firstStatuses);
  });
});

describe('JUnit import', () => {
  it('imports a valid report, replaces the source, and preserves mappings', async () => {
    const root = mount();

    chooseFile(
      root,
      new File([allPassXml], 'all-pass.junit.xml', { type: 'application/xml' }),
    );

    await waitFor(() => statusTexts(root).join(',') === 'VERIFIED,VERIFIED,UNVERIFIED');
    expect(root.textContent).toContain('Imported evidence — declared synthetic');
    expect(root.textContent).toContain('all-pass.junit.xml');
    expect(countValue(root, 'verified')).toBe('2');
    expect(countValue(root, 'failed')).toBe('0');
    expect(countValue(root, 'unverified')).toBe('1');
    expect(root.querySelector('button')).toBeNull();
  });

  it('shows a missing mapped test after importing a report without it', async () => {
    const root = mount();

    chooseFile(root, new File([gapsXml], 'gaps.junit.xml', { type: 'application/xml' }));

    await waitFor(() => statusTexts(root).join(',') === 'VERIFIED,UNVERIFIED,UNVERIFIED');
    const requirements = Array.from(root.querySelectorAll('.requirement'));
    const invalidCredentials = requirements[1];

    expect(invalidCredentials?.textContent).toContain(
      'test_invalid_credentials_rejected',
    );
    expect(invalidCredentials?.textContent).toContain('MISSING');
    expect(invalidCredentials?.textContent).toContain('was not found in the current report');
    expect(invalidCredentials?.textContent).toContain('Evidence gaps');
  });

  it('keeps the last valid evidence and source after a malformed import', async () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>('button')?.click();
    const priorStatuses = statusTexts(root);

    chooseFile(
      root,
      new File([malformedXml], 'malformed.junit.xml', { type: 'application/xml' }),
    );

    await waitFor(() => root.querySelector('.alert') !== null);
    expect(statusTexts(root)).toEqual(priorStatuses);
    expect(root.textContent).toContain('Synthetic sample evidence');
    expect(root.textContent).toContain('sample-auth.junit.xml');
    expect(root.querySelector('.alert')?.textContent).toContain(
      'The file is not well-formed XML.',
    );
    expect(document.activeElement?.className).toBe('alert');
    expect(root.querySelector<HTMLInputElement>('input[type=file]')?.value).toBe('');
  });

  it('disables actions while a report is being read and keeps the prior view', async () => {
    const root = mount();
    root.querySelector<HTMLButtonElement>('button')?.click();
    const priorStatuses = statusTexts(root);

    let resolveText: ((text: string) => void) | undefined;
    const slowFile = new File([''], 'slow.xml', { type: 'application/xml' });
    Object.defineProperty(slowFile, 'text', {
      configurable: true,
      value: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve;
        }),
    });

    chooseFile(root, slowFile);
    await waitFor(() => root.querySelector<HTMLInputElement>('input[type=file]')?.disabled === true);
    await waitFor(() => typeof resolveText === 'function');

    expect(root.textContent).toContain(
      'Reading and validating the selected JUnit XML report.',
    );
    expect(statusTexts(root)).toEqual(priorStatuses);
    expect(root.querySelector('.file-button')?.getAttribute('aria-disabled')).toBe('true');

    resolveText?.(allPassXml);
    await waitFor(() => statusTexts(root).join(',') === 'VERIFIED,VERIFIED,UNVERIFIED');
  });

  it('renders hostile diagnostic text as plain text, never as markup', async () => {
    const root = mount();
    const hostile =
      '<testsuite name="s"><testcase name="test_invalid_credentials_rejected">' +
      '<failure message="&lt;img src=x onerror=alert(1)&gt;">' +
      '&lt;script&gt;alert(1)&lt;/script&gt;' +
      '</failure></testcase></testsuite>';

    chooseFile(root, new File([hostile], 'hostile.xml', { type: 'application/xml' }));

    await waitFor(() => statusTexts(root).join(',') === 'UNVERIFIED,FAILED,UNVERIFIED');
    const requirements = Array.from(root.querySelectorAll('.requirement'));
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelector('img')).toBeNull();
    expect(requirements[1]?.querySelector('.message')?.textContent).toContain(
      '<script>alert(1)</script>',
    );
  });
});
