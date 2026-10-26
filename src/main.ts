import './styles.css';
import { evaluateLedger } from './domain';
import { parseJUnitReport } from './junit';
import type { AppState, Evidence } from './model';
import { SAMPLE_FILENAME, SAMPLE_PROJECT_NAME, SAMPLE_XML } from './sample';
import { createInitialState, replaceEvidence } from './state';
import { renderDashboard } from './ui';

export function startApp(root: HTMLElement): void {
  let state: AppState = createInitialState();
  let error: string | null = null;
  let busy = false;
  let announcement = '';
  const live = liveRegion();

  function render(): void {
    const ledger = evaluateLedger(state);
    renderDashboard(root, {
      state,
      ledger,
      error,
      busy,
      projectName: SAMPLE_PROJECT_NAME,
      onLoadSample: loadSample,
    });

    if (announcement.length > 0) {
      live.textContent = announcement;
      announcement = '';
    }
  }

  function loadSample(): void {
    if (busy) {
      return;
    }
    busy = true;
    error = null;
    render();

    try {
      const parsed = parseJUnitReport(SAMPLE_XML);
      const evidence: Evidence = {
        source: {
          kind: 'synthetic-sample',
          filename: SAMPLE_FILENAME,
          synthetic: true,
        },
        tests: parsed.tests,
      };
      state = replaceEvidence(state, evidence);
      const ledger = evaluateLedger(state);
      announcement = `Sample evidence loaded. ${ledger.summary.verified} verified, ${ledger.summary.failed} failed, ${ledger.summary.unverified} unverified.`;
      busy = false;
      render();
      root.querySelector<HTMLElement>('#ledger-heading')?.focus();
    } catch (caught) {
      busy = false;
      error =
        caught instanceof Error ? caught.message : 'The sample evidence could not be loaded.';
      announcement = 'Sample evidence could not be loaded.';
      render();
    }
  }

  render();
}

function liveRegion(): HTMLElement {
  const existing = document.getElementById('shipproof-live-status');
  if (existing !== null) {
    return existing;
  }
  const live = document.createElement('p');
  live.id = 'shipproof-live-status';
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.append(live);
  return live;
}

const mount = document.querySelector<HTMLElement>('#app');
if (mount !== null) {
  startApp(mount);
}
