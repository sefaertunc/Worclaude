import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, fileExists } from '../utils/file.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function getPackageVersion() {
  const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
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
