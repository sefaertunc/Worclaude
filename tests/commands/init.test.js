import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

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
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

// Suppress console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { initCommand } from '../../src/commands/init.js';

describe('init command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-init-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    // Set up mock responses for all prompts
    let callCount = 0;
    inquirer.prompt.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1: // Project info
          return Promise.resolve({ projectName: 'test-project', description: 'A test project' });
        case 2: // Project type
          return Promise.resolve({ projectTypes: ['CLI tool'] });
        case 3: // Tech stack
          return Promise.resolve({ language: 'node' });
        case 4: // Docker
          return Promise.resolve({ useDocker: false });
        case 5: // Recommended agents
          return Promise.resolve({ selectedRecommended: ['bug-fixer', 'doc-writer'] });
        case 6: // Additional agents
          return Promise.resolve({ selectedAdditional: [] });
        default:
          return Promise.resolve({});
      }
    });
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
    const agents = ['plan-reviewer', 'code-simplifier', 'test-writer', 'build-validator', 'verify-app'];
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

  it('creates all 9 commands', async () => {
    await initCommand();
    const commands = ['start', 'end', 'commit-push-pr', 'review-plan', 'techdebt', 'verify', 'compact-safe', 'status', 'update-claude-md'];
    for (const cmd of commands) {
      const exists = await fs.pathExists(path.join(tmpDir, '.claude', 'commands', `${cmd}.md`));
      expect(exists, `${cmd}.md should exist`).toBe(true);
    }
  });

  it('creates all skills', async () => {
    await initCommand();
    const skills = ['context-management', 'git-conventions', 'planning-with-files', 'review-and-handoff', 'prompt-engineering', 'verification', 'testing', 'claude-md-maintenance', 'subagent-usage', 'backend-conventions', 'frontend-design-system', 'project-patterns'];
    for (const skill of skills) {
      const exists = await fs.pathExists(path.join(tmpDir, '.claude', 'skills', `${skill}.md`));
      expect(exists, `${skill}.md should exist`).toBe(true);
    }
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
    expect(meta.version).toBe('1.0.0');
    expect(meta.techStack).toBe('node');
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

  it('exits early if .claude/ already exists', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await initCommand();
    // Should not create CLAUDE.md since it exits early
    expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md'))).toBe(false);
  });
});
