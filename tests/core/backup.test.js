import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { createBackup, listBackups, restoreBackup } from '../../src/core/backup.js';

describe('backup', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-backup-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('createBackup', () => {
    it('creates backup directory with timestamp format', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      const backupPath = await createBackup(tmpDir);
      const dirName = path.basename(backupPath);
      expect(dirName).toMatch(/^\.claude-backup-\d{8}-\d{6}$/);
      expect(await fs.pathExists(backupPath)).toBe(true);
    });

    it('copies CLAUDE.md when it exists', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My Project');
      const backupPath = await createBackup(tmpDir);
      const content = await fs.readFile(path.join(backupPath, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('# My Project');
    });

    it('copies .claude/ directory when it exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{"test":true}');
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'test.md'), '# Test');
      const backupPath = await createBackup(tmpDir);
      expect(await fs.pathExists(path.join(backupPath, '.claude', 'settings.json'))).toBe(true);
      expect(await fs.pathExists(path.join(backupPath, '.claude', 'skills', 'test.md'))).toBe(true);
    });

    it('copies .mcp.json when it exists', async () => {
      await fs.writeFile(path.join(tmpDir, '.mcp.json'), '{"mcpServers":{}}');
      const backupPath = await createBackup(tmpDir);
      expect(await fs.pathExists(path.join(backupPath, '.mcp.json'))).toBe(true);
    });

    it('handles missing files gracefully', async () => {
      // No CLAUDE.md, no .claude/, no .mcp.json
      const backupPath = await createBackup(tmpDir);
      expect(await fs.pathExists(backupPath)).toBe(true);
      const files = await fs.readdir(backupPath);
      expect(files).toHaveLength(0);
    });
  });

  describe('listBackups', () => {
    it('returns empty array when no backups exist', async () => {
      const backups = await listBackups(tmpDir);
      expect(backups).toEqual([]);
    });

    it('returns backups sorted by date descending', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude-backup-20260324-100000'));
      await fs.ensureDir(path.join(tmpDir, '.claude-backup-20260324-120000'));
      await fs.ensureDir(path.join(tmpDir, '.claude-backup-20260323-090000'));
      const backups = await listBackups(tmpDir);
      expect(backups).toHaveLength(3);
      expect(backups[0].timestamp).toBe('20260324-120000');
      expect(backups[1].timestamp).toBe('20260324-100000');
      expect(backups[2].timestamp).toBe('20260323-090000');
    });

    it('ignores non-backup directories', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.ensureDir(path.join(tmpDir, 'node_modules'));
      await fs.ensureDir(path.join(tmpDir, '.claude-backup-20260324-100000'));
      const backups = await listBackups(tmpDir);
      expect(backups).toHaveLength(1);
    });

    it('includes readable date strings', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude-backup-20260324-143022'));
      const backups = await listBackups(tmpDir);
      expect(backups[0].dateString).toBe('2026-03-24 14:30:22');
    });
  });

  describe('restoreBackup', () => {
    it('restores all backed-up files', async () => {
      // Create original files
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Original');
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{"original":true}');

      // Create backup
      const backupPath = await createBackup(tmpDir);

      // Modify originals
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Modified');
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{"modified":true}');

      // Restore
      await restoreBackup(tmpDir, backupPath);

      const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toBe('# Original');
      const settings = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
      expect(settings).toBe('{"original":true}');
    });
  });
});
