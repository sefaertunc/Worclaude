import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'templates',
  'hooks'
);

function runHook(scriptName, input, projectRoot) {
  const scriptPath = path.join(HOOKS_DIR, scriptName);
  execFileSync('node', [scriptPath], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectRoot },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('observability hooks', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-obs-hook-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('obs-skill-loads.cjs', () => {
    const file = (root) => path.join(root, '.claude', 'observability', 'skill-loads.jsonl');

    it('writes a skill-load entry on InstructionsLoaded input', () => {
      runHook('obs-skill-loads.cjs', { skill_name: 'git-conventions', trigger: 'manual' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ skill: 'git-conventions', trigger: 'manual' });
      expect(entries[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('falls back to "unknown" when no skill identifier is present', () => {
      runHook('obs-skill-loads.cjs', {}, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0].skill).toBe('unknown');
    });

    it('extracts skill name from path when frontend/skills/X/SKILL.md style is given', () => {
      runHook('obs-skill-loads.cjs', { path: '.claude/skills/testing/SKILL.md' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0].skill).toBe('testing');
    });

    it('appends to existing file rather than overwriting', () => {
      runHook('obs-skill-loads.cjs', { skill_name: 'a' }, tmpDir);
      runHook('obs-skill-loads.cjs', { skill_name: 'b' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.skill)).toEqual(['a', 'b']);
    });

    it('exits 0 (does not block session) on malformed stdin', () => {
      const scriptPath = path.join(HOOKS_DIR, 'obs-skill-loads.cjs');
      const result = execFileSync('node', [scriptPath], {
        input: 'not json',
        env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(result.toString()).toBe('');
    });
  });

  describe('obs-command-invocations.cjs', () => {
    const file = (root) => path.join(root, '.claude', 'observability', 'command-invocations.jsonl');

    it('records a slash-command invocation', () => {
      runHook('obs-command-invocations.cjs', { prompt: '/start with arg' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries).toHaveLength(1);
      expect(entries[0].command).toBe('/start');
    });

    it('skips non-slash prompts', () => {
      runHook('obs-command-invocations.cjs', { prompt: 'just talking' }, tmpDir);
      expect(fs.existsSync(file(tmpDir))).toBe(false);
    });

    it('captures session id when provided', () => {
      runHook('obs-command-invocations.cjs', { prompt: '/verify', session_id: 'abc-123' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0].session).toBe('abc-123');
    });

    it('strips arguments from the command name', () => {
      runHook('obs-command-invocations.cjs', { prompt: '/commit-push-pr foo bar' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0].command).toBe('/commit-push-pr');
    });
  });

  describe('obs-agent-events.cjs', () => {
    const file = (root) => path.join(root, '.claude', 'observability', 'agent-events.jsonl');

    it('records start phase from SubagentStart event', () => {
      runHook('obs-agent-events.cjs', { event: 'SubagentStart', agent_name: 'verify-app' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0]).toMatchObject({ event: 'start', agent: 'verify-app' });
    });

    it('records stop phase with exit status', () => {
      runHook(
        'obs-agent-events.cjs',
        { event: 'SubagentStop', agent_name: 'verify-app', exit_status: 'completed' },
        tmpDir
      );
      const entries = readJsonl(file(tmpDir));
      expect(entries[0]).toMatchObject({
        event: 'stop',
        agent: 'verify-app',
        exit: 'completed',
      });
    });

    it('falls back to "unknown" agent when no identifier present', () => {
      runHook('obs-agent-events.cjs', { event: 'SubagentStart' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0].agent).toBe('unknown');
    });

    it('honors hook_event_name as the event source', () => {
      runHook('obs-agent-events.cjs', { hook_event_name: 'SubagentStop', agent_name: 'a' }, tmpDir);
      const entries = readJsonl(file(tmpDir));
      expect(entries[0].event).toBe('stop');
    });
  });
});
