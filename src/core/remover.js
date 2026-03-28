import path from 'node:path';
import { hashFile } from '../utils/hash.js';
import {
  fileExists,
  dirExists,
  readFile,
  writeFile,
  listFiles,
  listFilesRecursive,
  removeDirectory,
} from '../utils/file.js';

/**
 * Classify .claude/ files into safe-to-delete, modified, missing, and user-owned.
 * Uses only on-disk hash vs. stored hash (no template hash comparison).
 */
export async function classifyClaudeFiles(projectRoot, meta) {
  const claudeDir = path.join(projectRoot, '.claude');
  const fileHashes = meta.fileHashes || {};

  const safeToDelete = [];
  const modified = [];
  const missing = [];
  const userOwned = [];

  // Classify tracked files by comparing on-disk hash to stored hash
  for (const [key, storedHash] of Object.entries(fileHashes)) {
    const filePath = path.join(claudeDir, ...key.split('/'));
    if (!(await fileExists(filePath))) {
      missing.push(key);
      continue;
    }
    const currentHash = await hashFile(filePath);
    if (currentHash === storedHash) {
      safeToDelete.push(key);
    } else {
      modified.push(key);
    }
  }

  // workflow-meta.json is always worclaude's — safe to delete
  if (await fileExists(path.join(claudeDir, 'workflow-meta.json'))) {
    safeToDelete.push('workflow-meta.json');
  }

  // Scan disk for files not in fileHashes
  const allTrackedKeys = new Set([
    ...Object.keys(fileHashes),
    'workflow-meta.json',
    'settings.json',
  ]);
  const allDiskFiles = await listFilesRecursive(claudeDir);

  for (const fp of allDiskFiles) {
    const relKey = path.relative(claudeDir, fp).split(path.sep).join('/');
    if (allTrackedKeys.has(relKey)) continue;

    // .workflow-ref.md files are upgrade artifacts — safe to delete
    if (relKey.endsWith('.workflow-ref.md')) {
      safeToDelete.push(relKey);
    } else {
      userOwned.push(relKey);
    }
  }

  return { safeToDelete, modified, missing, userOwned };
}

/**
 * Detect root-level files that worclaude creates or modifies.
 * settings.json is included here since it may contain user customizations.
 */
export async function detectRootFiles(projectRoot) {
  const candidates = [
    {
      path: path.join('.claude', 'settings.json'),
      label: '.claude/settings.json (permissions & hooks)',
    },
    { path: 'CLAUDE.md', label: 'CLAUDE.md' },
    { path: '.mcp.json', label: '.mcp.json' },
    { path: path.join('docs', 'spec', 'PROGRESS.md'), label: 'docs/spec/PROGRESS.md' },
    { path: path.join('docs', 'spec', 'SPEC.md'), label: 'docs/spec/SPEC.md' },
  ];

  const found = [];
  for (const c of candidates) {
    if (await fileExists(path.join(projectRoot, c.path))) {
      found.push(c);
    }
  }

  // CLAUDE.md.workflow-suggestions is an upgrade artifact
  const suggestionsPath = 'CLAUDE.md.workflow-suggestions';
  if (await fileExists(path.join(projectRoot, suggestionsPath))) {
    found.push({ path: suggestionsPath, label: suggestionsPath });
  }

  return found;
}

/**
 * Delete specified files from .claude/ and clean up empty directories.
 * Uses fs.remove (via removeDirectory) which handles both files and directories.
 */
export async function removeTrackedFiles(projectRoot, fileKeys) {
  const claudeDir = path.join(projectRoot, '.claude');
  let removedCount = 0;

  for (const key of fileKeys) {
    const filePath = path.join(claudeDir, ...key.split('/'));
    if (await fileExists(filePath)) {
      await removeDirectory(filePath);
      removedCount++;
    }
  }

  // Clean up empty subdirectories
  for (const subdir of ['agents', 'commands', 'skills']) {
    const dirPath = path.join(claudeDir, subdir);
    if (await dirExists(dirPath)) {
      const remaining = await listFiles(dirPath);
      if (remaining.length === 0) {
        await removeDirectory(dirPath);
      }
    }
  }

  // Remove .claude/ itself only if completely empty
  if (await dirExists(claudeDir)) {
    const remaining = await listFilesRecursive(claudeDir);
    if (remaining.length === 0) {
      await removeDirectory(claudeDir);
    }
  }

  return removedCount;
}

/**
 * Delete specified root-level files and clean up empty docs directories.
 */
export async function removeRootFiles(projectRoot, filePaths) {
  let removedCount = 0;

  for (const relPath of filePaths) {
    const fullPath = path.join(projectRoot, relPath);
    if (await fileExists(fullPath)) {
      await removeDirectory(fullPath);
      removedCount++;
    }
  }

  // Clean up empty docs/spec/ then docs/
  const specDir = path.join(projectRoot, 'docs', 'spec');
  if (await dirExists(specDir)) {
    const remaining = await listFiles(specDir);
    if (remaining.length === 0) {
      await removeDirectory(specDir);

      const docsDir = path.join(projectRoot, 'docs');
      if (await dirExists(docsDir)) {
        const docsRemaining = await listFilesRecursive(docsDir);
        if (docsRemaining.length === 0) {
          await removeDirectory(docsDir);
        }
      }
    }
  }

  return removedCount;
}

/**
 * Remove worclaude entries from .gitignore.
 * Matches lines individually. Keeps .claude-backup-* / so backups stay git-ignored.
 */
export async function cleanGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!(await fileExists(gitignorePath))) return false;

  const content = await readFile(gitignorePath);
  const lines = content.split(/\r?\n/);

  const REMOVE_LINES = new Set(['# Worclaude (generated workflow files)', '.claude/']);

  const filtered = lines.filter((line) => !REMOVE_LINES.has(line.trim()));

  // Collapse consecutive blank lines (max 2 in a row)
  const cleaned = [];
  let blankCount = 0;
  for (const line of filtered) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) cleaned.push(line);
    } else {
      blankCount = 0;
      cleaned.push(line);
    }
  }

  // Trim trailing blank lines
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
    cleaned.pop();
  }
  // Ensure file ends with newline if non-empty
  const newContent = cleaned.length > 0 ? cleaned.join('\n') + '\n' : '';

  if (newContent !== content) {
    await writeFile(gitignorePath, newContent);
    return true;
  }
  return false;
}
