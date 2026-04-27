import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { worktreesCleanCommand } from '../../src/commands/worktrees.js';

function git(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function setupGitRepo(tmpDir) {
  git(tmpDir, ['init', '-q', '--initial-branch=main']);
  git(tmpDir, ['config', 'user.email', 'wt-test@example.com']);
  git(tmpDir, ['config', 'user.name', 'wt-test']);
  git(tmpDir, ['commit', '--allow-empty', '-q', '-m', 'initial']);
}

describe('worktrees clean command', () => {
  let tmpDir;
  let origCwd;
  let logs;

  beforeEach(async () => {
    origCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'worclaude-wt-'));
    process.chdir(tmpDir);
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((m) => logs.push(String(m)));
    process.exitCode = 0;
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await fs.remove(tmpDir);
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  const output = () => logs.join('\n');

  it('reports a clean message when .claude/worktrees/ does not exist', async () => {
    await worktreesCleanCommand({ path: tmpDir });
    expect(output()).toContain('No .claude/worktrees/ directory');
    expect(process.exitCode).toBe(0);
  });

  it('reports an empty message when the directory has no entries', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude', 'worktrees'));
    await worktreesCleanCommand({ path: tmpDir });
    expect(output()).toContain('is empty');
    expect(process.exitCode).toBe(0);
  });

  it('removes orphaned (non-git) worktree directories via filesystem fallback', async () => {
    setupGitRepo(tmpDir);
    const wt = path.join(tmpDir, '.claude', 'worktrees');
    const a = path.join(wt, 'agent-a');
    const b = path.join(wt, 'agent-b');
    await fs.ensureDir(a);
    await fs.ensureDir(b);

    await worktreesCleanCommand({ path: tmpDir });

    expect(await fs.pathExists(a)).toBe(false);
    expect(await fs.pathExists(b)).toBe(false);
    expect(output()).toContain('Cleaned 2/2 worktrees');
    expect(process.exitCode).toBe(0);
  });

  it('removes a registered git worktree via git worktree remove -f -f', async () => {
    setupGitRepo(tmpDir);
    const wtPath = path.join(tmpDir, '.claude', 'worktrees', 'agent-real');
    git(tmpDir, ['worktree', 'add', wtPath, '-b', 'agent-branch']);
    expect(await fs.pathExists(wtPath)).toBe(true);

    await worktreesCleanCommand({ path: tmpDir });

    expect(await fs.pathExists(wtPath)).toBe(false);
    expect(output()).toContain('Removed agent-real');
    expect(process.exitCode).toBe(0);
  });

  it('ignores hidden entries and regular files when listing', async () => {
    const wt = path.join(tmpDir, '.claude', 'worktrees');
    await fs.ensureDir(wt);
    await fs.writeFile(path.join(wt, '.gitkeep'), '');
    await fs.writeFile(path.join(wt, 'README.md'), '# notes');

    await worktreesCleanCommand({ path: tmpDir });

    expect(output()).toContain('is empty');
    // Files preserved
    expect(await fs.pathExists(path.join(wt, '.gitkeep'))).toBe(true);
    expect(await fs.pathExists(path.join(wt, 'README.md'))).toBe(true);
  });
});
