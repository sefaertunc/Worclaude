import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'fs-extra';
import { dirExists } from '../../utils/file.js';
import { resetManifestCache } from './manifests.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DETECTOR_TIMEOUT_MS = 5000;
const SCHEMA_VERSION = 1;

async function loadDetectorsFromDisk() {
  const detectorsDir = path.join(__dirname, 'detectors');
  const entries = await fs.readdir(detectorsDir, { withFileTypes: true });
  const detectorFiles = entries.filter(
    (e) =>
      e.isFile() && !e.name.startsWith('.') && !e.name.startsWith('_') && e.name.endsWith('.js')
  );
  return Promise.all(
    detectorFiles.map(async (entry) => {
      const fileUrl = pathToFileURL(path.join(detectorsDir, entry.name)).href;
      const mod = await import(fileUrl);
      if (typeof mod.default !== 'function') {
        throw new Error(`Detector ${entry.name} must export a default function`);
      }
      return { name: path.basename(entry.name, '.js'), fn: mod.default };
    })
  );
}

function normalizeOverride(overrideDetectors) {
  return overrideDetectors.map((entry, index) => {
    if (typeof entry === 'function') {
      return { name: entry.name || `override-${index}`, fn: entry };
    }
    if (entry && typeof entry.fn === 'function') {
      return { name: entry.name || `override-${index}`, fn: entry.fn };
    }
    throw new Error(`overrideDetectors[${index}] must be a function or { name, fn } object`);
  });
}

function withTimeout(promise, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function runDetector(detector, projectRoot) {
  try {
    const results = await withTimeout(
      Promise.resolve().then(() => detector.fn(projectRoot)),
      DETECTOR_TIMEOUT_MS
    );
    if (!Array.isArray(results)) {
      return {
        results: [],
        error: {
          detector: detector.name,
          kind: 'exception',
          message: `Detector did not return an array (got ${typeof results})`,
        },
      };
    }
    const annotated = results.map((r) => ({ ...r, detector: detector.name }));
    return { results: annotated, error: null };
  } catch (err) {
    const kind = err && err.message === 'timeout' ? 'timeout' : 'exception';
    const message =
      kind === 'timeout'
        ? `Detector exceeded ${DETECTOR_TIMEOUT_MS}ms timeout`
        : String(err && err.message ? err.message : err);
    return { results: [], error: { detector: detector.name, kind, message } };
  }
}

export async function scanProject(projectRoot, options = {}) {
  if (!projectRoot || typeof projectRoot !== 'string') {
    throw new Error('scanProject requires a projectRoot string');
  }
  const absoluteRoot = path.resolve(projectRoot);
  if (!(await dirExists(absoluteRoot))) {
    throw new Error(`projectRoot not found: ${absoluteRoot}`);
  }

  resetManifestCache();

  const detectors = options.overrideDetectors
    ? normalizeOverride(options.overrideDetectors)
    : await loadDetectorsFromDisk();

  const settled = await Promise.all(detectors.map((d) => runDetector(d, absoluteRoot)));

  const results = [];
  const errors = [];
  for (const { results: r, error } of settled) {
    for (const item of r) results.push(item);
    if (error) errors.push(error);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    projectRoot: absoluteRoot,
    results,
    errors,
  };
}

export async function writeDetectionReport(report, projectRoot) {
  if (!report || typeof report !== 'object') {
    throw new Error('writeDetectionReport requires a report object');
  }
  if (report.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${report.schemaVersion}`);
  }
  if (!Array.isArray(report.results) || !Array.isArray(report.errors)) {
    throw new Error('Report must have results and errors arrays');
  }
  const cacheDir = path.join(projectRoot, '.claude', 'cache');
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, 'detection-report.json');
  await fs.writeFile(filePath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  return filePath;
}
