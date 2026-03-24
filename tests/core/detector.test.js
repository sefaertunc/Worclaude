import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { detectScenario, scanExistingSetup } from '../../src/core/detector.js';

describe('detector', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-detector-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('detectScenario', () => {
    it('returns "fresh" for empty directory', async () => {
      expect(await detectScenario(tmpDir)).toBe('fresh');
    });

    it('returns "existing" when .claude/ exists without workflow-meta.json', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      expect(await detectScenario(tmpDir)).toBe('existing');
    });

    it('returns "existing" when only CLAUDE.md exists', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My Project');
      expect(await detectScenario(tmpDir)).toBe('existing');
    });

    it('returns "existing" when both .claude/ and CLAUDE.md exist but no meta', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My Project');
      expect(await detectScenario(tmpDir)).toBe('existing');
    });

    it('returns "upgrade" when workflow-meta.json exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'workflow-meta.json'),
        JSON.stringify({ version: '1.0.0' })
      );
      expect(await detectScenario(tmpDir)).toBe('upgrade');
    });
  });

  describe('scanExistingSetup', () => {
    it('returns all false/empty for empty directory', async () => {
      const scan = await scanExistingSetup(tmpDir);
      expect(scan.hasClaudeDir).toBe(false);
      expect(scan.hasClaudeMd).toBe(false);
      expect(scan.claudeMdLineCount).toBe(0);
      expect(scan.hasSettingsJson).toBe(false);
      expect(scan.hasMcpJson).toBe(false);
      expect(scan.existingSkills).toEqual([]);
      expect(scan.existingAgents).toEqual([]);
      expect(scan.existingCommands).toEqual([]);
      expect(scan.hasProgressMd).toBe(false);
      expect(scan.hasSpecMd).toBe(false);
    });

    it('detects CLAUDE.md with correct line count', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'line1\nline2\nline3');
      const scan = await scanExistingSetup(tmpDir);
      expect(scan.hasClaudeMd).toBe(true);
      expect(scan.claudeMdLineCount).toBe(3);
    });

    it('detects existing skills', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'context-management.md'), '# CM');
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'testing.md'), '# Testing');
      const scan = await scanExistingSetup(tmpDir);
      expect(scan.existingSkills).toHaveLength(2);
      expect(scan.existingSkills).toContain('context-management.md');
      expect(scan.existingSkills).toContain('testing.md');
    });

    it('detects settings.json and mcp.json', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), '{}');
      await fs.writeFile(path.join(tmpDir, '.mcp.json'), '{}');
      const scan = await scanExistingSetup(tmpDir);
      expect(scan.hasSettingsJson).toBe(true);
      expect(scan.hasMcpJson).toBe(true);
    });

    it('detects docs/spec files', async () => {
      await fs.ensureDir(path.join(tmpDir, 'docs', 'spec'));
      await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'), '# Progress');
      await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'), '# Spec');
      const scan = await scanExistingSetup(tmpDir);
      expect(scan.hasProgressMd).toBe(true);
      expect(scan.hasSpecMd).toBe(true);
    });
  });
});
