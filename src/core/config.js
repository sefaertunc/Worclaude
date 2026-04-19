import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, fileExists, listFilesRecursive } from '../utils/file.js';
import { hashFile } from '../utils/hash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');

export function getPackageVersionSync() {
  return JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
}

export async function getPackageVersion() {
  const content = await readFile(pkgPath);
  return JSON.parse(content).version;
}

export function createWorkflowMeta({
  projectTypes,
  techStack,
  universalAgents,
  optionalAgents,
  fileHashes = {},
  version,
  useDocker = false,
}) {
  const now = new Date().toISOString();
  return {
    version: version || '1.0.0',
    installedAt: now,
    lastUpdated: now,
    projectTypes,
    techStack,
    universalAgents,
    optionalAgents,
    useDocker,
    fileHashes,
  };
}

export async function readWorkflowMeta(projectRoot) {
  const metaPath = path.join(projectRoot, '.claude', 'workflow-meta.json');
  try {
    const content = await readFile(metaPath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function workflowMetaExists(projectRoot) {
  const metaPath = path.join(projectRoot, '.claude', 'workflow-meta.json');
  return fileExists(metaPath);
}

export async function writeWorkflowMeta(projectRoot, meta) {
  const metaPath = path.join(projectRoot, '.claude', 'workflow-meta.json');
  await writeFile(metaPath, JSON.stringify(meta, null, 2));
}

export async function requireWorkflowMeta(projectRoot) {
  if (!(await workflowMetaExists(projectRoot))) {
    return { meta: null, error: 'not-installed' };
  }
  const meta = await readWorkflowMeta(projectRoot);
  if (!meta) {
    return { meta: null, error: 'corrupted' };
  }
  return { meta, error: null };
}

const ROOT_TRACKED_FILES = ['AGENTS.md'];

export async function computeFileHashes(projectRoot) {
  const claudeDir = path.join(projectRoot, '.claude');
  const allFiles = await listFilesRecursive(claudeDir);
  const fileHashes = {};
  for (const filePath of allFiles) {
    const relKey = path.relative(claudeDir, filePath).split(path.sep).join('/');
    if (
      relKey !== 'workflow-meta.json' &&
      relKey !== 'settings.json' &&
      !relKey.startsWith('sessions/')
    ) {
      fileHashes[relKey] = await hashFile(filePath);
    }
  }
  for (const rel of ROOT_TRACKED_FILES) {
    const filePath = path.join(projectRoot, rel);
    if (await fileExists(filePath)) {
      fileHashes[`root/${rel}`] = await hashFile(filePath);
    }
  }
  return fileHashes;
}
