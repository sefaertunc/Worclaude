import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import {
  readJsonl,
  pairAgentEvents,
  computeReport,
  renderMarkdown,
} from '../../src/utils/observability.js';

async function writeJsonl(file, entries) {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

describe('observability', () => {
  describe('readJsonl', () => {
    let tmpDir;
    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-obs-jsonl-'));
    });
    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('returns empty array for missing file', async () => {
      expect(await readJsonl(path.join(tmpDir, 'absent.jsonl'))).toEqual([]);
    });

    it('parses each non-empty line as JSON', async () => {
      const file = path.join(tmpDir, 'a.jsonl');
      await fs.writeFile(file, '{"a":1}\n{"a":2}\n\n{"a":3}\n');
      expect(await readJsonl(file)).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
    });

    it('skips malformed lines without throwing', async () => {
      const file = path.join(tmpDir, 'a.jsonl');
      await fs.writeFile(file, '{"a":1}\nnot-json\n{"a":2}\n');
      expect(await readJsonl(file)).toEqual([{ a: 1 }, { a: 2 }]);
    });
  });

  describe('pairAgentEvents', () => {
    it('pairs a single start+stop into one invocation with duration', () => {
      const events = [
        {
          ts: '2026-04-27T12:00:00.000Z',
          event: 'start',
          agent: 'verify-app',
          session: 's1',
        },
        {
          ts: '2026-04-27T12:00:30.000Z',
          event: 'stop',
          agent: 'verify-app',
          session: 's1',
          exit: 'completed',
        },
      ];
      const pairs = pairAgentEvents(events);
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toMatchObject({
        agent: 'verify-app',
        durationMs: 30000,
        exit: 'completed',
      });
    });

    it('pairs by session+agent (different sessions are independent)', () => {
      const events = [
        { ts: '2026-04-27T12:00:00.000Z', event: 'start', agent: 'a', session: 's1' },
        { ts: '2026-04-27T12:00:00.000Z', event: 'start', agent: 'a', session: 's2' },
        { ts: '2026-04-27T12:00:10.000Z', event: 'stop', agent: 'a', session: 's1' },
        { ts: '2026-04-27T12:00:20.000Z', event: 'stop', agent: 'a', session: 's2' },
      ];
      const pairs = pairAgentEvents(events);
      expect(pairs).toHaveLength(2);
      const durations = pairs.map((p) => p.durationMs).sort();
      expect(durations).toEqual([10000, 20000]);
    });

    it('records orphan stops (no matching start) with null duration', () => {
      const events = [
        {
          ts: '2026-04-27T12:00:30.000Z',
          event: 'stop',
          agent: 'verify-app',
          session: 's1',
          exit: 'completed',
        },
      ];
      const pairs = pairAgentEvents(events);
      expect(pairs).toHaveLength(1);
      expect(pairs[0].durationMs).toBeNull();
    });

    it('drops orphan starts (still running)', () => {
      const events = [
        { ts: '2026-04-27T12:00:00.000Z', event: 'start', agent: 'a', session: 's1' },
      ];
      expect(pairAgentEvents(events)).toEqual([]);
    });

    it('defaults missing exit to "completed" on stop pair', () => {
      const events = [
        { ts: '2026-04-27T12:00:00.000Z', event: 'start', agent: 'a', session: 's1' },
        { ts: '2026-04-27T12:00:10.000Z', event: 'stop', agent: 'a', session: 's1' },
      ];
      expect(pairAgentEvents(events)[0].exit).toBe('completed');
    });
  });

  describe('computeReport', () => {
    let tmpDir;
    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-obs-report-'));
    });
    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('returns zeros and empty stats on a project with no captures', async () => {
      const r = await computeReport(tmpDir);
      expect(r.counts).toMatchObject({
        skillEvents: 0,
        commandEvents: 0,
        agentEvents: 0,
        agentPairs: 0,
      });
      expect(r.skillStats).toEqual([]);
      expect(r.anomalies).toEqual([]);
    });

    it('tallies skill loads in descending order', async () => {
      const obs = path.join(tmpDir, '.claude', 'observability');
      await writeJsonl(path.join(obs, 'skill-loads.jsonl'), [
        { ts: '2026-04-27T10:00:00.000Z', skill: 'testing', trigger: 'manual' },
        { ts: '2026-04-27T11:00:00.000Z', skill: 'git-conventions' },
        { ts: '2026-04-27T12:00:00.000Z', skill: 'testing' },
      ]);
      const r = await computeReport(tmpDir);
      expect(r.skillStats[0]).toMatchObject({ key: 'testing', count: 2 });
      expect(r.skillStats[1]).toMatchObject({ key: 'git-conventions', count: 1 });
    });

    it('records lastSeen for each skill from the most recent ts', async () => {
      const obs = path.join(tmpDir, '.claude', 'observability');
      await writeJsonl(path.join(obs, 'skill-loads.jsonl'), [
        { ts: '2026-04-26T10:00:00.000Z', skill: 'testing' },
        { ts: '2026-04-27T15:00:00.000Z', skill: 'testing' },
      ]);
      const r = await computeReport(tmpDir);
      expect(r.skillStats[0].lastSeen).toBe('2026-04-27T15:00:00.000Z');
    });

    it('flags installed skills that never loaded as anomalies', async () => {
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills', 'never-loaded'));
      await fs.ensureDir(path.join(tmpDir, '.claude', 'skills', 'frequently-loaded'));
      const obs = path.join(tmpDir, '.claude', 'observability');
      await writeJsonl(path.join(obs, 'skill-loads.jsonl'), [
        { ts: '2026-04-27T10:00:00.000Z', skill: 'frequently-loaded' },
      ]);
      const r = await computeReport(tmpDir);
      const messages = r.anomalies.map((a) => a.message).join('\n');
      expect(messages).toContain('never-loaded');
      expect(messages).not.toContain('frequently-loaded');
    });

    it('flags agents with more failures than completions (>=3 invocations)', async () => {
      const obs = path.join(tmpDir, '.claude', 'observability');
      const ev = (n, exit, agent = 'flaky') => [
        { ts: `2026-04-27T${10 + n}:00:00.000Z`, event: 'start', agent, session: `s${n}` },
        {
          ts: `2026-04-27T${10 + n}:00:30.000Z`,
          event: 'stop',
          agent,
          session: `s${n}`,
          exit,
        },
      ];
      await writeJsonl(path.join(obs, 'agent-events.jsonl'), [
        ...ev(0, 'failed'),
        ...ev(1, 'failed'),
        ...ev(2, 'completed'),
      ]);
      const r = await computeReport(tmpDir);
      expect(r.anomalies.some((a) => a.kind === 'agent-fails-more-than-completes')).toBe(true);
    });

    it('does NOT flag <3 invocations as anomalies (insufficient signal)', async () => {
      const obs = path.join(tmpDir, '.claude', 'observability');
      await writeJsonl(path.join(obs, 'agent-events.jsonl'), [
        {
          ts: '2026-04-27T10:00:00.000Z',
          event: 'start',
          agent: 'a',
          session: 's0',
        },
        {
          ts: '2026-04-27T10:00:30.000Z',
          event: 'stop',
          agent: 'a',
          session: 's0',
          exit: 'failed',
        },
      ]);
      const r = await computeReport(tmpDir);
      expect(r.anomalies.some((a) => a.kind === 'agent-fails-more-than-completes')).toBe(false);
    });

    it('suggests retirement for skills not loaded in 30+ days', async () => {
      const obs = path.join(tmpDir, '.claude', 'observability');
      await writeJsonl(path.join(obs, 'skill-loads.jsonl'), [
        { ts: '2026-03-01T10:00:00.000Z', skill: 'old-skill' },
      ]);
      const r = await computeReport(tmpDir, { now: Date.parse('2026-04-15T10:00:00.000Z') });
      expect(r.suggestions.some((s) => s.message.includes('old-skill'))).toBe(true);
    });
  });

  describe('renderMarkdown', () => {
    it('emits required section headings even with empty data', () => {
      const empty = {
        generatedAt: '2026-04-27T12:00:00.000Z',
        counts: {
          skillEvents: 0,
          commandEvents: 0,
          agentEvents: 0,
          agentPairs: 0,
          installedSkills: 0,
        },
        skillStats: [],
        commandStats: [],
        agentStats: [],
        anomalies: [],
        suggestions: [],
      };
      const md = renderMarkdown(empty);
      expect(md).toContain('# Observability Report');
      expect(md).toContain('## Top Skills');
      expect(md).toContain('## Top Commands');
      expect(md).toContain('## Agent Invocations');
      expect(md).toContain('## Anomalies');
      expect(md).toContain('## Suggestions');
      expect(md).toContain('_No skill loads captured yet._');
    });

    it('renders agent durations in human form', () => {
      const r = {
        generatedAt: '2026-04-27T12:00:00.000Z',
        counts: {
          skillEvents: 0,
          commandEvents: 0,
          agentEvents: 2,
          agentPairs: 1,
          installedSkills: 0,
        },
        skillStats: [],
        commandStats: [],
        agentStats: [
          { agent: 'verify-app', invocations: 1, completed: 1, failed: 0, avgDurationMs: 58000 },
        ],
        anomalies: [],
        suggestions: [],
      };
      const md = renderMarkdown(r);
      expect(md).toContain('verify-app');
      expect(md).toContain('58.0s');
    });

    it('truncates skill list to top 10', () => {
      const skillStats = Array.from({ length: 15 }, (_, i) => ({
        key: `skill-${i}`,
        count: 15 - i,
        lastSeen: null,
      }));
      const r = {
        generatedAt: '2026-04-27T12:00:00.000Z',
        counts: {
          skillEvents: 120,
          commandEvents: 0,
          agentEvents: 0,
          agentPairs: 0,
          installedSkills: 0,
        },
        skillStats,
        commandStats: [],
        agentStats: [],
        anomalies: [],
        suggestions: [],
      };
      const md = renderMarkdown(r);
      expect(md).toContain('skill-0');
      expect(md).toContain('skill-9');
      expect(md).not.toContain('skill-10');
    });
  });
});
