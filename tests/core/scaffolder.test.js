import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  substituteVariables,
  mergeSettings,
  readTemplate,
  scaffoldFile,
  getTemplatesDir,
  updateGitignore,
  slugifyPluginName,
  scaffoldPluginJson,
  scaffoldMemoryDocs,
} from '../../src/core/scaffolder.js';
import { UNIVERSAL_AGENTS } from '../../src/data/agents.js';

describe('substituteVariables', () => {
  it('replaces single variable', () => {
    expect(substituteVariables('Hello {name}!', { name: 'World' })).toBe('Hello World!');
  });

  it('replaces multiple variables', () => {
    const result = substituteVariables('{a} and {b}', { a: 'X', b: 'Y' });
    expect(result).toBe('X and Y');
  });

  it('leaves unknown variables as-is', () => {
    expect(substituteVariables('Hello {unknown}!', {})).toBe('Hello {unknown}!');
  });

  it('replaces same variable multiple times', () => {
    expect(substituteVariables('{x} + {x}', { x: '1' })).toBe('1 + 1');
  });

  it('does not match JSON-like braces', () => {
    const json = '{ "key": "value" }';
    expect(substituteVariables(json, {})).toBe(json);
  });
});

describe('mergeSettings', () => {
  it('concatenates permissions.allow arrays', () => {
    const base = { permissions: { allow: ['A', 'B'] }, hooks: {} };
    const stack = { permissions: { allow: ['C', 'D'] } };
    const merged = mergeSettings(base, stack);
    expect(merged.permissions.allow).toEqual(['A', 'B', 'C', 'D']);
  });

  it('deduplicates permissions', () => {
    const base = { permissions: { allow: ['A', 'B'] }, hooks: {} };
    const stack = { permissions: { allow: ['B', 'C'] } };
    const merged = mergeSettings(base, stack);
    expect(merged.permissions.allow).toEqual(['A', 'B', 'C']);
  });

  it('preserves hooks from base', () => {
    const hooks = { PostToolUse: [{ matcher: 'test' }] };
    const base = { permissions: { allow: [] }, hooks };
    const stack = { permissions: { allow: ['X'] } };
    const merged = mergeSettings(base, stack);
    expect(merged.hooks).toEqual(hooks);
  });

  it('handles multiple stack merges', () => {
    const base = { permissions: { allow: ['A'] }, hooks: {} };
    const s1 = { permissions: { allow: ['B'] } };
    const s2 = { permissions: { allow: ['C'] } };
    const merged = mergeSettings(base, s1, s2);
    expect(merged.permissions.allow).toEqual(['A', 'B', 'C']);
  });

  it('skips null/undefined stacks', () => {
    const base = { permissions: { allow: ['A'] }, hooks: {} };
    const merged = mergeSettings(base, null, undefined);
    expect(merged.permissions.allow).toEqual(['A']);
  });
});

describe('readTemplate', () => {
  it('reads a template file', async () => {
    const content = await readTemplate('core/mcp-json.json');
    expect(content).toContain('mcpServers');
  });
});

describe('scaffoldFile', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
      tmpDir = null;
    }
  });

  it('creates file with variable substitution', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-scaffold-'));
    await scaffoldFile(
      'specs/spec-md.md',
      'SPEC.md',
      { project_name: 'TestProj', description: 'A test' },
      tmpDir
    );
    const content = await fs.readFile(path.join(tmpDir, 'SPEC.md'), 'utf-8');
    expect(content).toContain('TestProj');
    expect(content).toContain('A test');
  });
});

describe('getTemplatesDir', () => {
  it('returns a path that exists', async () => {
    const dir = getTemplatesDir();
    expect(await fs.pathExists(dir)).toBe(true);
  });
});

describe('updateGitignore', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
      tmpDir = null;
    }
  });

  it('creates .gitignore when it does not exist', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(true);
    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('.claude/sessions/');
    expect(content).toContain('.claude/settings.local.json');
    expect(content).toContain('.claude/workflow-meta.json');
    expect(content).toContain('.claude/worktrees/');
    expect(content).toContain('.claude-backup-*/');
    expect(content).toContain('# Worclaude');
  });

  it('appends entries to existing .gitignore', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'node_modules/\n');
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(true);
    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('.claude/sessions/');
    expect(content).toContain('.claude/settings.local.json');
    expect(content).toContain('.claude/workflow-meta.json');
    expect(content).toContain('.claude/worktrees/');
    expect(content).toContain('.claude-backup-*/');
  });

  it('is idempotent when entries already present', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await fs.writeFile(
      path.join(tmpDir, '.gitignore'),
      '.claude/sessions/\n.claude/settings.local.json\n.claude/workflow-meta.json\n.claude/worktrees/\n.claude-backup-*/\n.claude/learnings/\n'
    );
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(false);
  });

  it('adds only missing entries', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await fs.writeFile(path.join(tmpDir, '.gitignore'), '.claude/sessions/\n');
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(true);
    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('.claude/settings.local.json');
    expect(content).toContain('.claude/workflow-meta.json');
    expect(content).toContain('.claude/worktrees/');
    expect(content).toContain('.claude-backup-*/');
    // Should not duplicate .claude/sessions/
    const matches = content.match(/\.claude\/sessions\//g);
    expect(matches.length).toBe(1);
  });

  it('migrates old .claude/ blanket entry to granular entries', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await fs.writeFile(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\n\n# Worclaude (generated workflow files)\n.claude/\n.claude-backup-*/\n'
    );
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(true);
    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    // Old blanket entry removed
    const lines = content.split('\n').map((l) => l.trim());
    expect(lines).not.toContain('.claude/');
    // New granular entries present
    expect(content).toContain('.claude/sessions/');
    expect(content).toContain('.claude/settings.local.json');
    expect(content).toContain('.claude/workflow-meta.json');
    expect(content).toContain('.claude/worktrees/');
    expect(content).toContain('.claude-backup-*/');
    // Header present once
    const headerMatches = content.match(/# Worclaude/g);
    expect(headerMatches.length).toBe(1);
  });

  it('writes exactly 6 gitignore entries', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await updateGitignore(tmpDir);
    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    const entryLines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    expect(entryLines).toHaveLength(6);
    expect(entryLines).toEqual([
      '.claude/sessions/',
      '.claude/settings.local.json',
      '.claude/workflow-meta.json',
      '.claude/worktrees/',
      '.claude-backup-*/',
      '.claude/learnings/',
    ]);
  });
});

describe('slugifyPluginName', () => {
  it('lowercases', () => {
    expect(slugifyPluginName('MyProject')).toBe('myproject');
  });

  it('replaces non-alphanumeric runs with single hyphen', () => {
    expect(slugifyPluginName('my project  v2')).toBe('my-project-v2');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugifyPluginName('--foo--')).toBe('foo');
  });

  it('collapses special characters', () => {
    expect(slugifyPluginName('foo@bar!baz')).toBe('foo-bar-baz');
  });

  it('falls back to worclaude-plugin for empty input', () => {
    expect(slugifyPluginName('')).toBe('worclaude-plugin');
    expect(slugifyPluginName(null)).toBe('worclaude-plugin');
    expect(slugifyPluginName(undefined)).toBe('worclaude-plugin');
    expect(slugifyPluginName('---')).toBe('worclaude-plugin');
  });
});

describe('scaffoldPluginJson', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) await fs.remove(tmpDir);
  });

  it('creates .claude-plugin/plugin.json with required fields', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'my-app',
      description: 'Test description',
      selectedAgents: ['bug-fixer'],
    });
    const content = await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe('my-app-workflow');
    expect(parsed.version).toBe('0.1.0');
    expect(parsed.description).toBe('Test description');
  });

  it('name is slugified project name plus -workflow suffix', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'My Cool App!',
      description: '',
      selectedAgents: [],
    });
    const parsed = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    expect(parsed.name).toBe('my-cool-app-workflow');
  });

  it('agents array contains explicit ./.claude/agents/<name>.md paths for universal + selected', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'app',
      description: '',
      selectedAgents: ['bug-fixer', 'doc-writer'],
    });
    const parsed = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    expect(parsed.agents).toEqual(
      expect.arrayContaining([
        './.claude/agents/plan-reviewer.md',
        './.claude/agents/bug-fixer.md',
        './.claude/agents/doc-writer.md',
      ])
    );
    expect(parsed.agents).toHaveLength(UNIVERSAL_AGENTS.length + 2);
    for (const p of parsed.agents) {
      expect(p).toMatch(/^\.\/\.claude\/agents\/[\w-]+\.md$/);
    }
  });

  it('does NOT include a hooks field', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'app',
      description: '',
      selectedAgents: [],
    });
    const parsed = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    expect(parsed).not.toHaveProperty('hooks');
  });

  it('skills is ./.claude/skills/ and commands is ./.claude/commands/', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'app',
      description: '',
      selectedAgents: [],
    });
    const parsed = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    expect(parsed.skills).toEqual(['./.claude/skills/']);
    expect(parsed.commands).toEqual(['./.claude/commands/']);
  });

  it('does NOT include author, homepage, repository, or license fields', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'app',
      description: '',
      selectedAgents: [],
    });
    const parsed = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    expect(parsed).not.toHaveProperty('author');
    expect(parsed).not.toHaveProperty('homepage');
    expect(parsed).not.toHaveProperty('repository');
    expect(parsed).not.toHaveProperty('license');
  });

  it('is idempotent — preserves existing plugin.json', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await fs.ensureDir(path.join(tmpDir, '.claude-plugin'));
    const existing = '{"custom": true, "version": "9.9.9"}';
    await fs.writeFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), existing);
    await scaffoldPluginJson(tmpDir, {
      projectName: 'app',
      description: '',
      selectedAgents: [],
    });
    const content = await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8');
    expect(content).toBe(existing);
  });

  it('falls back to default description when selections.description is empty', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'myapp',
      description: '',
      selectedAgents: [],
    });
    const parsed = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8')
    );
    expect(parsed.description).toBe('Claude Code workflow for myapp');
  });

  it('output is valid parseable JSON', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-plugin-'));
    await scaffoldPluginJson(tmpDir, {
      projectName: 'app',
      description: 'D',
      selectedAgents: [],
    });
    const content = await fs.readFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });
});

describe('scaffoldMemoryDocs', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) await fs.remove(tmpDir);
  });

  it('creates docs/memory/decisions.md and preferences.md', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-memory-'));
    await scaffoldMemoryDocs(tmpDir);
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'memory', 'decisions.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'docs', 'memory', 'preferences.md'))).toBe(true);
  });

  it('decisions.md contains # Decisions Log heading', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-memory-'));
    await scaffoldMemoryDocs(tmpDir);
    const content = await fs.readFile(path.join(tmpDir, 'docs', 'memory', 'decisions.md'), 'utf-8');
    expect(content).toContain('# Decisions Log');
  });

  it('preferences.md contains Code Style, Tooling, Workflow sections', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-memory-'));
    await scaffoldMemoryDocs(tmpDir);
    const content = await fs.readFile(
      path.join(tmpDir, 'docs', 'memory', 'preferences.md'),
      'utf-8'
    );
    expect(content).toContain('## Code Style');
    expect(content).toContain('## Tooling');
    expect(content).toContain('## Workflow');
  });

  it('does not overwrite existing decisions.md', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-memory-'));
    await fs.ensureDir(path.join(tmpDir, 'docs', 'memory'));
    const customContent = '# My custom decisions\n\n## 2026-04-14\nKept it.';
    await fs.writeFile(path.join(tmpDir, 'docs', 'memory', 'decisions.md'), customContent);
    await scaffoldMemoryDocs(tmpDir);
    const content = await fs.readFile(path.join(tmpDir, 'docs', 'memory', 'decisions.md'), 'utf-8');
    expect(content).toBe(customContent);
  });

  it('written content matches readTemplate source byte-for-byte', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-memory-'));
    await scaffoldMemoryDocs(tmpDir);
    const decisionsWritten = await fs.readFile(
      path.join(tmpDir, 'docs', 'memory', 'decisions.md'),
      'utf-8'
    );
    const decisionsTemplate = await readTemplate('memory/decisions.md');
    expect(decisionsWritten).toBe(decisionsTemplate);
    const prefsWritten = await fs.readFile(
      path.join(tmpDir, 'docs', 'memory', 'preferences.md'),
      'utf-8'
    );
    const prefsTemplate = await readTemplate('memory/preferences.md');
    expect(prefsWritten).toBe(prefsTemplate);
  });
});
