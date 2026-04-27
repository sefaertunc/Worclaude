#!/usr/bin/env node
'use strict';

// InstructionsLoaded hook: records each skill load to
// .claude/observability/skill-loads.jsonl. Reads JSON from stdin per Claude
// Code hook contract. Always exits 0 — never blocks the session.

const { readFileSync, appendFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }

  const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const obsDir = join(cwd, '.claude', 'observability');
  if (!existsSync(obsDir)) {
    try {
      mkdirSync(obsDir, { recursive: true });
    } catch {
      return;
    }
  }

  const skill =
    input.skill_name ||
    input.skill ||
    input.instructions_name ||
    (input.path && String(input.path).split('/').filter(Boolean).slice(-2, -1)[0]) ||
    'unknown';
  const trigger = input.trigger || input.reason || 'unknown';

  const entry = {
    ts: new Date().toISOString(),
    skill,
    trigger,
  };

  try {
    appendFileSync(join(obsDir, 'skill-loads.jsonl'), JSON.stringify(entry) + '\n');
  } catch {
    // Non-critical
  }
}

try {
  main();
} catch {
  // Never block session
}
