import path from 'node:path';
import fs from 'fs-extra';
import { hashContent, hashFile } from '../utils/hash.js';
import { readTemplate, getTemplatesDir } from './scaffolder.js';
import { fileExists, listFilesRecursive } from '../utils/file.js';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
} from '../data/agents.js';

const ALWAYS_SCAFFOLDED_TYPES = new Set([
  'universal-agent',
  'command',
  'universal-skill',
  'hook',
  'script',
  'root-file',
]);

/**
 * Predicate: is this template entry one that should be restored when missing on disk?
 * - universal-agent, command, universal-skill, hook, root-file: always scaffolded
 * - optional-agent: only if the agent name is in meta.optionalAgents
 * - template-skill: excluded (needs variable substitution; stored hash won't match)
 */
export function isAlwaysScaffolded(entry, meta) {
  if (!entry) return false;
  if (ALWAYS_SCAFFOLDED_TYPES.has(entry.type)) return true;
  if (entry.type === 'optional-agent') {
    const agentName = entry.agentName;
    return Boolean(agentName && meta?.optionalAgents?.includes(agentName));
  }
  return false;
}

export const ROOT_KEY_PREFIX = 'root/';
export const WORKFLOW_REF_DIR = 'workflow-ref';

export function resolveKeyPath(key, projectRoot) {
  if (key.startsWith(ROOT_KEY_PREFIX)) {
    const rel = key.slice(ROOT_KEY_PREFIX.length);
    return path.join(projectRoot, ...rel.split('/'));
  }
  return path.join(projectRoot, '.claude', ...key.split('/'));
}

/**
 * Project-root-relative path for a ref file. Useful for scaffoldFile() which
 * takes a destRelativePath. Returns e.g. ".claude/workflow-ref/commands/sync.md".
 * Accepts a workflow key ("commands/sync.md", "root/CLAUDE.md") or a plain
 * relative path. Root-level files (CLAUDE.md, AGENTS.md) land directly
 * under workflow-ref/, not under workflow-ref/root/.
 */
export function workflowRefRelPath(keyOrRelPath) {
  const rel = keyOrRelPath.startsWith(ROOT_KEY_PREFIX)
    ? keyOrRelPath.slice(ROOT_KEY_PREFIX.length)
    : keyOrRelPath;
  return path.join('.claude', WORKFLOW_REF_DIR, ...rel.split('/'));
}

/**
 * Resolve an absolute ref file destination for a given relative path.
 * Wraps workflowRefRelPath with projectRoot.
 */
export function resolveRefPath(keyOrRelPath, projectRoot) {
  return path.join(projectRoot, workflowRefRelPath(keyOrRelPath));
}

/**
 * Predicate for "is this file a reference copy?". Matches both the v2.5.1+
 * layout (anywhere under .claude/workflow-ref/) and the legacy sibling
 * convention (.workflow-ref.md suffix). Used by status, doctor, and remover
 * so they stay in sync across the two location schemes.
 *
 * @param {string} absPath — absolute path on disk
 * @param {string} claudeDir — absolute path to the project's .claude/ directory
 */
export function isWorkflowRefFile(absPath, claudeDir) {
  const refDirPrefix = path.join(claudeDir, WORKFLOW_REF_DIR) + path.sep;
  if (absPath.startsWith(refDirPrefix)) return true;
  return absPath.endsWith('.workflow-ref.md');
}

/**
 * Build a map of all workflow template files to their hash keys, template paths, and hashes.
 * Hash keys match the format stored in workflow-meta.json (relative to .claude/).
 */
export async function buildTemplateHashMap() {
  const map = {};

  // Universal agents: key = agents/{name}.md, templatePath = agents/universal/{name}.md
  for (const name of UNIVERSAL_AGENTS) {
    const key = `agents/${name}.md`;
    const templatePath = `agents/universal/${name}.md`;
    const content = await readTemplate(templatePath);
    map[key] = { templatePath, hash: hashContent(content), type: 'universal-agent' };
  }

  // Optional agents: key = agents/{name}.md, templatePath = agents/optional/{category}/{name}.md
  for (const [name, info] of Object.entries(AGENT_CATALOG)) {
    const key = `agents/${name}.md`;
    const templatePath = `agents/optional/${info.category}/${name}.md`;
    const content = await readTemplate(templatePath);
    map[key] = {
      templatePath,
      hash: hashContent(content),
      type: 'optional-agent',
      agentName: name,
    };
  }

  // Commands: key = commands/{name}.md, templatePath = commands/{name}.md
  for (const name of COMMAND_FILES) {
    const key = `commands/${name}.md`;
    const templatePath = `commands/${name}.md`;
    const content = await readTemplate(templatePath);
    map[key] = { templatePath, hash: hashContent(content), type: 'command' };
  }

  // Universal skills: key = skills/{name}/SKILL.md, templatePath = skills/universal/{name}.md
  for (const name of UNIVERSAL_SKILLS) {
    const key = `skills/${name}/SKILL.md`;
    const templatePath = `skills/universal/${name}.md`;
    const content = await readTemplate(templatePath);
    map[key] = { templatePath, hash: hashContent(content), type: 'universal-skill' };
  }

  // Template skills: key = skills/{name}/SKILL.md, templatePath = skills/templates/{name}.md
  // These contain {variable} placeholders — raw hash won't match stored (substituted) hash
  for (const name of TEMPLATE_SKILLS) {
    const key = `skills/${name}/SKILL.md`;
    const templatePath = `skills/templates/${name}.md`;
    const content = await readTemplate(templatePath);
    map[key] = { templatePath, hash: hashContent(content), type: 'template-skill' };
  }

  // Hook scripts: walked from templates/hooks/ so new hooks flow through automatically.
  // Key = hooks/{name}, templatePath = hooks/{name}
  const hooksDir = path.join(getTemplatesDir(), 'hooks');
  if (await fs.pathExists(hooksDir)) {
    const entries = await fs.readdir(hooksDir);
    for (const entry of entries) {
      if (!entry.endsWith('.cjs') && !entry.endsWith('.js')) continue;
      const key = `hooks/${entry}`;
      const templatePath = `hooks/${entry}`;
      const content = await readTemplate(templatePath);
      map[key] = { templatePath, hash: hashContent(content), type: 'hook' };
    }
  }

  // Slash-command helper scripts: collapse multi-line bash blocks into a
  // single allowed invocation. Walked from templates/scripts/ so new helpers
  // flow through automatically.
  const scriptsDir = path.join(getTemplatesDir(), 'scripts');
  if (await fs.pathExists(scriptsDir)) {
    const entries = await fs.readdir(scriptsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.sh')) continue;
      const key = `scripts/${entry}`;
      const templatePath = `scripts/${entry}`;
      const content = await readTemplate(templatePath);
      map[key] = { templatePath, hash: hashContent(content), type: 'script' };
    }
  }

  // Root-level files: key = root/<path>, templatePath points into templates/
  // AGENTS.md needs variable substitution at scaffold time; the raw-template hash
  // is used only to detect drift against a previously-substituted install hash,
  // and a mismatch routes us down the user-modified path (no false overwrite).
  {
    const templatePath = 'core/agents-md.md';
    const content = await readTemplate(templatePath);
    map['root/AGENTS.md'] = {
      templatePath,
      hash: hashContent(content),
      type: 'root-file',
    };
  }

  return map;
}

/**
 * Categorize all workflow files by comparing stored hashes, on-disk hashes, and template hashes.
 */
export async function categorizeFiles(projectRoot, meta) {
  const templateMap = await buildTemplateHashMap();
  const storedHashes = meta.fileHashes || {};
  const claudeDir = path.join(projectRoot, '.claude');

  const result = {
    autoUpdate: [],
    conflict: [],
    newFiles: [],
    unchanged: [],
    missingExpected: [],
    missingUntracked: [],
    userAdded: [],
    modified: [],
    outdated: [],
  };

  // Track which keys we've processed
  const processedKeys = new Set();

  // Shared routing for files whose outdated-detection step is skipped (no
  // template entry, or template has variable placeholders we can't hash
  // against). Classification reduces to "did the user touch it?"
  const recordByUserModification = (key, userModified) => {
    if (userModified) result.modified.push({ key });
    else result.unchanged.push({ key });
  };

  // 1. Process each file in stored hashes
  for (const [key, storedHash] of Object.entries(storedHashes)) {
    processedKeys.add(key);
    const filePath = resolveKeyPath(key, projectRoot);

    // Check if file still exists on disk
    if (!(await fileExists(filePath))) {
      const templateEntry = templateMap[key];
      if (isAlwaysScaffolded(templateEntry, meta)) {
        result.missingExpected.push({
          key,
          templatePath: templateEntry.templatePath,
          type: templateEntry.type,
        });
      } else {
        result.missingUntracked.push({ key });
      }
      continue;
    }

    // Compute current on-disk hash
    const currentHash = await hashFile(filePath);
    const userModified = currentHash !== storedHash;

    // Look up in template map
    const templateEntry = templateMap[key];

    if (!templateEntry) {
      // File is in stored hashes but not in template map — treat as tracked file.
      recordByUserModification(key, userModified);
      continue;
    }

    // Skip template skills and root-files from outdated detection —
    // both contain {variable} placeholders, so raw-template hash won't
    // match the installed (substituted) hash. Restoration paths still
    // catch them when missing; we just can't auto-update them here.
    if (templateEntry.type === 'template-skill' || templateEntry.type === 'root-file') {
      recordByUserModification(key, userModified);
      continue;
    }

    const templateChanged = templateEntry.hash !== storedHash;

    if (!templateChanged) {
      // Template unchanged — only report user modifications
      recordByUserModification(key, userModified);
    } else {
      // Template was updated in new version
      result.outdated.push({ key, templatePath: templateEntry.templatePath });
      if (userModified) {
        result.conflict.push({ key, templatePath: templateEntry.templatePath });
      } else {
        result.autoUpdate.push({ key, templatePath: templateEntry.templatePath });
      }
    }
  }

  // 2. Find new files (in template map but not in stored hashes).
  // Gate is the same predicate used for missingExpected: always-scaffolded types,
  // selected optional agents only, template skills excluded (need substitution).
  for (const [key, entry] of Object.entries(templateMap)) {
    if (processedKeys.has(key)) continue;
    if (!isAlwaysScaffolded(entry, meta)) continue;
    result.newFiles.push({ key, templatePath: entry.templatePath, type: entry.type });
  }

  // 3. Find user-added files (on disk but not in stored hashes or template map)
  try {
    const allFiles = await listFilesRecursive(claudeDir);
    for (const filePath of allFiles) {
      const relKey = path.relative(claudeDir, filePath).split(path.sep).join('/');
      if (relKey === 'workflow-meta.json' || relKey === 'settings.json') continue;
      if (processedKeys.has(relKey)) continue;
      if (templateMap[relKey]) continue; // It's a known template file (maybe new)
      result.userAdded.push({ key: relKey, fullPath: filePath });
    }
  } catch {
    // .claude/ directory might not exist or be empty
  }

  return result;
}
