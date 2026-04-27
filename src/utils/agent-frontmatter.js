import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';

const ROUTING_FIELDS = [
  'category',
  'triggerType',
  'triggerCommand',
  'whenToUse',
  'whatItDoes',
  'expectBack',
  'situationLabel',
  'status',
];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export class AgentFrontmatterError extends Error {
  constructor(message, { filePath } = {}) {
    super(message);
    this.name = 'AgentFrontmatterError';
    this.filePath = filePath;
  }
}

export function parseAgentFrontmatter(source, filePath) {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    throw new AgentFrontmatterError('No YAML frontmatter found', { filePath });
  }
  let parsed;
  try {
    parsed = yaml.parse(match[1]);
  } catch (err) {
    throw new AgentFrontmatterError(`Frontmatter is not valid YAML: ${err.message}`, {
      filePath,
    });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AgentFrontmatterError('Frontmatter must be a YAML mapping', { filePath });
  }
  return parsed;
}

export function validateRoutingFields(frontmatter, { filePath } = {}) {
  const missing = [];
  for (const field of ['category', 'triggerType', 'whenToUse', 'whatItDoes', 'expectBack']) {
    if (frontmatter[field] === undefined || frontmatter[field] === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new AgentFrontmatterError(
      `Agent frontmatter missing required routing fields: ${missing.join(', ')}`,
      { filePath }
    );
  }
  if (frontmatter.triggerType !== 'automatic' && frontmatter.triggerType !== 'manual') {
    throw new AgentFrontmatterError(
      `Agent frontmatter triggerType must be "automatic" or "manual", got "${frontmatter.triggerType}"`,
      { filePath }
    );
  }
}

export async function readAgentFile(filePath) {
  const source = await readFile(filePath, 'utf8');
  const frontmatter = parseAgentFrontmatter(source, filePath);
  return frontmatter;
}

export async function loadAgentsFromDir(dir, { recursive = true } = {}) {
  const entries = [];
  await walk(dir, recursive, entries);
  const agents = [];
  for (const filePath of entries) {
    const frontmatter = await readAgentFile(filePath);
    if (!frontmatter.name) {
      throw new AgentFrontmatterError('Agent frontmatter missing required field: name', {
        filePath,
      });
    }
    agents.push({ name: frontmatter.name, filePath, ...frontmatter });
  }
  agents.sort((a, b) => a.name.localeCompare(b.name));
  return agents;
}

async function walk(dir, recursive, out) {
  let dirents;
  try {
    dirents = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const dirent of dirents) {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (recursive) await walk(full, recursive, out);
      continue;
    }
    if (dirent.isFile() && dirent.name.endsWith('.md')) {
      out.push(full);
    }
  }
}

export { ROUTING_FIELDS };
