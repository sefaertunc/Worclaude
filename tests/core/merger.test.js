import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

// Mock prompts
vi.mock('../../src/prompts/conflict-resolution.js', () => ({
  promptHookConflict: vi.fn().mockResolvedValue('keep'),
}));

vi.mock('../../src/prompts/claude-md-merge.js', () => ({
  promptClaudeMdMerge: vi.fn().mockResolvedValue('keep'),
  generateWorkflowSuggestions: vi
    .fn()
    .mockReturnValue('# Workflow Suggestions\n\nSuggested content.'),
  detectMissingSections: vi.fn().mockReturnValue(['Session Protocol', 'Critical Rules']),
  interactiveSectionMerge: vi.fn(),
}));

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});

import { performMerge, buildSettingsJson } from '../../src/core/merger.js';
import { promptHookConflict } from '../../src/prompts/conflict-resolution.js';
import { COMMAND_FILES } from '../../src/data/agents.js';

describe('merger', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-merger-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  describe('buildSettingsJson', () => {
    it('builds settings with node permissions', async () => {
      const { settingsStr, settingsObject } = await buildSettingsJson(['node'], false);
      expect(settingsObject.permissions.allow).toContain('Bash(npm:*)');
      expect(settingsStr).toContain('prettier');
    });

    it('chains multiple formatters', async () => {
      const { settingsStr } = await buildSettingsJson(['python', 'node'], false);
      expect(settingsStr).toContain('ruff format . || true && npx prettier --write . || true');
    });
  });

  describe('buildSettingsJson - Windows platform', () => {
    let platformSpy;

    beforeEach(() => {
      platformSpy = vi.spyOn(os, 'platform').mockReturnValue('win32');
    });

    afterEach(() => {
      platformSpy.mockRestore();
    });

    it('uses win32 notification command on Windows', async () => {
      const { settingsStr } = await buildSettingsJson(['node'], false);
      expect(settingsStr).toContain('powershell -command');
      expect(settingsStr).toContain('New-BurntToastNotification');
    });

    it('formatter commands are identical on Windows (hooks run in bash)', async () => {
      const { settingsStr } = await buildSettingsJson(['python'], false);
      expect(settingsStr).toContain('ruff format . || true');
    });

    it('PostCompact command is identical on Windows (hooks run in bash)', async () => {
      const { settingsStr } = await buildSettingsJson(['node'], false);
      expect(settingsStr).toContain(
        'cat CLAUDE.md && cat docs/spec/PROGRESS.md 2>/dev/null || true'
      );
    });

    it('chains multiple formatters identically on Windows', async () => {
      const { settingsStr } = await buildSettingsJson(['python', 'node'], false);
      expect(settingsStr).toContain('ruff format . || true && npx prettier --write . || true');
    });

    it('handles "other" language fallback on Windows', async () => {
      const { settingsStr } = await buildSettingsJson(['other'], false);
      expect(settingsStr).toContain("echo 'No formatter configured'");
    });
  });

  describe('performMerge', () => {
    const baseSelections = {
      projectName: 'test-merge',
      description: 'Test merge project',
      projectTypes: ['CLI tool'],
      languages: ['node'],
      useDocker: false,
      selectedAgents: ['bug-fixer'],
    };

    const baseVariables = {
      project_name: 'test-merge',
      description: 'Test merge project',
      tech_stack_filled_during_init: '- Node.js / TypeScript',
      tech_stack: '- Node.js / TypeScript',
      tech_stack_table: 'Node.js / TypeScript',
      docker_row: '',
      commands_filled_during_init: '```bash\nnpm test\n```',
      project_specific_skills: '- backend-conventions.md — Run /setup to fill automatically',
      timestamp: new Date().toISOString(),
    };

    it('adds missing skills (Tier 1)', async () => {
      // Scan with no existing skills
      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.added.skills.length).toBeGreaterThan(0);
      expect(report.conflicts.skills).toEqual([]);

      // Verify files created
      const skillPath = path.join(tmpDir, '.claude', 'skills', 'context-management.md');
      expect(await fs.pathExists(skillPath)).toBe(true);
    });

    it('saves conflicting skills as .workflow-ref.md (Tier 2)', async () => {
      // Pre-create a conflicting skill
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'skills', 'context-management.md'),
        '# My custom context rules'
      );

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: ['context-management.md'],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.conflicts.skills).toContain('context-management.md');

      // Original file untouched
      const original = await fs.readFile(
        path.join(tmpDir, '.claude', 'skills', 'context-management.md'),
        'utf-8'
      );
      expect(original).toBe('# My custom context rules');

      // .workflow-ref.md created alongside
      const refPath = path.join(tmpDir, '.claude', 'skills', 'context-management.workflow-ref.md');
      expect(await fs.pathExists(refPath)).toBe(true);
    });

    it('adds missing agents (Tier 1)', async () => {
      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      // 5 universal + 1 optional (bug-fixer)
      expect(report.added.agents).toHaveLength(6);

      const agentPath = path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md');
      expect(await fs.pathExists(agentPath)).toBe(true);
      const bugFixerPath = path.join(tmpDir, '.claude', 'agents', 'bug-fixer.md');
      expect(await fs.pathExists(bugFixerPath)).toBe(true);
    });

    it('adds missing commands (Tier 1)', async () => {
      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.added.commands).toHaveLength(COMMAND_FILES.length);

      const setupPath = path.join(tmpDir, '.claude', 'commands', 'setup.md');
      expect(await fs.pathExists(setupPath)).toBe(true);
    });

    it('creates settings.json fresh when none exists', async () => {
      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      await performMerge(tmpDir, scan, baseSelections, baseVariables);
      const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
      expect(await fs.pathExists(settingsPath)).toBe(true);
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
      expect(settings.permissions.allow).toContain('Bash(npm:*)');
    });

    it('appends new permissions to existing settings (Tier 1)', async () => {
      // Pre-create settings with one custom permission
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: { allow: ['Bash(my-tool:*)'] },
          hooks: {},
        })
      );

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: true,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.added.permissions).toBeGreaterThan(0);

      const settings = JSON.parse(
        await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8')
      );
      // Custom permission preserved
      expect(settings.permissions.allow).toContain('Bash(my-tool:*)');
      // Workflow permissions appended
      expect(settings.permissions.allow).toContain('Bash(npm:*)');
    });

    it('detects hook matcher conflicts (Tier 3)', async () => {
      // Pre-create settings with a conflicting hook
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: { allow: [] },
          hooks: {
            PostToolUse: [
              {
                matcher: 'Write|Edit',
                hooks: [{ type: 'command', command: 'eslint --fix . || true' }],
              },
            ],
          },
        })
      );

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: true,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      promptHookConflict.mockResolvedValue('keep');
      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.hookConflicts.length).toBeGreaterThan(0);
      expect(promptHookConflict).toHaveBeenCalled();
    });

    it('falls back to fresh settings when existing settings.json has invalid JSON', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));
      await fs.writeFile(path.join(tmpDir, '.claude', 'settings.json'), 'BROKEN JSON');

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: true,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.added.permissions).toBeGreaterThan(0);

      // Should have written valid JSON
      const raw = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
      const settings = JSON.parse(raw);
      expect(settings.permissions.allow).toBeDefined();
      expect(settings.permissions.allow.length).toBeGreaterThan(0);
    });

    it('skips PROGRESS.md and SPEC.md when they exist', async () => {
      await fs.ensureDir(path.join(tmpDir, 'docs', 'spec'));
      await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'), '# My Progress');
      await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'), '# My Spec');

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: true,
        hasSpecMd: true,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.skipped.progressMd).toBe(true);
      expect(report.skipped.specMd).toBe(true);

      // Original content preserved
      const progress = await fs.readFile(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'), 'utf-8');
      expect(progress).toBe('# My Progress');
    });

    it('creates CLAUDE.md when it does not exist', async () => {
      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.claudeMdHandling).toBe('created');
      expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    });

    it('creates agent-routing.md during merge', async () => {
      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.added.skills).toContain('agent-routing.md');

      const routingPath = path.join(tmpDir, '.claude', 'skills', 'agent-routing.md');
      expect(await fs.pathExists(routingPath)).toBe(true);
      const content = await fs.readFile(routingPath, 'utf-8');
      expect(content).toContain('# Agent Routing Guide');
      expect(content).toContain('bug-fixer');
    });

    it('saves agent-routing.md as .workflow-ref.md when conflict exists', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'skills', 'agent-routing.md'),
        '# My custom routing'
      );

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: false,
        claudeMdLineCount: 0,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: ['agent-routing.md'],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.conflicts.skills).toContain('agent-routing.md');

      // Original preserved
      const original = await fs.readFile(
        path.join(tmpDir, '.claude', 'skills', 'agent-routing.md'),
        'utf-8'
      );
      expect(original).toBe('# My custom routing');

      // .workflow-ref.md created
      const refPath = path.join(tmpDir, '.claude', 'skills', 'agent-routing.workflow-ref.md');
      expect(await fs.pathExists(refPath)).toBe(true);
      const refContent = await fs.readFile(refPath, 'utf-8');
      expect(refContent).toContain('# Agent Routing Guide');
    });

    it('generates suggestions file for existing CLAUDE.md (Tier 3)', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My Project\n\nDescription.');

      const scan = {
        hasClaudeDir: true,
        hasClaudeMd: true,
        claudeMdLineCount: 3,
        hasSettingsJson: false,
        hasMcpJson: false,
        existingSkills: [],
        existingAgents: [],
        existingCommands: [],
        hasProgressMd: false,
        hasSpecMd: false,
      };

      const report = await performMerge(tmpDir, scan, baseSelections, baseVariables);
      expect(report.claudeMdHandling).toBe('suggestions-generated');

      const suggestionsPath = path.join(tmpDir, 'CLAUDE.md.workflow-suggestions');
      expect(await fs.pathExists(suggestionsPath)).toBe(true);

      // Original CLAUDE.md untouched
      const original = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(original).toBe('# My Project\n\nDescription.');
    });
  });
});
