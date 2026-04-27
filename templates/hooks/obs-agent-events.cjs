#!/usr/bin/env node
'use strict';

// SubagentStart and SubagentStop hook: records each agent event to
// .claude/observability/agent-events.jsonl. The aggregator
// (worclaude observability) pairs start+stop on session+agent to
// compute durations — keeping the hook stateless.
//
// Single hook serves both events; the input.event field tells which
// fired. Always exits 0.

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

  const event = input.event || input.hook_event_name || 'unknown';
  const phase = /stop$/i.test(event) ? 'stop' : 'start';

  const entry = {
    ts: new Date().toISOString(),
    event: phase,
    agent: input.agent_name || input.subagent_type || input.agent || 'unknown',
  };
  if (input.session_id) entry.session = input.session_id;
  if (phase === 'stop' && input.exit_status) entry.exit = input.exit_status;

  try {
    appendFileSync(join(obsDir, 'agent-events.jsonl'), JSON.stringify(entry) + '\n');
  } catch {
    // Non-critical
  }
}

try {
  main();
} catch {
  // Never block session
}
