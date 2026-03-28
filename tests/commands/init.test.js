import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { COMMAND_FILES } from '../../src/data/agents.js';

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

// Suppress console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { initCommand } from '../../src/commands/init.js';

// Helper: build standard mock sequence for CLI tool + Node.js
function setupDefaultMocks() {
  const responses = [
    { projectName: 'test-project', description: 'A test project' }, // 1: project info
    { projectTypes: ['CLI tool'] }, // 2: project type
    { languages: ['node'] }, // 3: tech stack (multi-select)
    { useDocker: false }, // 4: docker
    { selectedCategories: ['Quality', 'Documentation'] }, // 5: agent categories
    { selectedAgents: ['bug-fixer'] }, // 6: fine-tune Quality
    { selectedAgents: ['doc-writer'] }, // 7: fine-tune Documentation
    { additionalCategories: [] }, // 8: unselected categories offer
    { confirmation: 'yes' }, // 9: confirmation
  ];
  let callCount = 0;
  inquirer.prompt.mockImplementation(() => {
    return Promise.resolve(responses[callCount++] || {});
  });
}

describe('init command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-init-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    setupDefaultMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('creates CLAUDE.md with project name', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('test-project');
    expect(content).toContain('A test project');
  });

  it('creates .claude/settings.json with valid JSON', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
    const settings = JSON.parse(content);
    expect(settings.permissions).toBeDefined();
    expect(settings.permissions.allow).toBeInstanceOf(Array);
    expect(settings.hooks).toBeDefined();
  });

  it('includes Node.js permissions in settings', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
    const settings = JSON.parse(content);
    expect(settings.permissions.allow).toContain('Bash(npm:*)');
    expect(settings.permissions.allow).toContain('Bash(npx:*)');
  });

  it('sets formatter command in hooks', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
    expect(content).toContain('prettier');
  });

  it('creates universal agents', async () => {
    await initCommand();
    const agents = [
      'plan-reviewer',
      'code-simplifier',
      'test-writer',
      'build-validator',
      'verify-app',
    ];
    for (const agent of agents) {
      const exists = await fs.pathExists(path.join(tmpDir, '.claude', 'agents', `${agent}.md`));
      expect(exists, `${agent}.md should exist`).toBe(true);
    }
  });

  it('creates selected optional agents', async () => {
    await initCommand();
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'bug-fixer.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'doc-writer.md'))).toBe(true);
  });

  it('creates all commands from COMMAND_FILES', async () => {
    await initCommand();
    for (const cmd of COMMAND_FILES) {
      const exists = await fs.pathExists(path.join(tmpDir, '.claude', 'commands', `${cmd}.md`));
      expect(exists, `${cmd}.md should exist`).toBe(true);
    }
  });

  it('creates all skills including agent-routing', async () => {
    await initCommand();
    const skills = [
      'context-management',
      'git-conventions',
      'planning-with-files',
      'review-and-handoff',
      'prompt-engineering',
      'verification',
      'testing',
      'claude-md-maintenance',
      'subagent-usage',
      'backend-conventions',
      'frontend-design-system',
      'project-patterns',
      'agent-routing',
    ];
    for (const skill of skills) {
      const exists = await fs.pathExists(path.join(tmpDir, '.claude', 'skills', `${skill}.md`));
      expect(exists, `${skill}.md should exist`).toBe(true);
    }
  });

  it('generates agent-routing.md with correct agents', async () => {
    await initCommand();
    const content = await fs.readFile(
      path.join(tmpDir, '.claude', 'skills', 'agent-routing.md'),
      'utf-8'
    );
    // Should contain universal agents
    expect(content).toContain('plan-reviewer');
    expect(content).toContain('build-validator');
    // Should contain selected optional agents
    expect(content).toContain('bug-fixer');
    expect(content).toContain('doc-writer');
    // Should NOT contain unselected agents
    expect(content).not.toContain('### api-designer');
    expect(content).not.toContain('### docker-helper');
    // Should have expected structure
    expect(content).toContain('# Agent Routing Guide');
    expect(content).toContain('## Decision Matrix');
  });

  it('includes agent-routing directive in CLAUDE.md', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('agent-routing.md');
  });

  it('creates .mcp.json', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.mcp.json'), 'utf-8');
    const mcp = JSON.parse(content);
    expect(mcp.mcpServers).toBeDefined();
  });

  it('creates workflow-meta.json with metadata', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8');
    const meta = JSON.parse(content);
    const pkgPath = path.resolve(import.meta.dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    expect(meta.version).toBe(pkg.version);
    expect(meta.techStack).toEqual(['node']);
    expect(meta.projectTypes).toContain('CLI tool');
    expect(meta.universalAgents).toHaveLength(5);
    expect(meta.optionalAgents).toContain('bug-fixer');
    expect(meta.fileHashes).toBeDefined();
  });

  it('creates docs/spec/ files', async () => {
    await initCommand();
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'))).toBe(true);
  });

  it('uses project-type-specific SPEC.md template', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'), 'utf-8');
    // CLI tool template should have Commands table
    expect(content).toContain('Commands');
    expect(content).toContain('test-project');
  });

  it('detects Scenario C and shows upgrade message', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify({ version: '1.0.0' })
    );
    await initCommand();
    // Should NOT scaffold anything — just print upgrade message
    expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(false);
  });

  it('merges multiple language permissions', async () => {
    const responses = [
      { projectName: 'multi-lang', description: 'Multi language project' },
      { projectTypes: ['Full-stack web application'] },
      { languages: ['python', 'node'] },
      { useDocker: true },
      { selectedCategories: ['Quality'] },
      { selectedAgents: ['bug-fixer'] },
      { additionalCategories: [] },
      { confirmation: 'yes' },
    ];
    let i = 0;
    inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
    const settings = JSON.parse(content);
    // Should have both Python and Node permissions
    expect(settings.permissions.allow).toContain('Bash(python:*)');
    expect(settings.permissions.allow).toContain('Bash(npm:*)');
    // Should have Docker permissions
    expect(settings.permissions.allow).toContain('Bash(docker:*)');
  });

  it('chains multiple formatters with &&', async () => {
    const responses = [
      { projectName: 'multi-fmt', description: 'Test' },
      { projectTypes: ['Backend / API'] },
      { languages: ['python', 'node'] },
      { useDocker: false },
      { selectedCategories: [] },
      { additionalCategories: [] },
      { confirmation: 'yes' },
    ];
    let i = 0;
    inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'settings.json'), 'utf-8');
    // Should chain both formatters
    expect(content).toContain('ruff format . || true && npx prettier --write . || true');
  });

  it('stores techStack as array in workflow-meta.json', async () => {
    const responses = [
      { projectName: 'arr-test', description: 'Test' },
      { projectTypes: ['Backend / API'] },
      { languages: ['python', 'go'] },
      { useDocker: false },
      { selectedCategories: [] },
      { additionalCategories: [] },
      { confirmation: 'yes' },
    ];
    let i = 0;
    inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8');
    const meta = JSON.parse(content);
    expect(meta.techStack).toEqual(['python', 'go']);
  });

  it('generates stack-specific commands in CLAUDE.md', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('npm test');
    expect(content).toContain('npx eslint');
    expect(content).not.toContain('# Add your project-specific commands here');
  });

  it('uses /setup text for template skills in CLAUDE.md', async () => {
    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('Run /setup to fill automatically');
    expect(content).not.toContain('Fill in with your project specifics');
  });

  it('renders SPEC.md tech stack as comma-separated in table', async () => {
    const responses = [
      { projectName: 'table-test', description: 'Test' },
      { projectTypes: ['Backend / API'] },
      { languages: ['python', 'node'] },
      { useDocker: true },
      { selectedCategories: [] },
      { additionalCategories: [] },
      { confirmation: 'yes' },
    ];
    let i = 0;
    inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

    await initCommand();
    const content = await fs.readFile(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'), 'utf-8');
    // Should be comma-separated, not bullet list
    expect(content).toContain('Python, Node.js / TypeScript');
    expect(content).not.toContain('- Python');
    // Docker should be in Containers row, not Language row
    expect(content).toContain('| Containers');
    expect(content).toContain('Docker');
  });

  describe('Scenario B — existing project', () => {
    it('merges workflow into project with existing .claude/', async () => {
      // Set up existing project with some files
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
      await fs.writeFile(
        path.join(tmpDir, '.claude', 'skills', 'context-management.md'),
        '# My custom context rules'
      );
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# My Project');

      // Scenario B mock sequence:
      // 1: proceed confirmation, 2-9: same as Scenario A, + CLAUDE.md merge
      const responses = [
        { proceed: true }, // confirm proceed
        { projectName: 'existing-project', description: 'Existing' }, // project info
        { projectTypes: ['CLI tool'] }, // project type
        { languages: ['node'] }, // tech stack
        { useDocker: false }, // docker
        { selectedCategories: ['Quality'] }, // categories
        { selectedAgents: ['bug-fixer'] }, // fine-tune
        { additionalCategories: [] }, // extra categories
        { confirmation: 'yes' }, // confirm
        { choice: 'keep' }, // CLAUDE.md handling
      ];
      let i = 0;
      inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

      await initCommand();

      // Backup should be created
      const entries = await fs.readdir(tmpDir);
      const backups = entries.filter((e) => e.startsWith('.claude-backup-'));
      expect(backups.length).toBe(1);

      // Original skill file untouched
      const original = await fs.readFile(
        path.join(tmpDir, '.claude', 'skills', 'context-management.md'),
        'utf-8'
      );
      expect(original).toBe('# My custom context rules');

      // .workflow-ref.md created for conflicting skill
      expect(
        await fs.pathExists(
          path.join(tmpDir, '.claude', 'skills', 'context-management.workflow-ref.md')
        )
      ).toBe(true);

      // Non-conflicting skills added
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills', 'verification.md'))).toBe(
        true
      );

      // Agents added
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'))).toBe(
        true
      );
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'bug-fixer.md'))).toBe(
        true
      );

      // Commands added
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'commands', 'setup.md'))).toBe(true);

      // workflow-meta.json created
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'workflow-meta.json'))).toBe(true);

      // CLAUDE.md.workflow-suggestions created
      expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md.workflow-suggestions'))).toBe(true);

      // Original CLAUDE.md preserved
      const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toBe('# My Project');
    });

    it('cancels when user declines to proceed', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude'));

      const responses = [{ proceed: false }];
      let i = 0;
      inquirer.prompt.mockImplementation(() => Promise.resolve(responses[i++] || {}));

      await initCommand();

      // Nothing should be scaffolded
      expect(await fs.pathExists(path.join(tmpDir, '.claude', 'workflow-meta.json'))).toBe(false);
    });
  });
});
