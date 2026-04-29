#!/usr/bin/env node
'use strict';

// UserPromptSubmit hook: records slash-command invocations to
// .claude/observability/command-invocations.jsonl. Reads JSON from stdin
// per Claude Code hook contract. Skips non-slash prompts (filter is
// `/^/`). Always exits 0.

const { readFileSync, appendFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

const SLASH_RE = /^\s*\/([\w-]+)/;

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }

  const prompt = input.prompt || input.user_prompt || input.text || '';
  const match = SLASH_RE.exec(prompt);
  if (!match) return;

  const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const obsDir = join(cwd, '.claude', 'observability');
  if (!existsSync(obsDir)) {
    try {
      mkdirSync(obsDir, { recursive: true });
    } catch {
      return;
    }
  }

  const entry = {
    ts: new Date().toISOString(),
    command: '/' + match[1],
  };
  if (input.session_id) entry.session = input.session_id;

  try {
    appendFileSync(join(obsDir, 'command-invocations.jsonl'), JSON.stringify(entry) + '\n');
  } catch {
    // Non-critical
  }
}

try {
  main();
} catch {
  // Never block session
}
