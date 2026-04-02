import path from 'node:path';
import { hashContent, hashFile } from '../utils/hash.js';
import { readTemplate } from './scaffolder.js';
import { fileExists, listFilesRecursive } from '../utils/file.js';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
} from '../data/agents.js';

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
    map[key] = { templatePath, hash: hashContent(content), type: 'optional-agent' };
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
    deleted: [],
    userAdded: [],
    modified: [],
    outdated: [],
  };

  // Track which keys we've processed
  const processedKeys = new Set();

  // 1. Process each file in stored hashes
  for (const [key, storedHash] of Object.entries(storedHashes)) {
    processedKeys.add(key);
    const filePath = path.join(claudeDir, ...key.split('/'));

    // Check if file still exists on disk
    if (!(await fileExists(filePath))) {
      result.deleted.push({ key });
      continue;
    }

    // Compute current on-disk hash
    const currentHash = await hashFile(filePath);
    const userModified = currentHash !== storedHash;

    // Look up in template map
    const templateEntry = templateMap[key];

    if (!templateEntry) {
      // File is in stored hashes but not in template map — treat as tracked file
      if (userModified) {
        result.modified.push({ key });
      } else {
        result.unchanged.push({ key });
      }
      continue;
    }

    // Skip template skills from outdated detection (raw vs substituted hash mismatch)
    if (templateEntry.type === 'template-skill') {
      if (userModified) {
        result.modified.push({ key });
      } else {
        result.unchanged.push({ key });
      }
      continue;
    }

    const templateChanged = templateEntry.hash !== storedHash;

    if (!templateChanged) {
      // Template unchanged — only report user modifications
      if (userModified) {
        result.modified.push({ key });
      } else {
        result.unchanged.push({ key });
      }
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

  // 2. Find new files (in template map but not in stored hashes)
  for (const [key, entry] of Object.entries(templateMap)) {
    if (processedKeys.has(key)) continue;

    // Skip optional agents the user didn't select
    if (entry.type === 'optional-agent') {
      const agentName = key.replace('agents/', '').replace('.md', '');
      if (!meta.optionalAgents?.includes(agentName)) {
        continue;
      }
    }

    // Skip template skills (would need variable substitution)
    if (entry.type === 'template-skill') continue;

    result.newFiles.push({ key, templatePath: entry.templatePath });
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
