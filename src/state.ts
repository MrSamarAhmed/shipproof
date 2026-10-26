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

export function addMapping(
  state: AppState,
  requirementId: string,
  testId: string,
): AppState {
  if (!state.requirements.some((requirement) => requirement.id === requirementId)) {
    throw new Error(`Unknown requirement "${requirementId}".`);
  }
  if (state.evidence === null) {
    throw new Error('Load test evidence before linking tests.');
  }
  if (!state.evidence.tests.some((test) => test.id === testId)) {
    throw new Error(`Test "${testId}" is not in the current report.`);
  }
  if (
    state.mappings.some(
      (mapping) =>
        mapping.requirementId === requirementId && mapping.testId === testId,
    )
  ) {
    throw new Error(`Test "${testId}" is already linked to ${requirementId}.`);
  }
  return {
    ...state,
    mappings: [...state.mappings, { requirementId, testId }],
  };
}

export function removeMapping(
  state: AppState,
  requirementId: string,
  testId: string,
): AppState {
  return {
    ...state,
    mappings: state.mappings.filter(
      (mapping) =>
        !(mapping.requirementId === requirementId && mapping.testId === testId),
    ),
  };
}
