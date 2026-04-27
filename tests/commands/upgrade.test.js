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

// Mock npm utility to prevent real registry calls (return current version = no self-update)
vi.mock('../../src/utils/npm.js', () => {
  const pkg = JSON.parse(
    fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'package.json'),
      'utf-8'
    )
  );
  return {
    getLatestNpmVersion: vi.fn(() => pkg.version),
  };
});

// Mock child_process for selfUpdate's execSync
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
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

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { execSync } from 'node:child_process';
import { getLatestNpmVersion } from '../../src/utils/npm.js';
import { upgradeCommand } from '../../src/commands/upgrade.js';
import { buildTemplateHashMap } from '../../src/core/file-categorizer.js';
import { substituteVariables } from '../../src/core/scaffolder.js';
import { buildAgentsMdVariables } from '../../src/core/variables.js';
import { hashFile } from '../../src/utils/hash.js';

async function seedCompleteInstall(tmpDir, currentVersion) {
  await fs.ensureDir(path.join(tmpDir, '.claude'));
  const templateMap = await buildTemplateHashMap();
  const variables = await buildAgentsMdVariables({ techStack: [], useDocker: false }, tmpDir);
  const fileHashes = {};
  for (const [key, entry] of Object.entries(templateMap)) {
    if (entry.type === 'optional-agent' || entry.type === 'template-skill') continue;
    const raw = await readTemplate(entry.templatePath);
    const finalContent = entry.type === 'root-file' ? substituteVariables(raw, variables) : raw;
    const destPath = key.startsWith('root/')
      ? path.join(tmpDir, ...key.slice('root/'.length).split('/'))
      : path.join(tmpDir, '.claude', ...key.split('/'));
    await fs.ensureDir(path.dirname(destPath));
    await fs.writeFile(destPath, finalContent);
    fileHashes[key] = await hashFile(destPath);
  }
  await fs.ensureDir(path.join(tmpDir, '.claude', 'learnings'));
  await fs.writeFile(path.join(tmpDir, '.claude', 'learnings', '.gitkeep'), '');
  // Keep CLAUDE.md absent so the sidecar check short-circuits.
  const meta = {
    version: currentVersion,
    installedAt: '2026-03-24T12:00:00.000Z',
    lastUpdated: '2026-03-24T12:00:00.000Z',
    projectTypes: [],
    techStack: [],
    universalAgents: [],
    optionalAgents: [],
    useDocker: false,
    fileHashes,
    optionalFeatures: [],
    optedOutFeatures: ['plugin-json', 'gtd-memory'],
  };
  await fs.writeFile(
    path.join(tmpDir, '.claude', 'workflow-meta.json'),
    JSON.stringify(meta, null, 2)
  );
  return meta;
}

async function readPackageVersion() {
  const pkgPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    '..',
    'package.json'
  );
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  return pkg.version;
}

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
    expect(output).toContain('Workflow is not installed');
  });

  it('shows already up to date when versions match and install is complete', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);

    await upgradeCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('up to date');
  });

  it('enters repair-only flow when versions match but a tracked hook is missing', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'learn-capture.cjs');
    await fs.remove(hookPath);

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    expect(await fs.pathExists(hookPath)).toBe(true);
    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('WORCLAUDE REPAIR');
    expect(output).toContain('Restore (missing from disk)');
    expect(output).toContain('Restored:');

    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.version).toBe(currentVersion);
    expect(updatedMeta.fileHashes['hooks/learn-capture.cjs']).toBeDefined();
  });

  it('writes CLAUDE.md memory-guidance sidecar under .claude/workflow-ref/ when missing', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Project\n\nJust rules.\n');

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'workflow-ref', 'CLAUDE.md'))).toBe(
      true
    );
    // Legacy root sibling must not appear — it would confuse users and linger
    // through future upgrades.
    expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md.workflow-ref.md'))).toBe(false);
    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toBe('# Project\n\nJust rules.\n');
  });

  it('does NOT write sidecar when CLAUDE.md already has memory guidance', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      '# Project\n\n## Memory Architecture\n\nNotes.\n'
    );

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'workflow-ref', 'CLAUDE.md'))).toBe(
      false
    );
    expect(await fs.pathExists(path.join(tmpDir, 'CLAUDE.md.workflow-ref.md'))).toBe(false);
  });

  it('--dry-run previews repair without writing files or meta', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'learn-capture.cjs');
    await fs.remove(hookPath);
    const beforeMeta = await fs.readFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      'utf-8'
    );

    await upgradeCommand({ dryRun: true });

    expect(await fs.pathExists(hookPath)).toBe(false);
    const afterMeta = await fs.readFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      'utf-8'
    );
    expect(afterMeta).toBe(beforeMeta);
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it('--yes skips confirmation and applies repair', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'learn-capture.cjs');
    await fs.remove(hookPath);

    await upgradeCommand({ yes: true });

    expect(await fs.pathExists(hookPath)).toBe(true);
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it('--repair-only restores files but does not bump version even when mismatched', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const metaPath = path.join(tmpDir, '.claude', 'workflow-meta.json');
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    meta.version = '0.9.0';
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'learn-capture.cjs');
    await fs.remove(hookPath);

    await upgradeCommand({ yes: true, repairOnly: true });

    expect(await fs.pathExists(hookPath)).toBe(true);
    const updatedMeta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(updatedMeta.version).toBe('0.9.0');
  });

  it('restores missing AGENTS.md from root/AGENTS.md template', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    await fs.remove(path.join(tmpDir, 'AGENTS.md'));

    await upgradeCommand({ yes: true });

    expect(await fs.pathExists(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
  });

  it('migration: user-edited AGENTS.md + no root/AGENTS.md entry → writes sidecar', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const metaPath = path.join(tmpDir, '.claude', 'workflow-meta.json');
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    delete meta.fileHashes['root/AGENTS.md'];
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    await fs.writeFile(
      path.join(tmpDir, 'AGENTS.md'),
      '# My heavily edited AGENTS.md\n\nCustom content.\n'
    );

    await upgradeCommand({ yes: true });

    const preserved = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
    expect(preserved).toBe('# My heavily edited AGENTS.md\n\nCustom content.\n');
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'workflow-ref', 'AGENTS.md'))).toBe(
      true
    );
    // No legacy sidecar at root
    expect(await fs.pathExists(path.join(tmpDir, 'AGENTS.workflow-ref.md'))).toBe(false);
  });

  it('hash-prune preserves fileHashes entries for restored missingExpected keys', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'learn-capture.cjs');
    await fs.remove(hookPath);

    await upgradeCommand({ yes: true });

    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.fileHashes['hooks/learn-capture.cjs']).toBeDefined();
    const freshHash = await hashFile(hookPath);
    expect(updatedMeta.fileHashes['hooks/learn-capture.cjs']).toBe(freshHash);
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

  it('creates .claude/observability/.gitkeep on full upgrade for existing v0.9 installs', async () => {
    const meta = {
      version: '0.9.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: ['CLI tool'],
      techStack: ['node'],
      universalAgents: [],
      optionalAgents: [],
      useDocker: false,
      fileHashes: {},
    };
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: [] }, hooks: {} })
    );

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'observability'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'observability', '.gitkeep'))).toBe(
      true
    );
  });

  it('saves conflict files under .claude/workflow-ref/ (not sibling to live file)', async () => {
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

    // Ref file lives under workflow-ref/, preserving the original filename
    expect(
      await fs.pathExists(
        path.join(tmpDir, '.claude', 'workflow-ref', 'agents', 'plan-reviewer.md')
      )
    ).toBe(true);
    // Regression: ref MUST NOT land in .claude/agents/ where Claude Code's
    // agent discovery would pick it up as a phantom agent.
    expect(
      await fs.pathExists(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.workflow-ref.md'))
    ).toBe(false);
  });

  it('preserves stored hash for user-modified files (prevents silent overwrite on next template change)', async () => {
    // Regression test for the "upgrade silently locks in user customizations" bug.
    //
    // Scenario:
    //   1. User installs project (stored hash = original template hash)
    //   2. User customizes a file (current != stored, template unchanged)
    //   3. User runs upgrade (template for this file still unchanged)
    //
    // Expected: file is preserved AND stored hash stays at original template hash,
    // so the next upgrade where the template DOES change correctly routes the file
    // to the conflict path (sidecar) instead of autoUpdate (overwrite).
    //
    // Before the fix: upgrade recomputed ALL hashes from disk, "locking in" the
    // customized hash as the new stored hash. The next template change would then
    // see current == stored and auto-update via the autoUpdate path, silently
    // overwriting the customization.

    // Use the REAL shipped template so templateChanged = false in the categorizer
    const realTemplateContent = await readTemplate('agents/universal/plan-reviewer.md');
    const realTemplateHash = hashContent(realTemplateContent);
    const customizedContent = 'user customization that must be preserved';
    const customizedHash = hashContent(customizedContent);

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
        'agents/plan-reviewer.md': realTemplateHash, // stored = current template hash
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    // User customized the file (current != stored)
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      customizedContent
    );
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: [] }, hooks: {} })
    );

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    // 1. Live file preserved as-is
    const liveContent = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      'utf-8'
    );
    expect(liveContent).toBe(customizedContent);

    // 2. CRITICAL: stored hash is UNCHANGED — still equals the original template hash,
    // NOT the customized hash. This ensures the next upgrade will still detect the
    // customization (current != stored) and preserve or sidecar it correctly.
    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.fileHashes['agents/plan-reviewer.md']).toBe(realTemplateHash);
    expect(updatedMeta.fileHashes['agents/plan-reviewer.md']).not.toBe(customizedHash);
  });

  it('updates stored hash to new template hash for autoUpdate files', async () => {
    // Companion to the preservation test: verify the partial-rehash fix didn't
    // regress the autoUpdate happy path. Files unchanged since install (current
    // == stored) whose template has since changed must end up with stored =
    // new template hash, so future upgrades correctly categorize them as
    // unchanged until the next template change.

    const realTemplateContent = await readTemplate('agents/universal/plan-reviewer.md');
    const realTemplateHash = hashContent(realTemplateContent);
    const fakeOldContent = 'old plan-reviewer template (pre-upgrade)';
    const fakeOldHash = hashContent(fakeOldContent);

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
        'agents/plan-reviewer.md': fakeOldHash, // stored = pre-upgrade template hash
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    // File on disk matches stored (unmodified since install) → autoUpdate path
    await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'), fakeOldContent);
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: [] }, hooks: {} })
    );

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    // 1. Live file replaced with the real template content
    const liveContent = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      'utf-8'
    );
    expect(liveContent).toBe(realTemplateContent);

    // 2. Stored hash updated to new template hash
    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.fileHashes['agents/plan-reviewer.md']).toBe(realTemplateHash);
    expect(updatedMeta.fileHashes['agents/plan-reviewer.md']).not.toBe(fakeOldHash);
  });

  it('runs v2.0.0 migrations when upgrading from pre-2.0.0', async () => {
    // Set up a v1.9.0 project with flat skill and agent without description
    const skillContent = '# Testing skill content';
    const agentContent = '---\nname: plan-reviewer\nmodel: opus\n---\n\n# Plan Reviewer';

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
        'skills/testing.md': hashContent(skillContent),
        'agents/plan-reviewer.md': hashContent(agentContent),
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'testing.md'), skillContent);
    await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'), agentContent);
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({ permissions: { allow: [] }, hooks: {} })
    );

    inquirer.prompt.mockResolvedValue({ proceed: true });

    await upgradeCommand();

    // Verify skill was migrated to directory format
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills', 'testing', 'SKILL.md'))).toBe(
      true
    );
    expect(await fs.pathExists(path.join(tmpDir, '.claude', 'skills', 'testing.md'))).toBe(false);

    // Verify agent was patched with description
    const updatedAgent = await fs.readFile(
      path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'),
      'utf-8'
    );
    expect(updatedAgent).toContain('description:');
  });

  it('refuses when installed version is newer than CLI (downgrade guard)', async () => {
    const meta = {
      version: '99.0.0',
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

    await upgradeCommand({ yes: true });

    const updatedMeta = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8')
    );
    expect(updatedMeta.version).toBe('99.0.0');
    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Refusing to downgrade');
    expect(output).toContain('99.0.0');
  });

  it('relocates legacy workflow-ref siblings even when versions match', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const legacyPath = path.join(tmpDir, '.claude', 'commands', 'start.workflow-ref.md');
    await fs.writeFile(legacyPath, '# legacy sibling — must relocate');

    await upgradeCommand({ yes: true });

    expect(await fs.pathExists(legacyPath)).toBe(false);
    const relocated = path.join(tmpDir, '.claude', 'workflow-ref', 'commands', 'start.md');
    expect(await fs.pathExists(relocated)).toBe(true);
  });

  it('relocates legacy workflow-ref siblings in repair-only flow', async () => {
    const currentVersion = await readPackageVersion();
    await seedCompleteInstall(tmpDir, currentVersion);
    const hookPath = path.join(tmpDir, '.claude', 'hooks', 'learn-capture.cjs');
    await fs.remove(hookPath);
    const legacyPath = path.join(tmpDir, '.claude', 'agents', 'bug-fixer.workflow-ref.md');
    await fs.writeFile(legacyPath, '# legacy agent ref');

    await upgradeCommand({ yes: true });

    expect(await fs.pathExists(hookPath)).toBe(true);
    expect(await fs.pathExists(legacyPath)).toBe(false);
    const relocated = path.join(tmpDir, '.claude', 'workflow-ref', 'agents', 'bug-fixer.md');
    expect(await fs.pathExists(relocated)).toBe(true);
    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Relocated');
  });

  it('renders "Deleted" section when meta has a hash for a file no longer in templates', async () => {
    const meta = {
      version: '0.9.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: [],
      techStack: [],
      universalAgents: [],
      optionalAgents: [],
      useDocker: false,
      fileHashes: {
        'agents/removed-in-current-version.md': 'a'.repeat(64),
      },
    };
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );

    await upgradeCommand({ dryRun: true });

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Deleted (removed in current version)');
    expect(output).toContain('agents/removed-in-current-version.md');
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

  describe('self-update', () => {
    it('offers self-update when npm has newer version', async () => {
      getLatestNpmVersion.mockReturnValue('99.0.0');
      // User declines update
      inquirer.prompt.mockResolvedValue({ doUpdate: false });

      await upgradeCommand();

      const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('New worclaude version available');
    });

    it('runs npm install on successful self-update', async () => {
      getLatestNpmVersion.mockReturnValue('99.0.0');
      execSync.mockReturnValue('');
      inquirer.prompt.mockResolvedValue({ doUpdate: true });

      await upgradeCommand();

      expect(execSync).toHaveBeenCalledWith('npm install -g worclaude@latest', expect.any(Object));
      const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('Re-run');
    });

    it('shows sudo hint on EACCES error during self-update', async () => {
      getLatestNpmVersion.mockReturnValue('99.0.0');
      execSync.mockImplementation(() => {
        throw new Error('EACCES permission denied');
      });
      inquirer.prompt.mockResolvedValue({ doUpdate: true });

      await upgradeCommand();

      const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('sudo npm install');
    });

    it('shows generic hint on non-EACCES error during self-update', async () => {
      getLatestNpmVersion.mockReturnValue('99.0.0');
      execSync.mockImplementation(() => {
        throw new Error('network timeout');
      });
      inquirer.prompt.mockResolvedValue({ doUpdate: true });

      await upgradeCommand();

      const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('Try manually');
    });
  });
});
