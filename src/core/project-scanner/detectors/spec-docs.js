import path from 'node:path';
import fs from 'fs-extra';
import { readFile } from '../../../utils/file.js';

const EXCLUDES = new Set([
  'node_modules',
  '.git',
  '.claude',
  'dist',
  'build',
  '.next',
  'target',
  'vendor',
  '.venv',
  '__pycache__',
  '.cache',
]);

const MAX_FILES = 200;
const MAX_DEPTH = 3;
const HEADING_CHAR_CAP = 80;
const ROOT_PATTERNS = [/^PRD/i, /^SPEC/i, /^REQUIREMENTS/i];

async function rootMatches(projectRoot) {
  const matches = [];
  try {
    const entries = await fs.readdir(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (ROOT_PATTERNS.some((p) => p.test(entry.name))) {
        matches.push(entry.name);
      }
    }
  } catch {
    /* missing or unreadable — non-fatal */
  }
  return matches;
}

async function walkDocs(dir, projectRoot, depth, results) {
  if (depth > MAX_DEPTH || results.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (results.length >= MAX_FILES) return;
    if (EXCLUDES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDocs(fullPath, projectRoot, depth + 1, results);
    } else if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) {
      results.push(path.relative(projectRoot, fullPath).split(path.sep).join('/'));
    }
  }
}

async function firstHeading(projectRoot, relativePath) {
  try {
    const raw = await readFile(path.join(projectRoot, relativePath));
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line === '') continue;
      const match = line.match(/^#\s+(.+)$/);
      if (match) return match[1].slice(0, HEADING_CHAR_CAP);
      return line.slice(0, HEADING_CHAR_CAP);
    }
  } catch {
    /* missing or unreadable — non-fatal */
  }
  return null;
}

export default async function detectSpecDocs(projectRoot) {
  const docs = [];
  const rootNames = await rootMatches(projectRoot);
  for (const name of rootNames) docs.push(name);

  const docsDir = path.join(projectRoot, 'docs');
  try {
    const stat = await fs.stat(docsDir);
    if (stat.isDirectory()) {
      await walkDocs(docsDir, projectRoot, 1, docs);
    }
  } catch {
    /* missing or unreadable — non-fatal */
  }

  if (docs.length === 0) return [];

  const unique = Array.from(new Set(docs));
  const value = await Promise.all(
    unique.map(async (relative) => ({
      path: relative,
      firstHeading: await firstHeading(projectRoot, relative),
    }))
  );

  return [
    {
      field: 'specDocs',
      value,
      confidence: 'high',
      source: 'project tree',
      candidates: null,
    },
  ];
}
