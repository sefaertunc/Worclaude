#!/usr/bin/env node
'use strict';

// PreCompact hook: saves context snapshot before compaction.
// Reads JSON from stdin per Claude Code hook contract.
// Writes snapshot to .claude/sessions/pre-compact-{timestamp}.md.
// Always exits 0 — never blocks compaction.

const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

function run(cmd, cwd) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

try {
  const input = readFileSync(0, 'utf8');
  const data = JSON.parse(input);

  const trigger = data.trigger || 'unknown';
  const cwd = data.cwd || process.cwd();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const sessionsDir = join(cwd, '.claude', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });

  const branch = run('git rev-parse --abbrev-ref HEAD', cwd) || 'unknown';
  const modifiedFiles = run('git status --porcelain', cwd) || '_No uncommitted changes_';
  const recentCommits = run('git log --oneline -3', cwd) || '_No commits_';

  const snapshot = [
    '# Pre-Compact Snapshot',
    `**Trigger:** ${trigger}`,
    `**Time:** ${new Date().toISOString()}`,
    `**Branch:** ${branch}`,
    '',
    '## Modified Files',
    modifiedFiles,
    '',
    '## Recent Commits',
    recentCommits,
    '',
  ].join('\n');

  writeFileSync(join(sessionsDir, `pre-compact-${timestamp}.md`), snapshot);
} catch {
  // Never block compaction
}

process.exit(0);
