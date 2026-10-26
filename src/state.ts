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
