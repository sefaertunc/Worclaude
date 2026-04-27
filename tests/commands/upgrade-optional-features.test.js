import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import inquirer from 'inquirer';

vi.mock('inquirer');
vi.mock('../../src/utils/npm.js', () => ({
  getLatestNpmVersion: vi.fn(() => null),
}));
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

import { upgradeCommand } from '../../src/commands/upgrade.js';
import { buildTemplateHashMap } from '../../src/core/file-categorizer.js';
import { readTemplate, substituteVariables } from '../../src/core/scaffolder.js';
import { buildAgentsMdVariables } from '../../src/core/variables.js';
import { hashFile } from '../../src/utils/hash.js';

async function seed(tmpDir, currentVersion, metaOverrides = {}) {
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
    optedOutFeatures: [],
    ...metaOverrides,
  };
  await fs.writeFile(
    path.join(tmpDir, '.claude', 'workflow-meta.json'),
    JSON.stringify(meta, null, 2)
  );
}

async function readPackageVersion() {
  const pkgPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    '..',
    'package.json'
  );
  return JSON.parse(await fs.readFile(pkgPath, 'utf-8')).version;
}

async function readMeta(tmpDir) {
  return JSON.parse(await fs.readFile(path.join(tmpDir, '.claude', 'workflow-meta.json'), 'utf-8'));
}

describe('upgrade — optional features registry (T3.9)', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-opt-upgrade-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('prompts for available features and scaffolds when accepted', async () => {
    const currentVersion = await readPackageVersion();
    await seed(tmpDir, currentVersion);

    inquirer.prompt.mockResolvedValue({ accept: true });

    await upgradeCommand();

    expect(await fs.pathExists(path.join(tmpDir, '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'memory', 'decisions.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'memory', 'preferences.md'))).toBe(true);

    const meta = await readMeta(tmpDir);
    expect(meta.optionalFeatures).toEqual(expect.arrayContaining(['plugin-json', 'gtd-memory']));
    expect(meta.optedOutFeatures).toEqual([]);
  });

  it('records optedOutFeatures when feature is declined', async () => {
    const currentVersion = await readPackageVersion();
    await seed(tmpDir, currentVersion);

    inquirer.prompt.mockResolvedValue({ accept: false });

    await upgradeCommand();

    expect(await fs.pathExists(path.join(tmpDir, '.claude-plugin', 'plugin.json'))).toBe(false);
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'memory', 'decisions.md'))).toBe(false);

    const meta = await readMeta(tmpDir);
    expect(meta.optedOutFeatures).toEqual(expect.arrayContaining(['plugin-json', 'gtd-memory']));
    expect(meta.optionalFeatures).toEqual([]);
  });

  it('does not prompt when --yes is passed', async () => {
    const currentVersion = await readPackageVersion();
    await seed(tmpDir, currentVersion);

    await upgradeCommand({ yes: true });

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(await fs.pathExists(path.join(tmpDir, '.claude-plugin', 'plugin.json'))).toBe(false);
    const meta = await readMeta(tmpDir);
    expect(meta.optedOutFeatures).toEqual([]);
  });

  it('skips features already detected on disk', async () => {
    const currentVersion = await readPackageVersion();
    await seed(tmpDir, currentVersion);
    await fs.ensureDir(path.join(tmpDir, '.claude-plugin'));
    await fs.writeFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), '{}');

    inquirer.prompt.mockResolvedValue({ accept: false });

    await upgradeCommand();

    const promptedMessages = inquirer.prompt.mock.calls
      .flatMap((call) => (Array.isArray(call[0]) ? call[0] : []))
      .map((q) => q.message);
    expect(promptedMessages.some((m) => /plugin\.json/.test(m))).toBe(false);
    expect(promptedMessages.some((m) => /memory files/.test(m))).toBe(true);
  });

  it('skips features already in optedOutFeatures', async () => {
    const currentVersion = await readPackageVersion();
    await seed(tmpDir, currentVersion, { optedOutFeatures: ['plugin-json'] });

    inquirer.prompt.mockResolvedValue({ accept: false });

    await upgradeCommand();

    const promptedMessages = inquirer.prompt.mock.calls
      .flatMap((call) => (Array.isArray(call[0]) ? call[0] : []))
      .map((q) => q.message);
    expect(promptedMessages.some((m) => /plugin\.json/.test(m))).toBe(false);

    const meta = await readMeta(tmpDir);
    expect(meta.optedOutFeatures).toEqual(expect.arrayContaining(['plugin-json', 'gtd-memory']));
  });

  it('does not write meta when no features are available and nothing was prompted', async () => {
    const currentVersion = await readPackageVersion();
    await seed(tmpDir, currentVersion, { optedOutFeatures: ['plugin-json', 'gtd-memory'] });

    const before = await readMeta(tmpDir);

    await upgradeCommand();

    const after = await readMeta(tmpDir);
    expect(after.lastUpdated).toBe(before.lastUpdated);
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });
});
