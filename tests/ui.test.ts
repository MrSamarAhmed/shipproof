import { describe, expect, it } from 'vitest';
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
