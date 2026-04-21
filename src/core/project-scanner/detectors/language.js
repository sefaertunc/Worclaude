import path from 'node:path';
import fs from 'fs-extra';
import { fileExists } from '../../../utils/file.js';

async function hasAnyJsFile(projectRoot) {
  try {
    const entries = await fs.readdir(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) return true;
    }
    const srcDir = path.join(projectRoot, 'src');
    if (await fileExists(srcDir)) {
      const srcEntries = await fs.readdir(srcDir, { withFileTypes: true });
      for (const entry of srcEntries) {
        if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) return true;
      }
    }
  } catch {
    /* missing or unreadable — non-fatal */
  }
  return false;
}

async function hasTsFiles(projectRoot) {
  try {
    const srcDir = path.join(projectRoot, 'src');
    if (await fileExists(srcDir)) {
      const entries = await fs.readdir(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) return true;
      }
    }
  } catch {
    /* missing or unreadable — non-fatal */
  }
  return false;
}

export default async function detectLanguage(projectRoot) {
  const results = [];
  const has = async (f) => fileExists(path.join(projectRoot, f));

  if (await has('tsconfig.json')) {
    results.push({
      field: 'language',
      value: 'TypeScript',
      confidence: 'high',
      source: 'tsconfig.json',
      candidates: null,
    });
  } else if (await has('jsconfig.json')) {
    results.push({
      field: 'language',
      value: 'JavaScript',
      confidence: 'high',
      source: 'jsconfig.json',
      candidates: null,
    });
  } else if ((await hasAnyJsFile(projectRoot)) && !(await hasTsFiles(projectRoot))) {
    results.push({
      field: 'language',
      value: 'JavaScript',
      confidence: 'high',
      source: '*.js files',
      candidates: null,
    });
  }

  const pythonFiles = ['pyproject.toml', 'setup.py', 'requirements.txt'];
  for (const f of pythonFiles) {
    if (await has(f)) {
      results.push({
        field: 'language',
        value: 'Python',
        confidence: 'high',
        source: f,
        candidates: null,
      });
      break;
    }
  }
  if (!results.some((r) => r.value === 'Python')) {
    try {
      const entries = await fs.readdir(projectRoot, { withFileTypes: true });
      const reqFile = entries.find((e) => e.isFile() && /^requirements.*\.txt$/.test(e.name));
      if (reqFile) {
        results.push({
          field: 'language',
          value: 'Python',
          confidence: 'high',
          source: reqFile.name,
          candidates: null,
        });
      }
    } catch {
      /* missing or unreadable — non-fatal */
    }
  }

  if (await has('Cargo.toml')) {
    results.push({
      field: 'language',
      value: 'Rust',
      confidence: 'high',
      source: 'Cargo.toml',
      candidates: null,
    });
  }

  if (await has('go.mod')) {
    results.push({
      field: 'language',
      value: 'Go',
      confidence: 'high',
      source: 'go.mod',
      candidates: null,
    });
  }

  if (await has('Gemfile')) {
    results.push({
      field: 'language',
      value: 'Ruby',
      confidence: 'high',
      source: 'Gemfile',
      candidates: null,
    });
  }

  return results;
}
