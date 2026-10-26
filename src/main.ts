import './styles.css';
import { evaluateLedger } from './domain';
import { MAX_JUNIT_BYTES, parseJUnitReport } from './junit';
import type { AppState, Evidence } from './model';
import { SAMPLE_FILENAME, SAMPLE_PROJECT_NAME, SAMPLE_XML } from './sample';
import { applyImportedReport, createInitialState, replaceEvidence } from './state';
import { renderDashboard, type BusyAction } from './ui';

export function startApp(root: HTMLElement): void {
  let state: AppState = createInitialState();
  let error: string | null = null;
  let busyAction: BusyAction | null = null;
  let announcement = '';
  const live = liveRegion();

  function render(): void {
    const ledger = evaluateLedger(state);
    renderDashboard(root, {
      state,
      ledger,
      error,
      busyAction,
      projectName: SAMPLE_PROJECT_NAME,
      onLoadSample: loadSample,
      onImportFile: (file) => {
        void importFile(file);
      },
    });

    if (announcement.length > 0) {
      live.textContent = announcement;
      announcement = '';
    }
  }

  function focusHeading(): void {
    root.querySelector<HTMLElement>('#ledger-heading')?.focus();
  }

  function focusAlert(): void {
    root.querySelector<HTMLElement>('.alert')?.focus();
  }

  function loadSample(): void {
    if (busyAction !== null) {
      return;
    }
    busyAction = 'sample';
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
      busyAction = null;
      render();
      focusHeading();
    } catch (caught) {
      busyAction = null;
      error =
        caught instanceof Error ? caught.message : 'The sample evidence could not be loaded.';
      announcement = 'Sample evidence could not be loaded.';
      render();
      focusAlert();
    }
  }

  async function importFile(file: File): Promise<void> {
    if (busyAction !== null) {
      return;
    }
    busyAction = 'import';
    error = null;
    render();

    try {
      if (file.size > MAX_JUNIT_BYTES) {
        throw new Error(
          'The report is larger than 1 MiB. ShipProof only accepts small reports for this demo.',
        );
      }
      const text = await file.text();
      state = applyImportedReport(state, text, file.name);
      const ledger = evaluateLedger(state);
      const origin =
        state.evidence?.source.synthetic === true
          ? 'Synthetic imported evidence'
          : 'Imported evidence';
      announcement = `${origin} loaded from ${file.name}. ${ledger.summary.verified} verified, ${ledger.summary.failed} failed, ${ledger.summary.unverified} unverified.`;
      busyAction = null;
      render();
      focusHeading();
    } catch (caught) {
      busyAction = null;
      error =
        caught instanceof Error ? caught.message : 'The JUnit XML report could not be imported.';
      announcement = `Import failed. ${error}`;
      render();
      focusAlert();
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
