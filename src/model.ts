export type VerificationRule = 'all-linked-checks-pass';

export interface Requirement {
  readonly id: string;
  readonly title: string;
  readonly verificationRule: VerificationRule;
}

export type ObservedOutcome = 'PASS' | 'FAIL' | 'SKIPPED' | 'ERROR';
export type CheckOutcome = ObservedOutcome | 'MISSING';

export interface TestResult {
  readonly id: string;
  readonly name: string;
  readonly classname: string | null;
  readonly outcome: ObservedOutcome;
  readonly message: string | null;
}

export type EvidenceKind = 'synthetic-sample' | 'imported-junit';

export interface EvidenceSource {
  readonly kind: EvidenceKind;
  readonly filename: string;
  readonly synthetic: true | null;
}

export interface Evidence {
  readonly source: EvidenceSource;
  readonly tests: readonly TestResult[];
}

export interface Mapping {
  readonly requirementId: string;
  readonly testId: string;
}

export interface AppState {
  readonly requirements: readonly Requirement[];
  readonly mappings: readonly Mapping[];
  readonly evidence: Evidence | null;
}

export type Status = 'VERIFIED' | 'FAILED' | 'UNVERIFIED';

export type ReadinessDecision =
  | 'CANNOT_VERIFY'
  | 'NOT_READY'
  | 'LINKED_CHECKS_PASSED';

export interface Blocker {
  readonly requirementId: string;
  readonly title: string;
  readonly status: Exclude<Status, 'VERIFIED'>;
  readonly reason: string;
}

export interface CheckDetail {
  readonly testId: string;
  readonly outcome: CheckOutcome;
  readonly message: string | null;
}

export type GapKind = 'NO_LINKED_TESTS' | 'SKIPPED' | 'ERROR' | 'MISSING';

export interface Gap {
  readonly testId: string | null;
  readonly kind: GapKind;
  readonly message: string;
}

export interface RequirementResult {
  readonly id: string;
  readonly title: string;
  readonly verificationRule: VerificationRule;
  readonly status: Status;
  readonly explanation: string;
  readonly linkedTestIds: readonly string[];
  readonly checks: readonly CheckDetail[];
  readonly gaps: readonly Gap[];
}

export interface Summary {
  readonly totalRequirements: number;
  readonly verified: number;
  readonly failed: number;
  readonly unverified: number;
  readonly decision: ReadinessDecision;
  readonly blockers: readonly Blocker[];
  readonly readinessStatement: string;
}

export interface Ledger {
  readonly requirements: readonly RequirementResult[];
  readonly summary: Summary;
}
