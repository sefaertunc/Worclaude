import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cliPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
  'src',
  'index.js'
);

function runCli(args) {
  return spawnSync('node', [cliPath, ...args], {
    encoding: 'utf-8',
    timeout: 10000,
  });
}

describe('setup-state CLI routing', () => {
  it('exits 2 with actionable message for an unknown subcommand', () => {
    const result = runCli(['setup-state', 'foobar']);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unknown setup-state subcommand');
    expect(result.stderr).toContain('foobar');
    expect(result.stderr).toContain('show, save, reset, resume-info');
  });

  it('exits 2 for a typo-like subcommand', () => {
    const result = runCli(['setup-state', 'shoow']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('shoow');
  });

  it('accepts a valid subcommand (show) without the unknown-subcommand error', () => {
    // Run against a path that has no state file — should print "no state" + exit 0.
    const result = runCli(['setup-state', 'show', '--path', '/nonexistent/dir']);
    expect(result.stderr).not.toContain('unknown setup-state subcommand');
  });
});
