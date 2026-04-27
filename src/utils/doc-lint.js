import path from 'node:path';
import fs from 'fs-extra';
import { fileExists, readFile } from './file.js';

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

const MARKER_RE = /<!--\s*references\s+(\S+?)\s*-->/i;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.eslintcache',
  '.vitest',
  'docs/.vitepress/dist',
  'docs/.vitepress/cache',
]);

async function walkMarkdownFiles(rootDir, currentRel = '') {
  const out = [];
  const dir = path.join(rootDir, currentRel);
  if (!(await fs.pathExists(dir))) return out;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel) || entry.name.startsWith('.')) continue;
      const nested = await walkMarkdownFiles(rootDir, rel);
      out.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

function extractSection(lines, markerLineIdx) {
  const sectionLines = [];
  for (let i = markerLineIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    sectionLines.push(lines[i]);
  }
  return sectionLines.join('\n');
}

export async function findReferencesMarkers(rootDir) {
  const files = await walkMarkdownFiles(rootDir);
  const markers = [];
  for (const relFile of files) {
    const absPath = path.join(rootDir, relFile);
    const content = await readFile(absPath);
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(MARKER_RE);
      if (!m) continue;
      const source = m[1];
      const sectionContent = extractSection(lines, i);
      markers.push({
        file: relFile,
        markerLine: i + 1,
        source,
        sectionStartLine: i + 2,
        sectionContent,
      });
    }
  }
  return markers;
}

const RUN_SCRIPT_RE = /\bnpm\s+run\s+([a-zA-Z][a-zA-Z0-9:_-]*)/g;

export function findMissingNpmScripts(sectionContent, packageScripts) {
  const seen = new Set();
  const missing = [];
  RUN_SCRIPT_RE.lastIndex = 0;
  let match;
  while ((match = RUN_SCRIPT_RE.exec(sectionContent)) !== null) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    if (!(name in (packageScripts || {}))) {
      missing.push(name);
    }
  }
  return missing;
}

export async function validatePackageJsonReferences(marker, projectRoot, packageJson) {
  const issues = [];
  const claims = parseClaudeMdTestCountClaims(marker.sectionContent);
  if (claims.length > 0) {
    const actual = await countActualTestSuite(projectRoot);
    for (const claim of claims) {
      if (claim.claimedFiles !== actual.files) {
        issues.push({
          kind: 'test-count-drift',
          markerLine: marker.markerLine,
          claimLine: marker.sectionStartLine + claim.lineNumber - 1,
          claimed: { tests: claim.claimedTests, files: claim.claimedFiles },
          actual,
          raw: claim.raw.trim(),
        });
      }
    }
  }
  const missing = findMissingNpmScripts(marker.sectionContent, packageJson.scripts);
  for (const name of missing) {
    issues.push({
      kind: 'missing-npm-script',
      markerLine: marker.markerLine,
      scriptName: name,
    });
  }
  return issues;
}

export async function lintRepo(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  let packageJson = { scripts: {} };
  if (await fileExists(pkgPath)) {
    try {
      packageJson = JSON.parse(await readFile(pkgPath));
    } catch {
      packageJson = { scripts: {} };
    }
  }
  const markers = await findReferencesMarkers(projectRoot);
  const findings = [];
  for (const marker of markers) {
    if (marker.source !== 'package.json') continue;
    const issues = await validatePackageJsonReferences(marker, projectRoot, packageJson);
    for (const issue of issues) {
      findings.push({ file: marker.file, ...issue });
    }
  }
  return {
    hasDrift: findings.length > 0,
    markerCount: markers.length,
    findings,
  };
}
