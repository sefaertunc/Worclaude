/**
 * Phase 7: E2E Audit — v2.0.0 format verification tests.
 *
 * These tests verify all v2.0.0 changes work end-to-end across
 * Scenario A (fresh), Scenario B (existing), and Scenario C (upgrade).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
  COMMAND_FILES,
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  AGENT_CATEGORIES,
} from '../../src/data/agents.js';

// Mock inquirer before importing init
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock ora
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { initCommand } from '../../src/commands/init.js';

// ── Helpers ──

function setupFreshMocks({ allAgents = false, multiStack = false, memoryMd = false } = {}) {
  const categoryNames = Object.keys(AGENT_CATEGORIES);

  const responses = [
    { projectName: 'e2e-test', description: 'E2E audit project' },
    { projectTypes: ['Full-stack web application'] },
    { languages: multiStack ? ['node', 'python'] : ['node'] },
    { useDocker: false },
  ];

  if (allAgents) {
    responses.push({ selectedCategories: categoryNames });
    for (const cat of categoryNames) {
      responses.push({ selectedAgents: AGENT_CATEGORIES[cat].agents });
    }
    responses.push({ additionalCategories: [] });
  } else {
    responses.push({ selectedCategories: ['Quality'] });
    responses.push({ selectedAgents: ['bug-fixer'] });
    responses.push({ additionalCategories: [] });
  }

  responses.push({ includeMemoryMd: memoryMd });
  responses.push({ confirmation: 'yes' });

  let i = 0;
  inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));
}

// ── Scenario A: Fresh Project ──

describe('E2E Audit — Scenario A (fresh project)', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-fresh-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('all skills are in directory format (skill/SKILL.md)', async () => {
    setupFreshMocks();
    await initCommand();

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const flatMdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));
    expect(flatMdFiles).toHaveLength(0);

    const dirs = entries.filter((e) => e.isDirectory());
    expect(dirs.length).toBeGreaterThan(0);

    for (const dir of dirs) {
      const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');
      expect(await fs.pathExists(skillPath), `${dir.name}/SKILL.md should exist`).toBe(true);
    }
  });

  it('every skill has description AND when_to_use frontmatter', async () => {
    setupFreshMocks();
    await initCommand();

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const dirs = (await fs.readdir(skillsDir, { withFileTypes: true })).filter((e) =>
      e.isDirectory()
    );

    for (const dir of dirs) {
      const content = await fs.readFile(path.join(skillsDir, dir.name, 'SKILL.md'), 'utf8');
      // agent-routing is dynamically generated without frontmatter
      if (dir.name !== 'agent-routing') {
        expect(content, `${dir.name} should have description`).toContain('description:');
        expect(content, `${dir.name} should have when_to_use`).toContain('when_to_use:');
      }
    }
  });

  it('conditional skills have paths frontmatter', async () => {
    setupFreshMocks();
    await initCommand();

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const conditionalSkills = [
      'testing',
      'verification',
      'security-checklist',
      'backend-conventions',
      'frontend-design-system',
      'project-patterns',
    ];

    for (const name of conditionalSkills) {
      const skillPath = path.join(skillsDir, name, 'SKILL.md');
      if (await fs.pathExists(skillPath)) {
        const content = await fs.readFile(skillPath, 'utf8');
        expect(content, `${name} should have paths`).toContain('paths:');
      }
    }
  });

  it('always-loaded skills do NOT have paths frontmatter', async () => {
    setupFreshMocks();
    await initCommand();

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const alwaysLoaded = ['context-management', 'git-conventions', 'planning-with-files'];

    for (const name of alwaysLoaded) {
      const content = await fs.readFile(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
      expect(content, `${name} should NOT have paths`).not.toContain('paths:');
    }
  });

  it('coordinator-mode skill is present', async () => {
    setupFreshMocks();
    await initCommand();

    const skillPath = path.join(tmpDir, '.claude', 'skills', 'coordinator-mode', 'SKILL.md');
    expect(await fs.pathExists(skillPath)).toBe(true);
    const content = await fs.readFile(skillPath, 'utf8');
    expect(content).toContain('description:');
  });

  it('every agent has name AND description frontmatter', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const files = await fs.readdir(agentsDir);

    for (const file of files) {
      const content = await fs.readFile(path.join(agentsDir, file), 'utf8');
      expect(content, `${file} should have name`).toContain('name:');
      expect(content, `${file} should have description`).toContain('description:');
    }
  });

  it('read-only agents have disallowedTools and omitClaudeMd', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const readOnlyAgents = ['plan-reviewer.md', 'security-reviewer.md'];

    for (const name of readOnlyAgents) {
      const agentPath = path.join(agentsDir, name);
      if (await fs.pathExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf8');
        expect(content, `${name} should have disallowedTools`).toContain('disallowedTools:');
        expect(content, `${name} should have omitClaudeMd`).toContain('omitClaudeMd: true');
      }
    }
  });

  it('async agents have background: true', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const asyncAgents = ['verify-app.md', 'build-validator.md', 'e2e-runner.md'];

    for (const name of asyncAgents) {
      const agentPath = path.join(agentsDir, name);
      if (await fs.pathExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf8');
        expect(content, `${name} should have background: true`).toContain('background: true');
      }
    }
  });

  it('all agents have maxTurns', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const files = await fs.readdir(agentsDir);

    for (const file of files) {
      const content = await fs.readFile(path.join(agentsDir, file), 'utf8');
      expect(content, `${file} should have maxTurns`).toContain('maxTurns:');
    }
  });

  it('every command has description frontmatter', async () => {
    setupFreshMocks();
    await initCommand();

    const commandsDir = path.join(tmpDir, '.claude', 'commands');
    const files = await fs.readdir(commandsDir);

    for (const file of files) {
      const content = await fs.readFile(path.join(commandsDir, file), 'utf8');
      expect(content, `command ${file} should have description`).toContain('description:');
    }
  });

  it('verify-app has VERDICT format and anti-rationalization', async () => {
    setupFreshMocks();
    await initCommand();

    const content = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'verify-app.md'),
      'utf8'
    );
    expect(content).toContain('VERDICT');
    expect(content.toLowerCase()).toContain('rationalization');
  });

  it('multi-stack settings merge both language permissions', async () => {
    setupFreshMocks({ multiStack: true });
    await initCommand();

    const settings = await fs.readJson(path.join(tmpDir, '.claude', 'settings.json'));
    const allow = JSON.stringify(settings.permissions?.allow || []);
    expect(allow).toContain('npm');
    expect(allow).toContain('python');
  });

  it('workflow-meta hash keys use skills/name/SKILL.md format', async () => {
    setupFreshMocks();
    await initCommand();

    const meta = await fs.readJson(path.join(tmpDir, '.claude', 'workflow-meta.json'));
    const skillKeys = Object.keys(meta.fileHashes).filter((k) => k.startsWith('skills/'));
    expect(skillKeys.length).toBeGreaterThan(0);
    for (const key of skillKeys) {
      expect(key, `hash key ${key} should use SKILL.md format`).toMatch(/skills\/[^/]+\/SKILL\.md/);
    }
  });

  it('.gitignore has all 5 entries', async () => {
    setupFreshMocks();
    await initCommand();

    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('.claude/sessions/');
    expect(content).toContain('.claude/settings.local.json');
    expect(content).toContain('.claude/workflow-meta.json');
    expect(content).toContain('.claude/worktrees/');
    expect(content).toContain('.claude-backup-*/');
  });

  it('MEMORY.md created when opted in', async () => {
    setupFreshMocks({ memoryMd: true });
    await initCommand();

    expect(await fs.pathExists(path.join(tmpDir, 'MEMORY.md'))).toBe(true);
  });

  it('read-only agents have criticalSystemReminder', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const readOnlyAgents = ['plan-reviewer.md', 'security-reviewer.md', 'verify-app.md'];

    for (const name of readOnlyAgents) {
      const agentPath = path.join(agentsDir, name);
      if (await fs.pathExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf8');
        expect(content, `${name} should have criticalSystemReminder`).toContain(
          'criticalSystemReminder:'
        );
      }
    }
  });

  it('agents with skill dependencies have skills field', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const skillAgents = [
      { file: 'test-writer.md', skill: 'testing' },
      { file: 'security-reviewer.md', skill: 'security-checklist' },
    ];

    for (const { file, skill } of skillAgents) {
      const agentPath = path.join(agentsDir, file);
      if (await fs.pathExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf8');
        expect(content, `${file} should preload ${skill}`).toContain(`- ${skill}`);
      }
    }
  });

  it('verify-app has initialPrompt', async () => {
    setupFreshMocks();
    await initCommand();

    const content = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'verify-app.md'),
      'utf8'
    );
    expect(content).toContain('initialPrompt:');
  });

  it('universal skills have version field', async () => {
    setupFreshMocks();
    await initCommand();

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    for (const skill of UNIVERSAL_SKILLS) {
      const content = await fs.readFile(path.join(skillsDir, skill, 'SKILL.md'), 'utf8');
      expect(content, `${skill} should have version`).toContain('version:');
    }
  });

  it('memory: project set on correct agents', async () => {
    setupFreshMocks({ allAgents: true });
    await initCommand();

    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const memoryAgents = ['test-writer.md', 'security-reviewer.md', 'doc-writer.md'];

    for (const name of memoryAgents) {
      const agentPath = path.join(agentsDir, name);
      if (await fs.pathExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf8');
        expect(content, `${name} should have memory: project`).toContain('memory: project');
      }
    }
  });
});

// ── Scenario B: Existing Project ──

describe('E2E Audit — Scenario B (existing project)', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-existing-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('preserves existing custom files and adds new skills in directory format', async () => {
    // Create pre-existing content
    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My CLAUDE');
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'skills', 'my-custom.md'),
      '---\ndescription: my custom skill\n---\n# Custom'
    );
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'agents', 'my-agent.md'),
      '---\nname: my-agent\ndescription: custom agent\n---\nDo stuff'
    );

    // Mock for Scenario B: proceed=true, then standard prompts
    const responses = [
      { proceed: true }, // Scenario B confirmation
      { projectName: 'e2e-existing', description: 'E2E existing' },
      { projectTypes: ['CLI tool'] },
      { languages: ['node'] },
      { useDocker: false },
      { selectedCategories: [] },
      { additionalCategories: [] },
      { includeMemoryMd: false },
      { confirmation: 'yes' },
    ];
    let i = 0;
    inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

    await initCommand();

    // Existing custom skill preserved (Scenario B doesn't touch user files)
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'))).toBe(true);

    // Existing custom agent preserved
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'my-agent.md'))).toBe(true);

    // New skills added in directory format
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    expect(await fs.pathExists(path.join(skillsDir, 'testing', 'SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(skillsDir, 'git-conventions', 'SKILL.md'))).toBe(true);
  });
});

// ── Scenario C: Upgrade migration (direct function test) ──

describe('E2E Audit — Scenario C (migration functions)', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-upgrade-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('migrateSkillFormat moves flat skills to directory format', async () => {
    const { migrateSkillFormat } = await import('../../src/core/migration.js');
    const { hashFile } = await import('../../src/utils/hash.js');

    const claudeDir = path.join(tmpDir, '.claude');
    await fs.ensureDir(path.join(claudeDir, 'skills'));

    // Create flat skill (old v1.x format)
    const skillContent = '---\ndescription: test\nwhen_to_use: when testing\n---\n# Testing Skill';
    await fs.writeFile(path.join(claudeDir, 'skills', 'testing.md'), skillContent);
    const testingHash = await hashFile(path.join(claudeDir, 'skills', 'testing.md'));

    const meta = {
      fileHashes: { 'skills/testing.md': testingHash },
    };

    const report = await migrateSkillFormat(tmpDir, meta);

    // Flat file migrated to directory format
    expect(await fs.pathExists(path.join(claudeDir, 'skills', 'testing', 'SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(claudeDir, 'skills', 'testing.md'))).toBe(false);

    // Hash keys updated
    expect(meta.fileHashes['skills/testing/SKILL.md']).toBeDefined();
    expect(meta.fileHashes['skills/testing.md']).toBeUndefined();

    expect(report.migrated).toBe(1);
  });

  it('patchAgentDescriptions adds missing description to agents', async () => {
    const { patchAgentDescriptions } = await import('../../src/core/migration.js');
    const { hashFile } = await import('../../src/utils/hash.js');

    const claudeDir = path.join(tmpDir, '.claude');
    await fs.ensureDir(path.join(claudeDir, 'agents'));

    // Create agent without description (old format, unmodified)
    const agentContent = '---\nname: verify-app\nmodel: sonnet\n---\nVerify';
    await fs.writeFile(path.join(claudeDir, 'agents', 'verify-app.md'), agentContent);
    const agentHash = await hashFile(path.join(claudeDir, 'agents', 'verify-app.md'));

    const meta = {
      fileHashes: { 'agents/verify-app.md': agentHash },
    };

    const report = await patchAgentDescriptions(tmpDir, meta, async () => true);

    const patched = await fs.readFile(path.join(claudeDir, 'agents', 'verify-app.md'), 'utf8');
    expect(patched).toContain('description:');
    expect(report.autoPatched).toBeGreaterThanOrEqual(1);
  });
});

// ── Template count verification ──

describe('E2E Audit — template counts match constants', () => {
  it('UNIVERSAL_SKILLS count matches template files', async () => {
    const templateDir = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      'templates',
      'skills',
      'universal'
    );
    const files = await fs.readdir(templateDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    expect(mdFiles.length).toBe(UNIVERSAL_SKILLS.length);
  });

  it('TEMPLATE_SKILLS count matches template files', async () => {
    const templateDir = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      'templates',
      'skills',
      'templates'
    );
    const files = await fs.readdir(templateDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    expect(mdFiles.length).toBe(TEMPLATE_SKILLS.length);
  });

  it('COMMAND_FILES count matches template files', async () => {
    const templateDir = path.resolve(import.meta.dirname, '..', '..', 'templates', 'commands');
    const files = await fs.readdir(templateDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    expect(mdFiles.length).toBe(COMMAND_FILES.length);
  });

  it('UNIVERSAL_AGENTS count matches template files', async () => {
    const templateDir = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      'templates',
      'agents',
      'universal'
    );
    const files = await fs.readdir(templateDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    expect(mdFiles.length).toBe(UNIVERSAL_AGENTS.length);
  });

  it('optional agent count matches AGENT_CATALOG totals', async () => {
    const catalogCount = Object.keys(AGENT_CATALOG).length;
    const templateDir = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      'templates',
      'agents',
      'optional'
    );
    let fileCount = 0;
    const categories = await fs.readdir(templateDir);
    for (const cat of categories) {
      const catDir = path.join(templateDir, cat);
      const stat = await fs.stat(catDir);
      if (stat.isDirectory()) {
        const files = await fs.readdir(catDir);
        fileCount += files.filter((f) => f.endsWith('.md')).length;
      }
    }
    expect(fileCount).toBe(catalogCount);
  });
});
