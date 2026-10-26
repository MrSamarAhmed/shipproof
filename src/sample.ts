import sampleXml from '../fixtures/sample-auth.junit.xml?raw';
import type { Mapping, Requirement } from './model';

export const SAMPLE_PROJECT_NAME = 'Authentication';
export const SAMPLE_FILENAME = 'sample-auth.junit.xml';
export const SAMPLE_XML = sampleXml;

export const REQUIREMENTS: readonly Requirement[] = [
  {
    id: 'REQ-001',
    title: 'Authentication works',
    verificationRule: 'all-linked-checks-pass',
  },
  {
    id: 'REQ-002',
    title: 'Invalid credentials are rejected',
    verificationRule: 'all-linked-checks-pass',
  },
  {
    id: 'REQ-003',
    title: 'Rate limiting is enforced',
    verificationRule: 'all-linked-checks-pass',
  },
];

export const INITIAL_MAPPINGS: readonly Mapping[] = [
  { requirementId: 'REQ-001', testId: 'test_valid_credentials_succeed' },
  { requirementId: 'REQ-002', testId: 'test_invalid_credentials_rejected' },
];
