import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { readFile, writeFile } from '../utils/file.js';

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
  const entries = ['.claude/sessions/', '.claude/workflow-meta.json', '.claude-backup-*/'];
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
