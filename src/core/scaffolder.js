import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { fileExists, readFile, writeFile } from '../utils/file.js';
import { UNIVERSAL_AGENTS } from '../data/agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getTemplatesDir() {
  return path.resolve(__dirname, '..', '..', 'templates');
}

export async function readTemplate(relativePath) {
  const fullPath = path.join(getTemplatesDir(), relativePath);
  return readFile(fullPath);
}

export function substituteVariables(content, variables) {
  return content.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export async function scaffoldFile(templateRelativePath, destRelativePath, variables, projectRoot) {
  const root = projectRoot || process.cwd();
  const template = await readTemplate(templateRelativePath);
  const content = substituteVariables(template, variables);
  const destPath = path.join(root, destRelativePath);
  await writeFile(destPath, content);
}

export async function scaffoldDirectory(templateDir, destDir, variables, projectRoot) {
  const root = projectRoot || process.cwd();
  const fs = await import('fs-extra');
  const templatesBase = getTemplatesDir();
  const srcDir = path.join(templatesBase, templateDir);

  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const templatePath = path.join(templateDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      await scaffoldFile(templatePath, destPath, variables, root);
    }
  }
}

export async function updateGitignore(projectDir) {
  const gitignorePath = path.join(projectDir, '.gitignore');
  const entries = [
    '.claude/sessions/',
    '.claude/settings.local.json',
    '.claude/workflow-meta.json',
    '.claude/worktrees/',
    '.claude-backup-*/',
    '.claude/learnings/',
    '.claude/.stop-hook-active',
  ];
  const header = '# Worclaude (generated workflow files)';

  let content = '';
  try {
    content = await fs.readFile(gitignorePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  // Migrate: remove old blanket .claude/ entry (and its header) if present
  const lines = content.split(/\r?\n/);
  const hasBlanketEntry = lines.some((l) => l.trim() === '.claude/');
  if (hasBlanketEntry) {
    const filtered = lines.filter((l) => {
      const t = l.trim();
      return t !== '.claude/' && t !== header;
    });
    content = filtered.join('\n');
  }

  const missing = entries.filter((entry) => !content.includes(entry));
  if (missing.length === 0 && !hasBlanketEntry) return false;

  if (missing.length > 0) {
    const needsNewline = content.length > 0 && !content.endsWith('\n');
    const addition = (needsNewline ? '\n' : '') + '\n' + header + '\n' + missing.join('\n') + '\n';
    content += addition;
  }

  await fs.writeFile(gitignorePath, content);
  return true;
}

export async function scaffoldHooks(projectRoot) {
  const hooksTemplateDir = path.join(getTemplatesDir(), 'hooks');
  const destDir = path.join(projectRoot, '.claude', 'hooks');
  await fs.ensureDir(destDir);

  const entries = await fs.readdir(hooksTemplateDir);
  for (const entry of entries) {
    if (!entry.endsWith('.cjs') && !entry.endsWith('.js')) continue;
    await fs.copy(path.join(hooksTemplateDir, entry), path.join(destDir, entry), {
      overwrite: false,
      errorOnExist: false,
    });
  }
}

export function slugifyPluginName(projectName) {
  const slug = String(projectName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'worclaude-plugin';
}

export async function scaffoldPluginJson(projectRoot, selections) {
  const destPath = path.join(projectRoot, '.claude-plugin', 'plugin.json');
  if (await fileExists(destPath)) return;

  const agents = [...UNIVERSAL_AGENTS, ...(selections.selectedAgents || [])].map(
    (a) => `./.claude/agents/${a}.md`
  );

  const plugin = {
    name: `${slugifyPluginName(selections.projectName)}-workflow`,
    version: '0.1.0',
    description: selections.description || `Claude Code workflow for ${selections.projectName}`,
    keywords: ['claude-code', 'workflow', 'worclaude'],
    agents,
    skills: ['./.claude/skills/'],
    commands: ['./.claude/commands/'],
  };

  await writeFile(destPath, JSON.stringify(plugin, null, 2) + '\n');
}

export async function scaffoldMemoryDocs(projectRoot) {
  const destDir = path.join(projectRoot, 'docs', 'memory');
  await fs.ensureDir(destDir);
  for (const file of ['decisions.md', 'preferences.md']) {
    const destPath = path.join(destDir, file);
    if (await fileExists(destPath)) continue;
    const content = await readTemplate(`memory/${file}`);
    await writeFile(destPath, content);
  }
}

export function mergeSettings(base, ...stacks) {
  const merged = JSON.parse(JSON.stringify(base));
  const baseAllow = merged.permissions?.allow || [];

  for (const stack of stacks) {
    if (!stack) continue;
    const stackAllow = stack.permissions?.allow || [];
    if (stackAllow.length > 0) {
      baseAllow.push(...stackAllow);
    }
  }

  merged.permissions.allow = [...new Set(baseAllow)];
  return merged;
}
