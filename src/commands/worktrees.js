import fs from 'fs-extra';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as display from '../utils/display.js';

function runGit(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 10000,
  });
  return {
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

async function listWorktreeDirs(worktreesDir) {
  const entries = await fs.readdir(worktreesDir).catch(() => []);
  const dirs = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const full = path.join(worktreesDir, name);
    const stat = await fs.stat(full).catch(() => null);
    if (stat && stat.isDirectory()) dirs.push({ name, full });
  }
  return dirs;
}

export async function worktreesCleanCommand(options = {}) {
  const projectRoot = options.path || process.cwd();
  const worktreesDir = path.join(projectRoot, '.claude', 'worktrees');

  if (!(await fs.pathExists(worktreesDir))) {
    display.info('No .claude/worktrees/ directory — nothing to clean.');
    return;
  }

  const dirs = await listWorktreeDirs(worktreesDir);
  if (dirs.length === 0) {
    display.info('.claude/worktrees/ is empty — nothing to clean.');
    return;
  }

  display.info(`Found ${dirs.length} worktree entr${dirs.length === 1 ? 'y' : 'ies'}.`);
  display.newline();

  const removed = [];
  const failed = [];

  for (const { name, full } of dirs) {
    // `git worktree remove -f -f` force-removes locked worktrees. The double
    // `-f` is required because the first `-f` only overrides the lock check,
    // and the second overrides "the worktree contains modifications" check.
    const removeResult = runGit(projectRoot, ['worktree', 'remove', '-f', '-f', full]);

    if (removeResult.status === 0) {
      removed.push(name);
      display.success(`Removed ${name}`);
      continue;
    }

    // git worktree remove may fail when the worktree is unregistered (the
    // directory exists but git no longer tracks it). Fall back to rm + prune.
    const rmResult = await fs.remove(full).then(
      () => ({ ok: true }),
      (err) => ({ ok: false, err })
    );
    if (rmResult.ok) {
      runGit(projectRoot, ['worktree', 'prune']);
      removed.push(name);
      display.success(`Removed ${name} (orphaned, fs cleanup)`);
    } else {
      failed.push({ name, reason: removeResult.stderr || rmResult.err?.message });
      display.warn(`Failed to remove ${name}: ${removeResult.stderr || rmResult.err?.message}`);
    }
  }

  display.newline();
  display.info(
    `Cleaned ${removed.length}/${dirs.length} worktrees${
      failed.length > 0 ? ` (${failed.length} failed)` : ''
    }.`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}
