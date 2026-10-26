import { evaluateLedger } from './domain';
import type {
  AppState,
  CheckDetail,
  EvidenceKind,
  Gap,
  RequirementResult,
  Summary,
} from './model';

export const SCHEMA_VERSION = '1.0';
export const EXPORT_FILENAME = 'shipproof-readiness-report.json';

const METHOD =
  'Deterministic evaluation of the current JUnit evidence and explicit requirement mappings using the single verification rule: all linked checks must pass.';

export interface ReadinessReport {
  readonly metadata: {
    readonly product: 'ShipProof';
    readonly schemaVersion: string;
    readonly generatedAt: string;
    readonly evidenceSource: {
      readonly kind: EvidenceKind;
      readonly filename: string;
      readonly synthetic: true | null;
    };
  };
  readonly summary: Summary;
  readonly requirements: readonly RequirementResult[];
  readonly provenance: {
    readonly method: string;
    readonly limitations: readonly string[];
  };
}

export function buildReadinessReport(
  state: AppState,
  generatedAt: string,
): ReadinessReport {
  if (state.evidence === null) {
    throw new Error('Load test evidence before exporting a readiness report.');
  }

  const ledger = evaluateLedger(state);
  const { source } = state.evidence;
  const limitations = [
    'Statuses are computed deterministically from the current evidence report and explicit requirement links; results from earlier reports are never reused.',
    'VERIFIED means the linked checks passed. It does not prove the application is correct, complete, or based on evidence beyond those checks.',
    'Test relevance, truthfulness, and coverage require human review. ShipProof does not run tests or verify their authenticity.',
  ];
  if (source.synthetic === true) {
    limitations.push(
      'The evidence source is synthetic or declared synthetic and is not a real test run.',
    );
  }

  return {
    metadata: {
      product: 'ShipProof',
      schemaVersion: SCHEMA_VERSION,
      generatedAt,
      evidenceSource: {
        kind: source.kind,
        filename: source.filename,
        synthetic: source.synthetic,
      },
    },
    summary: ledger.summary,
    requirements: ledger.requirements.map((result) => ({
      id: result.id,
      title: result.title,
      verificationRule: result.verificationRule,
      status: result.status,
      explanation: result.explanation,
      linkedTestIds: result.linkedTestIds,
      checks: result.checks.map((check: CheckDetail) => ({
        testId: check.testId,
        outcome: check.outcome,
        message: check.message,
      })),
      gaps: result.gaps.map((gap: Gap) => ({
        testId: gap.testId,
        kind: gap.kind,
        message: gap.message,
      })),
    })),
    provenance: {
      method: METHOD,
      limitations,
    },
  };
}

export function serializeReadinessReport(
  state: AppState,
  generatedAt: string,
): string {
  return JSON.stringify(buildReadinessReport(state, generatedAt), null, 2);
}
