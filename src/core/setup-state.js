import path from 'node:path';
import fs from 'fs-extra';

export const SCHEMA_VERSION = 1;

export const STATE_NAMES = [
  'INIT',
  'SCAN',
  'CONFIRM_HIGH',
  'CONFIRM_MEDIUM',
  'INTERVIEW_STORY',
  'INTERVIEW_ARCH',
  'INTERVIEW_FEATURES',
  'INTERVIEW_WORKFLOW',
  'INTERVIEW_CONVENTIONS',
  'INTERVIEW_VERIFICATION',
  'WRITE',
  'DONE',
];

export const QUESTION_IDS = [
  'story.audience',
  'story.problem',
  'story.analogs',
  'arch.classification',
  'arch.modules',
  'arch.entities',
  'arch.external_apis',
  'arch.stack_rationale',
  'features.core',
  'features.nice_to_have',
  'features.non_goals',
  'workflow.new_dev_steps',
  'workflow.env_values',
  'conventions.patterns',
  'conventions.errors',
  'conventions.logging',
  'conventions.api_format',
  'conventions.naming',
  'conventions.rules',
  'verification.manual',
  'verification.staging',
  'verification.required_checks',
];

// Unchecked-namespace routing: rejected high-confidence fields re-asked in the
// state matching the field's natural section. Source of truth for
// interviewAnswers key validation.
export const UNCHECKED_ROUTING = {
  readme: 'story',
  specDocs: 'story',
  packageManager: 'arch',
  language: 'arch',
  frameworks: 'arch',
  orm: 'arch',
  monorepo: 'arch',
  deployment: 'arch',
  externalApis: 'arch',
  scripts: 'workflow',
  envVariables: 'workflow',
  linting: 'workflow',
  ci: 'workflow',
  testing: 'verification',
};

export function getStateFilePath(projectRoot) {
  return path.join(projectRoot, '.claude', 'cache', 'setup-state.json');
}

function isUncheckedKey(key) {
  const match = /^(story|arch|workflow|verification)\.unchecked\.([A-Za-z][A-Za-z0-9]*)$/.exec(key);
  if (!match) return false;
  const [, prefix, field] = match;
  return UNCHECKED_ROUTING[field] === prefix;
}

function isKnownQuestionId(key) {
  return QUESTION_IDS.includes(key);
}

function isKnownStateName(name) {
  return STATE_NAMES.includes(name);
}

function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('state must be an object');
  }
  if (state.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion: ${state.schemaVersion} (expected ${SCHEMA_VERSION})`
    );
  }
  if (typeof state.startedAt !== 'string' || !state.startedAt) {
    throw new Error('state.startedAt must be a non-empty ISO string');
  }
  if (typeof state.updatedAt !== 'string' || !state.updatedAt) {
    throw new Error('state.updatedAt must be a non-empty ISO string');
  }
  if (!isKnownStateName(state.currentState)) {
    throw new Error(`Unknown currentState: ${state.currentState}`);
  }
  if (typeof state.detectionReportPath !== 'string') {
    throw new Error('state.detectionReportPath must be a string');
  }
  if (!Array.isArray(state.highConfirmedAccepted)) {
    throw new Error('state.highConfirmedAccepted must be an array');
  }
  if (!Array.isArray(state.highConfirmedRejected)) {
    throw new Error('state.highConfirmedRejected must be an array');
  }
  if (!state.mediumResolved || typeof state.mediumResolved !== 'object') {
    throw new Error('state.mediumResolved must be an object');
  }
  for (const [k, v] of Object.entries(state.mediumResolved)) {
    if (typeof v !== 'string') {
      throw new Error(
        `state.mediumResolved.${k} must be a string (got ${typeof v}; ` +
          `stringify the rendered value per the CONFIRM_MEDIUM Storage rule)`
      );
    }
  }
  if (!state.interviewAnswers || typeof state.interviewAnswers !== 'object') {
    throw new Error('state.interviewAnswers must be an object');
  }
  for (const [k, v] of Object.entries(state.interviewAnswers)) {
    if (typeof v !== 'string') {
      throw new Error(`state.interviewAnswers.${k} must be a string`);
    }
    if (!isKnownQuestionId(k) && !isUncheckedKey(k)) {
      throw new Error(
        `state.interviewAnswers has unknown key: ${k} (must be in QuestionId enumeration or a routed <state>.unchecked.<field> key)`
      );
    }
  }
  if (state.writeResults !== undefined) {
    if (!state.writeResults || typeof state.writeResults !== 'object') {
      throw new Error('state.writeResults must be an object when present');
    }
    for (const [k, v] of Object.entries(state.writeResults)) {
      if (typeof v !== 'string') {
        throw new Error(`state.writeResults.${k} must be a string`);
      }
    }
  }
}

export async function loadSetupState(projectRoot) {
  const filePath = getStateFilePath(projectRoot);
  if (!(await fs.pathExists(filePath))) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf-8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Corrupt setup-state.json: ${err.message}`);
  }
  validateState(parsed);
  return parsed;
}

export async function saveSetupState(projectRoot, state) {
  const filePath = getStateFilePath(projectRoot);
  await fs.ensureDir(path.dirname(filePath));

  const merged = {
    ...state,
    startedAt: (await readExistingStartedAt(filePath)) || state.startedAt,
    updatedAt: new Date().toISOString(),
  };

  validateState(merged);
  await fs.writeFile(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  return filePath;
}

// Preserves startedAt across re-saves so the timeline reflects when setup
// actually began, not when the most recent mutation happened. Returns null
// for fresh saves. Corrupt JSON is treated as "no preserved value"; other
// I/O errors propagate so we never silently lose timeline data.
async function readExistingStartedAt(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  try {
    const existing = JSON.parse(raw);
    return typeof existing.startedAt === 'string' && existing.startedAt ? existing.startedAt : null;
  } catch (err) {
    if (err instanceof SyntaxError) return null;
    throw err;
  }
}

export async function clearSetupState(projectRoot) {
  const filePath = getStateFilePath(projectRoot);
  await fs.remove(filePath);
}

export function isSetupStateStale(state, staleHours = 24) {
  if (!state || typeof state.updatedAt !== 'string') {
    throw new Error('isSetupStateStale requires a state with updatedAt');
  }
  const updated = Date.parse(state.updatedAt);
  if (Number.isNaN(updated)) {
    throw new Error(`Invalid updatedAt: ${state.updatedAt}`);
  }
  const ageMs = Date.now() - updated;
  const staleMs = staleHours * 60 * 60 * 1000;
  return ageMs >= staleMs;
}
