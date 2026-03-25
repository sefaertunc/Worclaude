import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent } from '../../src/utils/hash.js';
import { readTemplate } from '../../src/core/scaffolder.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock child_process to prevent real npm registry calls
vi.mock('node:child_process', () => ({
  execSync: vi.fn(() => {
    // Return current package version so self-update check is skipped
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'package.json'), 'utf-8')
    );
    return pkg.version;
  }),
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
import { upgradeCommand } from '../../src/commands/upgrade.js';

describe('upgrade command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-upgrade-cmd-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('shows error when no workflow installed', async () => {
    await upgradeCommand();
    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('No workflow installation found');
  });

  it('shows already up to date when versions match', async () => {
    // Read actual package version
    const pkgPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '..',
      '..',
      'package.json'
    );
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    const currentVersion = pkg.version;

    const meta = {
      version: currentVersion,
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: [],
      techStack: [],
      universalAgents: [],
      optionalAgents: [],
      fileHashes: {},
    };

    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );

    await upgradeCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('up to date');
  });

  it('shows error for corrupted workflow-meta.json', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'not valid json{{{');

    await upgradeCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('corrupted');
  });

  it('performs full upgrade when version differs', async () => {
    // Create an installation at version 0.9.0
    const templateContent = await readTemplate('agents/universal/plan-reviewer.md');
    const fakeOldContent = 'old plan-reviewer v0.9';
    const storedHash = hashContent(fakeOldContent);

    const meta = {
      version: '0.9.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: ['CLI tool'],
      techStack: ['node'],
      universalAgents: ['plan-reviewer'],
      optionalAgents: [],
      useDocker: false,
      fileHashes: {
        'agents/plan-reviewer.md': storedHash,
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    // File on disk matches stored (user hasn't modified) → should auto-update
    await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'), fakeOldContent);
    // Create settings.json for merge
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: [] }, hooks: {} })
    );

    // Mock: confirm upgrade
    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    // Verify: plan-reviewer.md should now have the current template content
    const updated = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      'utf-8'
    );
    expect(updated).toBe(templateContent);

    // Verify: workflow-meta.json updated
    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.version).not.toBe('0.9.0');

    // Verify: backup was created
    const entries = await fs.readdir(tmpDir);
    const backups = entries.filter((e) => e.startsWith('.claude-backup-'));
    expect(backups.length).toBeGreaterThanOrEqual(1);
  });

  it('saves conflict files as .workflow-ref.md', async () => {
    const fakeOldContent = 'old plan-reviewer v0.9';
    const storedHash = hashContent(fakeOldContent);

    const meta = {
      version: '0.9.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: [],
      techStack: [],
      universalAgents: ['plan-reviewer'],
      optionalAgents: [],
      fileHashes: {
        'agents/plan-reviewer.md': storedHash,
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    // User modified the file (different from stored hash)
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      'user customized content'
    );
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: [] }, hooks: {} })
    );

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    // User's file should be preserved
    const userContent = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      'utf-8'
    );
    expect(userContent).toBe('user customized content');

    // .workflow-ref.md should exist with new template
    expect(
      await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.workflow-ref.md'))
    ).toBe(true);
  });

  it('cancels when user declines', async () => {
    const meta = {
      version: '0.9.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: [],
      techStack: [],
      universalAgents: [],
      optionalAgents: [],
      fileHashes: {},
    };

    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );

    inquirer.prompt.mockResolvedValue({ proceed: false });

    await upgradeCommand();

    // Version should not have changed
    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.version).toBe('0.9.0');
  });
});
