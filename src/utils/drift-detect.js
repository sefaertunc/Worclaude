import path from 'node:path';
import fs from 'fs-extra';
import { fileExists, readFile } from './file.js';

// Matches the canonical tech-stack claim format used by CLAUDE.md
// (see /sync step 10c): "(N tests, M files)". Tolerates singular/plural and
// the "M test files" variant.
const TEST_COUNT_RE = /(\d+)\s+tests?\s*,\s*(\d+)\s+(?:test\s+)?files?/i;

export function parseClaudeMdTestCountClaims(content) {
  if (typeof content !== 'string' || content.length === 0) return [];
  const claims = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(TEST_COUNT_RE);
    if (m) {
      claims.push({
        lineNumber: i + 1,
        raw: line,
        claimedTests: Number(m[1]),
        claimedFiles: Number(m[2]),
      });
    }
  }
  return claims;
}

const TEST_FILE_RE = /\.test\.(?:js|mjs|cjs|ts|tsx)$/;
const TEST_CALL_RE = /^\s*(?:it|test)(?:\.each\s*\([^)]*\))?\s*\(/gm;

export function countTestCalls(content) {
  if (typeof content !== 'string' || content.length === 0) return 0;
  return (content.match(TEST_CALL_RE) || []).length;
}

async function collectTestFiles(dir) {
  if (!(await fs.pathExists(dir))) return [];
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectTestFiles(full);
      out.push(...nested);
    } else if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export async function countActualTestSuite(projectRoot, options = {}) {
  const testDir = options.testDir || path.join(projectRoot, 'tests');
  const files = await collectTestFiles(testDir);
  let tests = 0;
  for (const file of files) {
    const content = await readFile(file);
    tests += countTestCalls(content);
  }
  return { tests, files: files.length };
}

export async function detectClaudeMdTestCountDrift(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    return { hasDrift: false, reason: 'no-claude-md', claims: [], actual: null, mismatches: [] };
  }
  const content = await readFile(claudeMdPath);
  const claims = parseClaudeMdTestCountClaims(content);
  if (claims.length === 0) {
    return { hasDrift: false, reason: 'no-claims', claims: [], actual: null, mismatches: [] };
  }
  const actual = await countActualTestSuite(projectRoot);
  // File count is glob-exact, so it's the trigger. The test-count value comes
  // from a regex over `it(`/`test(` calls and is *not* the same number vitest
  // reports (vitest expands `.each`, etc.); using it as a trigger would false-
  // positive immediately after /sync refreshes the line. Test count is still
  // reported on each claim for context.
  const mismatches = claims.filter((c) => c.claimedFiles !== actual.files);
  return {
    hasDrift: mismatches.length > 0,
    reason: mismatches.length > 0 ? 'mismatch' : 'match',
    claims,
    actual,
    mismatches,
  };
}
