import path from 'node:path';
import YAML from 'yaml';
import { fileExists, readFile } from '../../../utils/file.js';
import { readPackageJson } from '../manifests.js';

const ALL_SCRIPTS_CAP = 50;

function pickScript(scripts, candidates) {
  for (const key of candidates) {
    if (scripts[key]) return { key, value: scripts[key] };
  }
  return null;
}

function firstTestScript(scripts) {
  if (scripts['test']) return { key: 'test', value: scripts['test'] };
  if (scripts['test:unit']) return { key: 'test:unit', value: scripts['test:unit'] };
  const key = Object.keys(scripts).find((k) => k.startsWith('test:'));
  return key ? { key, value: scripts[key] } : null;
}

async function readMakefileTargets(projectRoot) {
  const filePath = path.join(projectRoot, 'Makefile');
  if (!(await fileExists(filePath))) return [];
  try {
    const raw = await readFile(filePath);
    const targets = new Set();
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:(?!=)/);
      if (match) targets.add(match[1]);
    }
    return Array.from(targets);
  } catch {
    return [];
  }
}

async function readTaskfile(projectRoot) {
  const filePath = path.join(projectRoot, 'Taskfile.yml');
  if (!(await fileExists(filePath))) return [];
  try {
    const raw = await readFile(filePath);
    const parsed = YAML.parse(raw);
    if (parsed && parsed.tasks && typeof parsed.tasks === 'object') {
      return Object.keys(parsed.tasks);
    }
    return [];
  } catch {
    return [];
  }
}

async function readJustfile(projectRoot) {
  const filePath = path.join(projectRoot, 'justfile');
  if (!(await fileExists(filePath))) return [];
  try {
    const raw = await readFile(filePath);
    const recipes = new Set();
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*(?::|\s+[a-zA-Z])/);
      if (match) recipes.add(match[1]);
    }
    return Array.from(recipes);
  } catch {
    return [];
  }
}

export default async function detectScripts(projectRoot) {
  const pkg = await readPackageJson(projectRoot);
  const scripts = pkg && pkg.scripts ? pkg.scripts : {};

  const dev = pickScript(scripts, ['dev', 'start', 'serve']);
  const test = firstTestScript(scripts);
  const build = pickScript(scripts, ['build', 'compile']);
  const lint = pickScript(scripts, ['lint', 'check']);

  let truncated = false;
  let allScripts = {};
  const entries = Object.entries(scripts);
  if (entries.length > ALL_SCRIPTS_CAP) {
    truncated = true;
    for (const [k, v] of entries.slice(0, ALL_SCRIPTS_CAP)) allScripts[k] = v;
  } else {
    allScripts = { ...scripts };
  }

  const sources = [];
  if (pkg) sources.push('package.json');

  const makefileTargets = await readMakefileTargets(projectRoot);
  const taskfileTasks = await readTaskfile(projectRoot);
  const justfileRecipes = await readJustfile(projectRoot);
  if (makefileTargets.length > 0) sources.push('Makefile');
  if (taskfileTasks.length > 0) sources.push('Taskfile.yml');
  if (justfileRecipes.length > 0) sources.push('justfile');

  if (
    !pkg &&
    makefileTargets.length === 0 &&
    taskfileTasks.length === 0 &&
    justfileRecipes.length === 0
  ) {
    return [];
  }

  const value = {
    dev: dev ? { key: dev.key, command: dev.value } : null,
    test: test ? { key: test.key, command: test.value } : null,
    build: build ? { key: build.key, command: build.value } : null,
    lint: lint ? { key: lint.key, command: lint.value } : null,
    allScripts,
    makefileTargets,
    taskfileTasks,
    justfileRecipes,
  };
  if (truncated) value.truncated = true;

  return [
    {
      field: 'scripts',
      value,
      confidence: 'high',
      source: sources.join(', '),
      candidates: null,
    },
  ];
}
