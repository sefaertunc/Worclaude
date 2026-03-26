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
} from '../../src/core/scaffolder.js';

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
    expect(content).toContain('.claude/');
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
    expect(content).toContain('.claude/');
    expect(content).toContain('.claude-backup-*/');
  });

  it('is idempotent when entries already present', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await fs.writeFile(path.join(tmpDir, '.gitignore'), '.claude/\n.claude-backup-*/\n');
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(false);
  });

  it('adds only missing entries', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-gitignore-'));
    await fs.writeFile(path.join(tmpDir, '.gitignore'), '.claude/\n');
    const result = await updateGitignore(tmpDir);
    expect(result).toBe(true);
    const content = await fs.readFile(path.join(tmpDir, '.gitignore'), 'utf8');
    expect(content).toContain('.claude-backup-*/');
    // Should not duplicate .claude/
    const matches = content.match(/\.claude\//g);
    expect(matches.length).toBe(1);
  });
});
