import './styles.css';
import { evaluateLedger } from './domain';
import { EXPORT_FILENAME, serializeReadinessReport } from './export';
import { MAX_JUNIT_BYTES, parseJUnitReport } from './junit';
import type { AppState, Evidence } from './model';
import { SAMPLE_FILENAME, SAMPLE_PROJECT_NAME, SAMPLE_XML } from './sample';
import {
  addMapping,
  applyImportedReport,
  createInitialState,
  removeMapping,
  replaceEvidence,
} from './state';
import {
  renderDashboard,
  type BusyAction,
  type ExportFeedback,
} from './ui';

export function startApp(root: HTMLElement): void {
  let state: AppState = createInitialState();
  let error: string | null = null;
  let busyAction: BusyAction | null = null;
  let openMapperId: string | null = null;
  let exportFeedback: ExportFeedback | null = null;
  let pendingFocus: string | null = null;
  let announcement = '';
  const live = liveRegion();

  function render(): void {
    const ledger = evaluateLedger(state);
    renderDashboard(root, {
      state,
      ledger,
      error,
      busyAction,
      openMapperId,
      exportFeedback,
      projectName: SAMPLE_PROJECT_NAME,
      onLoadSample: loadSample,
      onImportFile: (file) => {
        void importFile(file);
      },
      onExport: exportReport,
      onToggleMapper: toggleMapper,
      onAddMapping: linkTest,
      onRemoveMapping: unlinkTest,
    });

    if (pendingFocus !== null) {
      const key = pendingFocus;
      pendingFocus = null;
      focusByKey(key);
    }

    if (announcement.length > 0) {
      live.textContent = announcement;
      announcement = '';
    }
  }

  function focusByKey(key: string): void {
    const target = Array.from(
      root.querySelectorAll<HTMLElement>('[data-focus-key]'),
    ).find((node) => node.dataset.focusKey === key);
    target?.focus();
  }

  function exportReport(): void {
    if (state.evidence === null || busyAction !== null) {
      return;
    }

    try {
      const json = serializeReadinessReport(state, new Date().toISOString());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = EXPORT_FILENAME;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      exportFeedback = {
        message: `Download requested: ${EXPORT_FILENAME}`,
        error: false,
      };
      announcement = `Download requested: ${EXPORT_FILENAME}`;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'The readiness report could not be generated.';
      exportFeedback = { message, error: true };
      announcement = `Export failed. ${message}`;
    }

    pendingFocus = 'export-report';
    render();
  }

  function toggleMapper(requirementId: string): void {
    openMapperId = openMapperId === requirementId ? null : requirementId;
    pendingFocus = `mapper-toggle-${requirementId}`;
    render();
  }

  function linkTest(requirementId: string, testId: string): void {
    try {
      state = addMapping(state, requirementId, testId);
    } catch (caught) {
      error =
        caught instanceof Error ? caught.message : 'The test link could not be added.';
      announcement = `Link not added. ${error}`;
      render();
      focusAlert();
      return;
    }

    error = null;
    exportFeedback = null;
    const ledger = evaluateLedger(state);
    const status = ledger.requirements.find((item) => item.id === requirementId)?.status;
    announcement = `Linked ${testId} to ${requirementId}. ${requirementId} is now ${status}. ${ledger.summary.verified} verified, ${ledger.summary.failed} failed, ${ledger.summary.unverified} unverified.`;
    pendingFocus = `mapper-toggle-${requirementId}`;
    render();
  }

  function unlinkTest(requirementId: string, testId: string): void {
    state = removeMapping(state, requirementId, testId);
    error = null;
    exportFeedback = null;
    const ledger = evaluateLedger(state);
    const status = ledger.requirements.find((item) => item.id === requirementId)?.status;
    announcement = `Removed the link from ${testId} to ${requirementId}. ${requirementId} is now ${status}. ${ledger.summary.verified} verified, ${ledger.summary.failed} failed, ${ledger.summary.unverified} unverified.`;
    pendingFocus = `mapper-toggle-${requirementId}`;
    render();
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
    exportFeedback = null;
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
    exportFeedback = null;
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
