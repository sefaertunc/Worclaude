import { SCHEMA_VERSION } from '../../src/core/setup-state.js';

export function makeValidSetupState(overrides = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    startedAt: now,
    updatedAt: now,
    currentState: 'CONFIRM_HIGH',
    detectionReportPath: '.claude/cache/detection-report.json',
    highConfirmedAccepted: [],
    highConfirmedRejected: [],
    mediumResolved: {},
    interviewAnswers: {},
    ...overrides,
  };
}
