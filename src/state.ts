import { parseJUnitReport } from './junit';
import { INITIAL_MAPPINGS, REQUIREMENTS } from './sample';
import type { AppState, Evidence } from './model';

export function createInitialState(): AppState {
  return {
    requirements: REQUIREMENTS.map((requirement) => ({ ...requirement })),
    mappings: INITIAL_MAPPINGS.map((mapping) => ({ ...mapping })),
    evidence: null,
  };
}

export function replaceEvidence(state: AppState, evidence: Evidence): AppState {
  return { ...state, evidence };
}

export function applyImportedReport(
  state: AppState,
  xmlText: string,
  filename: string,
): AppState {
  const parsed = parseJUnitReport(xmlText);
  const evidence: Evidence = {
    source: {
      kind: 'imported-junit',
      filename,
      synthetic: parsed.synthetic ? true : null,
    },
    tests: parsed.tests,
  };
  return replaceEvidence(state, evidence);
}
