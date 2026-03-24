import path from 'node:path';
import fs from 'fs-extra';
import {
  fileExists,
  dirExists,
  copyFile,
  copyDirectory,
  removeDirectory,
  ensureDir,
} from '../utils/file.js';

function generateTimestamp() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date}-${time}`;
}

export async function createBackup(projectRoot) {
  const timestamp = generateTimestamp();
  const backupDir = path.join(projectRoot, `.claude-backup-${timestamp}`);
  await ensureDir(backupDir);

  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (await fileExists(claudeMdPath)) {
    await copyFile(claudeMdPath, path.join(backupDir, 'CLAUDE.md'));
  }

  const claudeDir = path.join(projectRoot, '.claude');
  if (await dirExists(claudeDir)) {
    await copyDirectory(claudeDir, path.join(backupDir, '.claude'));
  }

  const mcpPath = path.join(projectRoot, '.mcp.json');
  if (await fileExists(mcpPath)) {
    await copyFile(mcpPath, path.join(backupDir, '.mcp.json'));
  }

  return backupDir;
}

export async function listBackups(projectRoot) {
  const BACKUP_PATTERN = /^\.claude-backup-(\d{8}-\d{6})$/;
  let entries;
  try {
    entries = await fs.readdir(projectRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const backups = entries
    .filter((e) => e.isDirectory() && BACKUP_PATTERN.test(e.name))
    .map((e) => {
      const match = e.name.match(BACKUP_PATTERN);
      const timestamp = match[1];
      // Parse YYYYMMDD-HHMMSS into readable date
      const year = timestamp.slice(0, 4);
      const month = timestamp.slice(4, 6);
      const day = timestamp.slice(6, 8);
      const hour = timestamp.slice(9, 11);
      const min = timestamp.slice(11, 13);
      const sec = timestamp.slice(13, 15);
      return {
        path: path.join(projectRoot, e.name),
        timestamp,
        dateString: `${year}-${month}-${day} ${hour}:${min}:${sec}`,
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return backups;
}

export async function restoreBackup(projectRoot, backupPath) {
  const backupClaudeMd = path.join(backupPath, 'CLAUDE.md');
  if (await fileExists(backupClaudeMd)) {
    await copyFile(backupClaudeMd, path.join(projectRoot, 'CLAUDE.md'));
  }

  const backupClaudeDir = path.join(backupPath, '.claude');
  if (await dirExists(backupClaudeDir)) {
    const existingClaudeDir = path.join(projectRoot, '.claude');
    if (await dirExists(existingClaudeDir)) {
      await removeDirectory(existingClaudeDir);
    }
    await copyDirectory(backupClaudeDir, existingClaudeDir);
  }

  const backupMcp = path.join(backupPath, '.mcp.json');
  if (await fileExists(backupMcp)) {
    await copyFile(backupMcp, path.join(projectRoot, '.mcp.json'));
  }
}
