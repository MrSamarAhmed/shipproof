import { describe, expect, it, vi } from 'vitest';
import allPassXml from '../fixtures/all-pass.junit.xml?raw';
import gapsXml from '../fixtures/gaps.junit.xml?raw';
import malformedXml from '../fixtures/malformed.junit.xml?raw';
import type { ReadinessReport } from '../src/export';
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

function loadSample(root: HTMLElement): void {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
    (node) => node.textContent === 'Load sample evidence',
  );
  if (button === undefined) {
    throw new Error('Load sample button not found.');
  }
  button.click();
}

function requirement(root: HTMLElement, id: string): HTMLElement {
  const article = Array.from(
    root.querySelectorAll<HTMLElement>('.requirement'),
  ).find((node) => node.querySelector('.requirement-id')?.textContent === id);
  if (article === undefined) {
    throw new Error(`Requirement ${id} not found.`);
  }
  return article;
}

function openMapper(root: HTMLElement, id: string): HTMLElement {
  const toggle = requirement(root, id).querySelector<HTMLButtonElement>(
    '.mapper-toggle',
  );
  if (toggle === null) {
    throw new Error(`Mapper toggle for ${id} not found.`);
  }
  toggle.click();
  return requirement(root, id);
}

function mapperSelect(article: HTMLElement): HTMLSelectElement {
  const select = article.querySelector<HTMLSelectElement>('.mapper-panel select');
  if (select === null) {
    throw new Error('Mapper select not found.');
  }
  return select;
}

function addLink(root: HTMLElement, id: string, testId: string): void {
  const select = mapperSelect(requirement(root, id));
  select.value = testId;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  const addButton = Array.from(
    requirement(root, id).querySelectorAll<HTMLButtonElement>('.mapper-panel button'),
  ).find((node) => node.textContent === 'Add link');
  if (addButton === undefined) {
    throw new Error('Add link button not found.');
  }
  addButton.click();
}

function removeLink(root: HTMLElement, id: string, testId: string): void {
  const button = requirement(root, id).querySelector<HTMLButtonElement>(
    `button[aria-label="Remove link to ${testId} from ${id}"]`,
  );
  if (button === null) {
    throw new Error(`Remove button for ${testId} not found.`);
  }
  button.click();
}

function exportButton(root: HTMLElement): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(
    '[data-focus-key="export-report"]',
  );
  if (button === null) {
    throw new Error('Export button not found.');
  }
  return button;
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
    expect(
      Array.from(root.querySelectorAll('button')).some(
        (node) => node.textContent === 'Load sample evidence',
      ),
    ).toBe(false);
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
    loadSample(root);
    openMapper(root, 'REQ-001');
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

    const mapper = requirement(root, 'REQ-001');
    expect(mapper.querySelector<HTMLButtonElement>('.mapper-toggle')?.disabled).toBe(true);
    expect(mapper.querySelector<HTMLSelectElement>('.select')?.disabled).toBe(true);
    expect(
      mapper.querySelector<HTMLButtonElement>('button[aria-label^="Remove link"]')
        ?.disabled,
    ).toBe(true);
    expect(mapper.textContent).toContain(
      'Mapping is unavailable while a report is being read.',
    );

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

describe('manual mapper', () => {
  it('is unavailable before evidence is loaded', () => {
    const root = mount();

    expect(root.querySelector('.mapper-toggle')).toBeNull();
    expect(root.querySelector('.mapper-panel')).toBeNull();
  });

  it('recomputes a status when the only passing link is removed and restored', () => {
    const root = mount();
    loadSample(root);
    openMapper(root, 'REQ-001');

    expect(
      requirement(root, 'REQ-001')
        .querySelector('.mapper-toggle')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');

    removeLink(root, 'REQ-001', 'test_valid_credentials_succeed');

    expect(statusTexts(root)).toEqual(['UNVERIFIED', 'FAILED', 'UNVERIFIED']);
    expect(countValue(root, 'verified')).toBe('0');
    expect(countValue(root, 'unverified')).toBe('2');
    expect(requirement(root, 'REQ-001').textContent).toContain(
      'No linked test evidence.',
    );
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe(
      'mapper-toggle-REQ-001',
    );
    expect(
      document.getElementById('shipproof-live-status')?.textContent,
    ).toContain('REQ-001 is now UNVERIFIED');

    addLink(root, 'REQ-001', 'test_valid_credentials_succeed');

    expect(statusTexts(root)).toEqual(['VERIFIED', 'FAILED', 'UNVERIFIED']);
    expect(countValue(root, 'verified')).toBe('1');
    expect(requirement(root, 'REQ-001').querySelector('.outcome')?.textContent).toBe(
      'PASS',
    );
  });

  it('marks a requirement failed when a linked test fails', () => {
    const root = mount();
    loadSample(root);
    openMapper(root, 'REQ-003');

    addLink(root, 'REQ-003', 'test_invalid_credentials_rejected');

    expect(statusTexts(root)).toEqual(['VERIFIED', 'FAILED', 'FAILED']);
    expect(countValue(root, 'failed')).toBe('2');
    expect(requirement(root, 'REQ-003').textContent).toContain(
      'Synthetic fixture: expected HTTP 401',
    );
    expect(
      document.getElementById('shipproof-live-status')?.textContent,
    ).toContain('REQ-003 is now FAILED');
  });

  it('offers only tests that are not already linked to the requirement', () => {
    const root = mount();
    loadSample(root);
    const article = openMapper(root, 'REQ-001');
    const select = mapperSelect(article);
    const values = Array.from(select.options).map((option) => option.value);

    expect(values).not.toContain('test_valid_credentials_succeed');
    expect(values).toContain('test_invalid_credentials_rejected');

    const addButton = Array.from(
      article.querySelectorAll<HTMLButtonElement>('.mapper-panel button'),
    ).find((node) => node.textContent === 'Add link');
    expect(addButton?.disabled).toBe(true);

    select.value = 'test_invalid_credentials_rejected';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(addButton?.disabled).toBe(false);
  });

  it('shows a shared test in every requirement that links it', () => {
    const root = mount();
    loadSample(root);
    openMapper(root, 'REQ-003');
    addLink(root, 'REQ-003', 'test_valid_credentials_succeed');

    expect(statusTexts(root)).toEqual(['VERIFIED', 'FAILED', 'VERIFIED']);
    expect(requirement(root, 'REQ-003').textContent).toContain(
      'Also linked to REQ-001.',
    );

    openMapper(root, 'REQ-001');

    expect(requirement(root, 'REQ-001').textContent).toContain(
      'Also linked to REQ-003.',
    );
  });

  it('keeps a missing link visible across imports and allows removing it', async () => {
    const root = mount();

    chooseFile(root, new File([gapsXml], 'gaps.junit.xml', { type: 'application/xml' }));
    await waitFor(() => statusTexts(root).join(',') === 'VERIFIED,UNVERIFIED,UNVERIFIED');
    openMapper(root, 'REQ-002');

    expect(requirement(root, 'REQ-002').textContent).toContain(
      'Not found in the current report. The link is preserved until you remove it.',
    );

    chooseFile(
      root,
      new File([allPassXml], 'all-pass.junit.xml', { type: 'application/xml' }),
    );
    await waitFor(() => statusTexts(root).join(',') === 'VERIFIED,VERIFIED,UNVERIFIED');
    expect(requirement(root, 'REQ-002').textContent).toContain(
      'test_invalid_credentials_rejected',
    );
    expect(requirement(root, 'REQ-002').querySelector('.outcome')?.textContent).toBe(
      'PASS',
    );

    removeLink(root, 'REQ-002', 'test_invalid_credentials_rejected');

    expect(statusTexts(root)).toEqual(['VERIFIED', 'UNVERIFIED', 'UNVERIFIED']);
    expect(countValue(root, 'verified')).toBe('1');
  });
});

describe('JSON export', () => {
  it('stays disabled with a visible explanation until evidence is loaded', () => {
    const root = mount();
    const disabled = exportButton(root);

    expect(disabled.disabled).toBe(true);
    expect(disabled.getAttribute('aria-describedby')).toBe('export-note');
    expect(root.textContent).toContain('Load evidence to enable the JSON export.');

    loadSample(root);
    const enabled = exportButton(root);

    expect(enabled.disabled).toBe(false);
    expect(enabled.hasAttribute('aria-describedby')).toBe(false);
    expect(root.textContent).not.toContain(
      'Load evidence to enable the JSON export.',
    );
  });

  it('requests a download of the current state and reports it honestly', async () => {
    const root = mount();
    loadSample(root);

    const urlApi = URL as unknown as {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    const originalCreate = urlApi.createObjectURL;
    const originalRevoke = urlApi.revokeObjectURL;
    let downloadName = '';
    let blobText = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });
    urlApi.createObjectURL = (blob) => {
      void blob.text().then((text) => {
        blobText = text;
      });
      return 'blob:shipproof-test';
    };
    urlApi.revokeObjectURL = () => {};

    try {
      exportButton(root).click();
      await waitFor(() => blobText.length > 0);
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      clickSpy.mockRestore();
      if (originalCreate === undefined) {
        delete urlApi.createObjectURL;
      } else {
        urlApi.createObjectURL = originalCreate;
      }
      if (originalRevoke === undefined) {
        delete urlApi.revokeObjectURL;
      } else {
        urlApi.revokeObjectURL = originalRevoke;
      }
    }

    expect(downloadName).toBe('shipproof-readiness-report.json');
    const report = JSON.parse(blobText) as ReadinessReport;
    expect(report.metadata.schemaVersion).toBe('1.0');
    expect(report.metadata.evidenceSource).toEqual({
      kind: 'synthetic-sample',
      filename: 'sample-auth.junit.xml',
      synthetic: true,
    });
    expect(report.summary).toMatchObject({
      totalRequirements: 3,
      verified: 1,
      failed: 1,
      unverified: 1,
    });
    expect(root.textContent).toContain(
      'Download requested: shipproof-readiness-report.json',
    );
    expect(document.getElementById('shipproof-live-status')?.textContent).toBe(
      'Download requested: shipproof-readiness-report.json',
    );
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe(
      'export-report',
    );
  });

  it('shows an inline error when the download cannot be started', () => {
    const root = mount();
    loadSample(root);

    const urlApi = URL as unknown as {
      createObjectURL?: (blob: Blob) => string;
    };
    const originalCreate = urlApi.createObjectURL;
    urlApi.createObjectURL = () => {
      throw new Error('Blob URLs are unavailable.');
    };

    try {
      exportButton(root).click();
    } finally {
      if (originalCreate === undefined) {
        delete urlApi.createObjectURL;
      } else {
        urlApi.createObjectURL = originalCreate;
      }
    }

    expect(root.querySelector('.export-feedback.is-error')?.textContent).toBe(
      'Blob URLs are unavailable.',
    );
    expect(document.getElementById('shipproof-live-status')?.textContent).toContain(
      'Export failed.',
    );
    expect(exportButton(root).disabled).toBe(false);
    expect(document.activeElement?.getAttribute('data-focus-key')).toBe(
      'export-report',
    );
  });
});
