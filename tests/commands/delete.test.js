import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent } from '../../src/utils/hash.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
    Separator: class Separator {},
  },
}));

// Mock ora
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { deleteCommand } from '../../src/commands/delete.js';
import {
  classifyClaudeFiles,
  detectRootFiles,
  removeTrackedFiles,
  removeRootFiles,
  cleanGitignore,
} from '../../src/core/remover.js';

describe('delete command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-delete-cmd-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  // Helper: create a minimal worclaude setup with workflow-meta.json
  async function scaffoldMinimal(opts = {}) {
    const claudeDir = path.join(tmpDir, '.claude');
    await fs.ensureDir(path.join(claudeDir, 'agents'));
    await fs.ensureDir(path.join(claudeDir, 'commands'));
    await fs.ensureDir(path.join(claudeDir, 'skills'));

    const files = {
      'agents/plan-reviewer.md': '# Plan Reviewer Agent',
      'commands/start.md': '# Start Command',
      'skills/testing.md': '# Testing Skill',
    };

    const fileHashes = {};
    for (const [key, content] of Object.entries(files)) {
      await fs.writeFile(path.join(claudeDir, ...key.split('/')), content);
      fileHashes[key] = hashContent(content);
    }

    // Create settings.json
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({ permissions: { allow: [] } })
    );

    const meta = {
      version: '1.4.0',
      installedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      projectTypes: ['CLI tool'],
      techStack: ['node'],
      universalAgents: ['plan-reviewer'],
      optionalAgents: [],
      useDocker: false,
      fileHashes,
      ...opts.metaOverrides,
    };

    await fs.writeFile(path.join(claudeDir, 'workflow-meta.json'), JSON.stringify(meta, null, 2));

    // Root files
    if (opts.withRootFiles !== false) {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Project CLAUDE');
      await fs.writeFile(path.join(tmpDir, '.mcp.json'), '{}');
      await fs.ensureDir(path.join(tmpDir, 'docs', 'spec'));
      await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'), '# Progress');
      await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'), '# Spec');
    }

    // .gitignore
    if (opts.withGitignore !== false) {
      await fs.writeFile(
        path.join(tmpDir, '.gitignore'),
        'node_modules/\n\n# Worclaude (generated workflow files)\n.claude/\n.claude-backup-*/\n'
      );
    }

    return { fileHashes, meta };
  }

  // Helper: mock inquirer for a full delete flow (project-only, no modified, keep root, confirm)
  function mockFullDeleteFlow(overrides = {}) {
    let callCount = 0;
    inquirer.prompt.mockImplementation(() => {
      callCount++;
      // 1: mode selection
      if (callCount === 1) return Promise.resolve({ mode: overrides.mode || 'project' });
      // 2: modified files (only if there are modified files)
      if (overrides.hasModified && callCount === 2)
        return Promise.resolve({ modifiedAction: overrides.modifiedAction || 'delete' });
      // root files prompt
      const rootPromptIdx = overrides.hasModified ? 3 : 2;
      if (callCount === rootPromptIdx)
        return Promise.resolve({ rootAction: overrides.rootAction || 'keep' });
      // checkbox (only if rootAction === 'choose')
      if (overrides.rootAction === 'choose' && callCount === rootPromptIdx + 1)
        return Promise.resolve({ selected: overrides.selectedRootFiles || [] });
      // confirmation
      return Promise.resolve({
        confirm: overrides.confirm !== undefined ? overrides.confirm : true,
      });
    });
  }

  // ── Pre-flight ──

  describe('pre-flight checks', () => {
    it('shows error when no workflow-meta.json exists', async () => {
      await deleteCommand();
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('shows error when workflow-meta.json is corrupted', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), '{bad json!!!');
      await deleteCommand();
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('exits without prompts for missing workflow', async () => {
      // Just no .claude dir at all
      await deleteCommand();
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });

  // ── Cancellation ──

  describe('cancellation paths', () => {
    it('cancels when user selects Cancel in mode prompt', async () => {
      await scaffoldMinimal();
      inquirer.prompt.mockResolvedValueOnce({ mode: 'cancel' });
      await deleteCommand();
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
      // Files should still exist
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        true
      );
    });

    it('cancels when user declines final confirmation', async () => {
      await scaffoldMinimal();
      mockFullDeleteFlow({ confirm: false });
      await deleteCommand();
      // Files should still exist
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        true
      );
    });
  });

  // ── File Classification (remover.js unit tests) ──

  describe('classifyClaudeFiles', () => {
    it('classifies unmodified files as safeToDelete', async () => {
      const { meta } = await scaffoldMinimal();
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.safeToDelete).toContain('agents/plan-reviewer.md');
      expect(result.safeToDelete).toContain('commands/start.md');
      expect(result.safeToDelete).toContain('skills/testing.md');
    });

    it('classifies modified files as modified', async () => {
      const { meta } = await scaffoldMinimal();
      // Modify a tracked file
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
        '# My customized agent'
      );
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.modified).toContain('agents/plan-reviewer.md');
      expect(result.safeToDelete).not.toContain('agents/plan-reviewer.md');
    });

    it('classifies missing files as missing', async () => {
      const { meta } = await scaffoldMinimal();
      await fs.remove(path.join(tmpDir, '.claude', 'skills', 'testing.md'));
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.missing).toContain('skills/testing.md');
    });

    it('classifies user-added files as userOwned', async () => {
      const { meta } = await scaffoldMinimal();
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'), '# Custom');
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.userOwned).toContain('skills/my-custom.md');
    });

    it('classifies Claude Code system dirs as userOwned', async () => {
      const { meta } = await scaffoldMinimal();
      await fs.ensureDir(path.join(tmpDir, '.claude', 'worktrees'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'worktrees', 'some-file'), 'data');
      await fs.ensureDir(path.join(tmpDir, '.claude', 'projects'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'projects', 'config.json'), '{}');
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.userOwned).toContain('worktrees/some-file');
      expect(result.userOwned).toContain('projects/config.json');
    });

    it('classifies .workflow-ref.md files as safeToDelete', async () => {
      const { meta } = await scaffoldMinimal();
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'skills', 'testing.workflow-ref.md'),
        '# Reference'
      );
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.safeToDelete).toContain('skills/testing.workflow-ref.md');
    });

    it('always includes workflow-meta.json in safeToDelete', async () => {
      const { meta } = await scaffoldMinimal();
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.safeToDelete).toContain('workflow-meta.json');
    });

    it('works with empty fileHashes', async () => {
      await scaffoldMinimal({ metaOverrides: { fileHashes: {} } });
      const meta = { fileHashes: {} };
      const result = await classifyClaudeFiles(tmpDir, meta);
      expect(result.safeToDelete).toContain('workflow-meta.json');
      expect(result.modified).toHaveLength(0);
    });
  });

  // ── Root file detection ──

  describe('detectRootFiles', () => {
    it('detects all root files when present', async () => {
      await scaffoldMinimal();
      const found = await detectRootFiles(tmpDir);
      const labels = found.map((f) => f.label);
      expect(labels).toContain('.claude/settings.json (permissions & hooks)');
      expect(labels).toContain('CLAUDE.md');
      expect(labels).toContain('.mcp.json');
      expect(labels).toContain('docs/spec/PROGRESS.md');
      expect(labels).toContain('docs/spec/SPEC.md');
    });

    it('returns empty when no root files exist', async () => {
      await scaffoldMinimal({ withRootFiles: false });
      const found = await detectRootFiles(tmpDir);
      // settings.json is always created by scaffoldMinimal
      expect(found).toHaveLength(1);
      expect(found[0].label).toContain('settings.json');
    });
  });

  // ── File removal ──

  describe('removeTrackedFiles', () => {
    it('removes specified files from .claude/', async () => {
      await scaffoldMinimal();
      await removeTrackedFiles(tmpDir, ['agents/plan-reviewer.md', 'commands/start.md']);
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        false
      );
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'commands', 'start.md'))).toBe(false);
    });

    it('cleans up empty subdirectories', async () => {
      await scaffoldMinimal();
      await removeTrackedFiles(tmpDir, [
        'agents/plan-reviewer.md',
        'commands/start.md',
        'skills/testing.md',
        'workflow-meta.json',
      ]);
      // settings.json still exists, so .claude/ should remain
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'commands'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills'))).toBe(false);
    });

    it('preserves .claude/ when user files remain', async () => {
      await scaffoldMinimal();
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'), '# Custom');
      await removeTrackedFiles(tmpDir, [
        'agents/plan-reviewer.md',
        'commands/start.md',
        'skills/testing.md',
        'workflow-meta.json',
      ]);
      expect(await fs.pathExists(path.join(tmpDir, '.claude'))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'))).toBe(
        true
      );
    });

    it('removes .claude/ when completely empty', async () => {
      // Create minimal setup without settings.json
      const claudeDir = path.join(tmpDir, '.claude');
      await fs.ensureDir(path.join(claudeDir, 'agents'));
      const content = '# Agent';
      const hash = hashContent(content);
      await fs.writeFile(path.join(claudeDir, 'agents', 'test.md'), content);
      await fs.writeFile(
        path.join(claudeDir, 'workflow-meta.json'),
        JSON.stringify({ fileHashes: { 'agents/test.md': hash } })
      );

      await removeTrackedFiles(tmpDir, ['agents/test.md', 'workflow-meta.json']);
      expect(await fs.pathExists(claudeDir)).toBe(false);
    });
  });

  // ── Root file removal ──

  describe('removeRootFiles', () => {
    it('removes specified root files', async () => {
      await scaffoldMinimal();
      await removeRootFiles(tmpDir, ['CLAUDE.md', '.mcp.json']);
      expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, '.mcp.json'))).toBe(false);
      // Others should remain
      expect(await fs.pathExists(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'))).toBe(true);
    });

    it('cleans up empty docs/spec/ and docs/ directories', async () => {
      await scaffoldMinimal();
      await removeRootFiles(tmpDir, ['docs/spec/PROGRESS.md', 'docs/spec/SPEC.md']);
      expect(await fs.pathExists(path.join(tmpDir, 'docs', 'spec'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, 'docs'))).toBe(false);
    });

    it('preserves docs/ when other files exist', async () => {
      await scaffoldMinimal();
      await fs.writeFile(path.join(tmpDir, 'docs', 'README.md'), '# Docs');
      await removeRootFiles(tmpDir, ['docs/spec/PROGRESS.md', 'docs/spec/SPEC.md']);
      expect(await fs.pathExists(path.join(tmpDir, 'docs', 'spec'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, 'docs'))).toBe(true);
    });
  });

  // ── .gitignore cleanup ──

  describe('cleanGitignore', () => {
    it('removes worclaude header and .claude/ entry', async () => {
      await scaffoldMinimal();
      await cleanGitignore(tmpDir);
      const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).not.toContain('# Worclaude (generated workflow files)');
      expect(content).not.toContain('.claude/');
    });

    it('keeps .claude-backup-*/ entry', async () => {
      await scaffoldMinimal();
      await cleanGitignore(tmpDir);
      const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.claude-backup-*/');
    });

    it('preserves other entries', async () => {
      await scaffoldMinimal();
      await cleanGitignore(tmpDir);
      const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
    });

    it('handles missing .gitignore gracefully', async () => {
      await scaffoldMinimal({ withGitignore: false });
      const result = await cleanGitignore(tmpDir);
      expect(result).toBe(false);
    });

    it('handles CRLF line endings in .gitignore', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.gitignore'),
        'node_modules/\r\n\r\n# Worclaude (generated workflow files)\r\n.claude/\r\n.claude-backup-*/\r\n'
      );
      await cleanGitignore(tmpDir);
      const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).not.toContain('# Worclaude (generated workflow files)');
      expect(content).not.toContain('.claude/');
      expect(content).toContain('.claude-backup-*/');
      expect(content).toContain('node_modules/');
    });
  });

  // ── Integration: full delete flow ──

  describe('full delete flow', () => {
    it('removes unmodified files and creates backup', async () => {
      await scaffoldMinimal();
      mockFullDeleteFlow();
      await deleteCommand();

      // Tracked files should be removed
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        false
      );
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'commands', 'start.md'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'workflow-meta.json'))).toBe(false);

      // Root files should be kept (default)
      expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
      expect(await fs.pathExists(path.join(tmpDir, '.mcp.json'))).toBe(true);

      // Backup should exist
      const entries = await fs.readdir(tmpDir);
      const backupDirs = entries.filter((e) => e.startsWith('.claude-backup-'));
      expect(backupDirs.length).toBeGreaterThanOrEqual(1);
    });

    it('keeps modified files when user chooses keep', async () => {
      await scaffoldMinimal();
      // Modify a tracked file
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
        '# My customized'
      );

      mockFullDeleteFlow({ hasModified: true, modifiedAction: 'keep' });
      await deleteCommand();

      // Modified file should remain
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        true
      );
      const content = await fs.readFile(
        path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
        'utf-8'
      );
      expect(content).toBe('# My customized');
    });

    it('deletes modified files when user chooses delete', async () => {
      await scaffoldMinimal();
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
        '# My customized'
      );

      mockFullDeleteFlow({ hasModified: true, modifiedAction: 'delete' });
      await deleteCommand();

      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        false
      );
    });

    it('removes root files when user chooses remove all', async () => {
      await scaffoldMinimal();
      mockFullDeleteFlow({ rootAction: 'remove' });
      await deleteCommand();

      expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(false);
      expect(await fs.pathExists(path.join(tmpDir, '.mcp.json'))).toBe(false);
    });

    it('removes selected root files when user chooses pick', async () => {
      await scaffoldMinimal();
      mockFullDeleteFlow({
        rootAction: 'choose',
        selectedRootFiles: ['CLAUDE.md'],
      });
      await deleteCommand();

      expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(false);
      // Others should remain
      expect(await fs.pathExists(path.join(tmpDir, '.mcp.json'))).toBe(true);
    });

    it('cleans .gitignore during delete', async () => {
      await scaffoldMinimal();
      mockFullDeleteFlow();
      await deleteCommand();

      const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(content).not.toContain('# Worclaude (generated workflow files)');
      expect(content).not.toContain('\n.claude/\n');
    });

    it('preserves user-added files in .claude/', async () => {
      await scaffoldMinimal();
      await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'), '# Mine');
      mockFullDeleteFlow();
      await deleteCommand();

      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'))).toBe(
        true
      );
    });

    it('settings.json included in root files prompt, not auto-deleted', async () => {
      await scaffoldMinimal();
      mockFullDeleteFlow({ rootAction: 'keep' });
      await deleteCommand();

      // settings.json should still exist (kept by default with root files)
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'settings.json'))).toBe(true);
    });
  });

  // ── Global uninstall hint ──

  describe('global uninstall hint', () => {
    it('does not show hint in project-only mode', async () => {
      await scaffoldMinimal();
      const logCalls = [];
      console.log.mockImplementation((...args) => logCalls.push(args.join(' ')));

      mockFullDeleteFlow({ mode: 'project' });
      await deleteCommand();

      const output = logCalls.join('\n');
      expect(output).not.toContain('npm uninstall -g worclaude');
    });

    it('shows hint in global mode', async () => {
      await scaffoldMinimal();
      const logCalls = [];
      console.log.mockImplementation((...args) => logCalls.push(args.join(' ')));

      mockFullDeleteFlow({ mode: 'global' });
      await deleteCommand();

      const output = logCalls.join('\n');
      expect(output).toContain('npm uninstall -g worclaude');
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles files in fileHashes that are already gone from disk', async () => {
      await scaffoldMinimal();
      // Delete a tracked file before running delete command
      await fs.remove(path.join(tmpDir, '.claude', 'skills', 'testing.md'));

      mockFullDeleteFlow();
      // Should not throw
      await deleteCommand();

      // Other files should still be cleaned up
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        false
      );
    });

    it('handles .claude/ with only user-owned files', async () => {
      // Create a setup where all tracked files are missing but user files exist
      const claudeDir = path.join(tmpDir, '.claude');
      await fs.ensureDir(path.join(claudeDir, 'skills'));
      await fs.writeFile(path.join(claudeDir, 'skills', 'my-custom.md'), '# Custom');
      await fs.writeFile(
        path.join(claudeDir, 'workflow-meta.json'),
        JSON.stringify({
          version: '1.4.0',
          fileHashes: { 'agents/gone.md': 'abc123' },
        })
      );

      mockFullDeleteFlow();
      await deleteCommand();

      // User file should remain
      expect(await fs.pathExists(path.join(claudeDir, 'skills', 'my-custom.md'))).toBe(true);
      // .claude/ should remain since user files are there
      expect(await fs.pathExists(claudeDir)).toBe(true);
    });

    it('exits cleanly when no files selected for removal', async () => {
      // Setup with no tracked files (all missing) and user keeps root files
      const claudeDir = path.join(tmpDir, '.claude');
      await fs.ensureDir(claudeDir);
      await fs.writeFile(
        path.join(claudeDir, 'workflow-meta.json'),
        JSON.stringify({ version: '1.4.0', fileHashes: {} })
      );

      let callCount = 0;
      inquirer.prompt.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ mode: 'project' });
        if (callCount === 2) return Promise.resolve({ rootAction: 'keep' });
        return Promise.resolve({ confirm: true });
      });

      // Should handle gracefully — workflow-meta.json is the only deletable file
      await deleteCommand();
    });
  });
});
