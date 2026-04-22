import path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { readFile, fileExists } from '../../utils/file.js';

// Per-scan caches — cleared by resetManifestCache() at the start of each scanProject call.
// Without this, detectors that independently call readPackageJson / readPyprojectToml would
// each re-read and re-parse the same files (up to 7× package.json, 5× pyproject.toml per scan).
const pkgCache = new Map();
const pyprojectCache = new Map();

export function resetManifestCache() {
  pkgCache.clear();
  pyprojectCache.clear();
}

export async function readPackageJson(projectRoot) {
  if (pkgCache.has(projectRoot)) return pkgCache.get(projectRoot);
  const filePath = path.join(projectRoot, 'package.json');
  let result = null;
  if (await fileExists(filePath)) {
    try {
      const raw = await readFile(filePath);
      result = JSON.parse(raw.replace(/^﻿/, ''));
    } catch {
      result = null;
    }
  }
  pkgCache.set(projectRoot, result);
  return result;
}

export async function readPyprojectToml(projectRoot) {
  if (pyprojectCache.has(projectRoot)) return pyprojectCache.get(projectRoot);
  const filePath = path.join(projectRoot, 'pyproject.toml');
  let result = null;
  if (await fileExists(filePath)) {
    try {
      const raw = await readFile(filePath);
      result = parseToml(raw);
    } catch {
      result = null;
    }
  }
  pyprojectCache.set(projectRoot, result);
  return result;
}

function normalizeDepMap(input) {
  if (!input || typeof input !== 'object') return {};
  if (Array.isArray(input)) {
    const out = {};
    for (const entry of input) {
      if (typeof entry === 'string') {
        const match = entry.match(/^\s*([A-Za-z0-9_.\-[\]]+)/);
        if (match) out[match[1]] = entry;
      }
    }
    return out;
  }
  return input;
}

export function flattenPyprojectDeps(pyproject) {
  if (!pyproject) return {};
  const deps = {};
  const assign = (map) => {
    const normalized = normalizeDepMap(map);
    for (const [k, v] of Object.entries(normalized)) {
      // Skip Poetry's interpreter pin — `python = "^3.11"` is the runtime, not a dep.
      if (k === 'python') continue;
      if (!(k in deps)) deps[k] = typeof v === 'string' ? v : '';
    }
  };

  if (pyproject.project) {
    if (pyproject.project.dependencies) assign(pyproject.project.dependencies);
    if (pyproject.project['optional-dependencies']) {
      for (const group of Object.values(pyproject.project['optional-dependencies'])) {
        assign(group);
      }
    }
  }

  if (pyproject.tool && pyproject.tool.poetry) {
    if (pyproject.tool.poetry.dependencies) assign(pyproject.tool.poetry.dependencies);
    if (pyproject.tool.poetry.group) {
      for (const group of Object.values(pyproject.tool.poetry.group)) {
        if (group && group.dependencies) assign(group.dependencies);
      }
    }
  }

  if (pyproject['dependency-groups']) {
    for (const group of Object.values(pyproject['dependency-groups'])) {
      assign(group);
    }
  }

  return deps;
}

export async function getAllDeps(projectRoot) {
  const pkg = await readPackageJson(projectRoot);
  const pyproject = await readPyprojectToml(projectRoot);
  const js = {};
  if (pkg) {
    for (const k of Object.keys(pkg.dependencies || {})) js[k] = pkg.dependencies[k];
    for (const k of Object.keys(pkg.devDependencies || {})) js[k] = pkg.devDependencies[k];
  }
  const py = flattenPyprojectDeps(pyproject);
  return { js, py, hasPackageJson: pkg !== null, hasPyproject: pyproject !== null };
}

export function depMatches(deps, pattern) {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return Object.keys(deps).some((name) => name.startsWith(prefix));
  }
  return Object.prototype.hasOwnProperty.call(deps, pattern);
}
