import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  requireWorkflowMeta,
  readWorkflowMeta,
  workflowMetaExists,
  writeWorkflowMeta,
  createWorkflowMeta,
  computeFileHashes,
  getPackageVersionSync,
  getPackageVersion,
} from '../../src/core/config.js';

describe('config', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-config-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('requireWorkflowMeta', () => {
    it('returns not-installed when workflow-meta.json does not exist', async () => {
      const { meta, error } = await requireWorkflowMeta(tmpDir);
      expect(error).toBe('not-installed');
      expect(meta).toBeNull();
    });

    it('returns corrupted when workflow-meta.json is invalid JSON', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), '{not valid');

      const { meta, error } = await requireWorkflowMeta(tmpDir);
      expect(error).toBe('corrupted');
      expect(meta).toBeNull();
    });

    it('returns meta on success', async () => {
      const metaObj = createWorkflowMeta({
        projectTypes: ['CLI tool'],
        techStack: ['node'],
        universalAgents: [],
        optionalAgents: [],
        version: '2.0.0',
      });
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'workflow-meta.json'),
        JSON.stringify(metaObj, null, 2)
      );

      const { meta, error } = await requireWorkflowMeta(tmpDir);
      expect(error).toBeNull();
      expect(meta.version).toBe('2.0.0');
      expect(meta.projectTypes).toEqual(['CLI tool']);
    });
  });

  describe('workflowMetaExists', () => {
    it('returns false when file does not exist', async () => {
      expect(await workflowMetaExists(tmpDir)).toBe(false);
    });

    it('returns true when file exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), '{}');
      expect(await workflowMetaExists(tmpDir)).toBe(true);
    });
  });

  describe('readWorkflowMeta', () => {
    it('returns null when file does not exist', async () => {
      expect(await readWorkflowMeta(tmpDir)).toBeNull();
    });

    it('returns null for invalid JSON', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'broken');
      expect(await readWorkflowMeta(tmpDir)).toBeNull();
    });

    it('returns parsed object for valid JSON', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'workflow-meta.json'),
        JSON.stringify({ version: '1.0.0' })
      );
      const meta = await readWorkflowMeta(tmpDir);
      expect(meta.version).toBe('1.0.0');
    });
  });

  describe('writeWorkflowMeta', () => {
    it('writes meta as formatted JSON', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await writeWorkflowMeta(tmpDir, { version: '2.0.0', test: true });

      const raw = await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.version).toBe('2.0.0');
      expect(raw).toContain('\n'); // formatted
    });
  });

  describe('createWorkflowMeta', () => {
    it('creates meta with all fields', () => {
      const meta = createWorkflowMeta({
        projectTypes: ['Backend API'],
        techStack: ['python', 'node'],
        universalAgents: ['plan-reviewer'],
        optionalAgents: ['bug-fixer'],
        version: '2.0.0',
        useDocker: true,
      });
      expect(meta.version).toBe('2.0.0');
      expect(meta.projectTypes).toEqual(['Backend API']);
      expect(meta.techStack).toEqual(['python', 'node']);
      expect(meta.useDocker).toBe(true);
      expect(meta.installedAt).toBeTruthy();
      expect(meta.lastUpdated).toBeTruthy();
    });

    it('defaults version to 1.0.0 and useDocker to false', () => {
      const meta = createWorkflowMeta({
        projectTypes: [],
        techStack: [],
        universalAgents: [],
        optionalAgents: [],
      });
      expect(meta.version).toBe('1.0.0');
      expect(meta.useDocker).toBe(false);
      expect(meta.fileHashes).toEqual({});
    });
  });

  describe('computeFileHashes', () => {
    it('computes hashes for files in .claude directory', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'test.md'), '# Test agent');
      await fs.writeFile(path.join(tmpDir, '.claude', 'test-skill.md'), '# Test skill');

      const hashes = await computeFileHashes(tmpDir);
      expect(hashes['agents/test.md']).toBeTruthy();
      expect(hashes['test-skill.md']).toBeTruthy();
    });

    it('excludes workflow-meta.json, settings.json, and sessions/', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'sessions'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), '{}');
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{}');
      await fs.writeFile(path.join(tmpDir, '.claude', 'sessions', 'test.md'), '# Session');
      await fs.writeFile(path.join(tmpDir, '.claude', 'keep.md'), '# Keep');

      const hashes = await computeFileHashes(tmpDir);
      expect(hashes['workflow-meta.json']).toBeUndefined();
      expect(hashes['settings.json']).toBeUndefined();
      expect(hashes['sessions/test.md']).toBeUndefined();
      expect(hashes['keep.md']).toBeTruthy();
    });
  });

  describe('getPackageVersionSync', () => {
    it('returns a semver string', () => {
      const version = getPackageVersionSync();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('getPackageVersion', () => {
    it('returns same version as sync variant', async () => {
      const asyncVersion = await getPackageVersion();
      const syncVersion = getPackageVersionSync();
      expect(asyncVersion).toBe(syncVersion);
    });
  });
});
