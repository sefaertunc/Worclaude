import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  FeedFetchError,
  FeedMalformedError,
  FeedVersionMismatchError,
} from '@sefaertunc/anthropic-watch-client';
import {
  runPrecheck,
  classifyError,
  seenKeyForStateEntry,
} from '../../scripts/upstream-precheck.mjs';

async function readOutputs(outputPath) {
  const raw = await fs.readFile(outputPath, 'utf8');
  const pairs = {};
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    pairs[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return pairs;
}

function makeItem(id, source, overrides = {}) {
  return {
    id,
    uniqueKey: `${id}|${source}`,
    title: `Item ${id} from ${source}`,
    date: '2026-04-28T00:00:00.000Z',
    url: `https://example.com/${source}/${id}`,
    snippet: `snippet for ${id}`,
    source,
    sourceCategory: 'core',
    sourceName: source,
    ...overrides,
  };
}

function makeReport(items) {
  const sourcesByKey = new Map();
  for (const item of items) {
    if (!sourcesByKey.has(item.source)) {
      sourcesByKey.set(item.source, {
        key: item.source,
        name: item.sourceName,
        category: item.sourceCategory,
        status: 'ok',
        newItemCount: 0,
        durationMs: 100,
        error: null,
      });
    }
    sourcesByKey.get(item.source).newItemCount += 1;
  }
  return {
    version: '1.0',
    runId: 'run-test-1',
    timestamp: '2026-04-28T09:30:00.000Z',
    duration_ms: 1234,
    summary: {
      totalNewItems: items.length,
      sourcesChecked: sourcesByKey.size,
      sourcesWithErrors: 0,
      healthySources: sourcesByKey.size,
    },
    sources: Array.from(sourcesByKey.values()),
  };
}

function makeFakeClient({ items = [], report = null, fail = null } = {}) {
  const resolvedReport = report ?? makeReport(items);
  return {
    async fetchAllItems() {
      if (fail) throw fail;
      return items;
    },
    async fetchRunReport() {
      if (fail) throw fail;
      return resolvedReport;
    },
  };
}

describe('upstream-precheck', () => {
  let tmpDir;
  let outputPath;
  let statePath;
  let logSpy;
  let errSpy;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upstream-precheck-'));
    outputPath = path.join(tmpDir, 'gh-output');
    statePath = path.join(tmpDir, 'upstream-state.json');
    await fs.ensureFile(outputPath);
    process.env.RUNNER_TEMP = tmpDir;
    process.env.GITHUB_OUTPUT = outputPath;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    delete process.env.RUNNER_TEMP;
    delete process.env.GITHUB_OUTPUT;
    delete process.env.STATE_PATH;
    await fs.remove(tmpDir);
  });

  describe('happy paths', () => {
    it('treats every item as new on a fresh state file', async () => {
      const items = [
        makeItem('v1.0.0', 'claude-code-releases'),
        makeItem('v0.1.5', 'agent-sdk-py-changelog'),
      ];
      const result = await runPrecheck({
        client: makeFakeClient({ items }),
        statePath,
      });

      expect(result.failed).toBe(false);
      expect(result.newCount).toBe(2);

      const out = await readOutputs(outputPath);
      expect(out.has_new).toBe('true');
      expect(out.new_count).toBe('2');
      expect(out.fetch_failure).toBe('false');
      expect(out.fetch_error).toBe('');
      expect(out.run_timestamp).toBe('2026-04-28T09:30:00.000Z');

      const newItemsRaw = await fs.readFile(out.new_items_path, 'utf8');
      const newItems = JSON.parse(newItemsRaw);
      expect(newItems).toHaveLength(2);
      expect(newItems[0]).toMatchObject({
        id: 'v1.0.0',
        source: 'claude-code-releases',
        sourceCategory: 'core',
      });

      const nextStateRaw = await fs.readFile(out.next_state_path, 'utf8');
      const nextState = JSON.parse(nextStateRaw);
      expect(nextState.lastSeenItems).toHaveLength(2);
      expect(nextState.lastSeenItems[0]).toMatchObject({
        id: 'v1.0.0',
        uniqueKey: 'v1.0.0|claude-code-releases',
        source: 'claude-code-releases',
      });
      expect(nextState.lastSeenItems[0].firstSeen).toBeTruthy();
      expect(nextState.consecutiveFetchFailures).toBe(0);
    });

    it('writes feed-report.json containing the full run report', async () => {
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const out = await readOutputs(outputPath);
      const report = JSON.parse(await fs.readFile(out.feed_report_path, 'utf8'));
      expect(report.version).toBe('1.0');
      expect(report.summary.sourcesChecked).toBe(1);
    });

    it('reports has_new=false when no new items', async () => {
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: '2026-04-27T00:00:00.000Z',
          consecutiveFetchFailures: 0,
          openWatchdogIssueNumber: null,
          lastSeenItems: [
            {
              id: 'v1.0.0',
              uniqueKey: 'v1.0.0|claude-code-releases',
              source: 'claude-code-releases',
              firstSeen: '2026-04-27T00:00:00.000Z',
            },
          ],
        })
      );
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      expect(result.newCount).toBe(0);
      const out = await readOutputs(outputPath);
      expect(out.has_new).toBe('false');
      expect(out.new_count).toBe('0');
    });
  });

  describe('dedup correctness — the v2.9.2 bug fix', () => {
    it('treats two sources with the same id as DISTINCT items (composite-key dedup)', async () => {
      // The pre-2.9.2 code dedupes on `id` alone — so item B would be silently dropped
      // when item A with the same id had already been seen, even from a different source.
      // Composite-key dedup fixes this.
      const items = [
        makeItem('2.1.114', 'claude-code-releases'),
        makeItem('2.1.114', 'npm-claude-code'),
      ];
      // Pre-existing state has only the claude-code-releases instance.
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: '2026-04-27T00:00:00.000Z',
          consecutiveFetchFailures: 0,
          openWatchdogIssueNumber: null,
          lastSeenItems: [
            {
              id: '2.1.114',
              uniqueKey: '2.1.114|claude-code-releases',
              source: 'claude-code-releases',
              firstSeen: '2026-04-27T00:00:00.000Z',
            },
          ],
        })
      );
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      expect(result.newCount).toBe(1);
      const out = await readOutputs(outputPath);
      const newItems = JSON.parse(await fs.readFile(out.new_items_path, 'utf8'));
      expect(newItems).toHaveLength(1);
      expect(newItems[0].source).toBe('npm-claude-code');
    });

    it('falls back to ${id}|unknown for legacy state entries with only id', async () => {
      // Pre-2.9.2 state entries have only {id, firstSeen}. Read-side fallback
      // builds the seen key as `${id}|unknown`. New incoming items still build
      // proper composite keys and don't match — so legacy entries cause one
      // false re-evaluation per item, never a silent drop.
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: '2026-04-18T00:00:00.000Z',
          consecutiveFetchFailures: 0,
          openWatchdogIssueNumber: null,
          lastSeenItems: [{ id: 'v1.0.0', firstSeen: '2026-04-18T00:00:00.000Z' }],
        })
      );
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      // Item passes through (legacy entry seen-key was `v1.0.0|unknown`, new item is
      // `v1.0.0|claude-code-releases`). False-positive re-evaluation is the documented
      // day-one cost.
      expect(result.newCount).toBe(1);
    });

    it('seenKeyForStateEntry uses uniqueKey when present', () => {
      expect(seenKeyForStateEntry({ id: 'x', uniqueKey: 'x|src' })).toBe('x|src');
    });

    it('seenKeyForStateEntry falls back to id|source then id|unknown', () => {
      expect(seenKeyForStateEntry({ id: 'x', source: 'src' })).toBe('x|src');
      expect(seenKeyForStateEntry({ id: 'x' })).toBe('x|unknown');
    });
  });

  describe('typed-error handling', () => {
    it('FeedVersionMismatchError surfaces as feed_version_mismatch and bumps the counter', async () => {
      const fail = new FeedVersionMismatchError('2.0', '1.0');
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.failed).toBe(true);
      expect(result.errorTag.startsWith('feed_version_mismatch:got=2.0')).toBe(true);
      expect(result.consecutiveFailures).toBe(1);

      const out = await readOutputs(outputPath);
      expect(out.fetch_failure).toBe('true');
      expect(out.consecutive_failures).toBe('1');
      expect(out.fetch_error.startsWith('feed_version_mismatch:got=2.0')).toBe(true);

      const persistedState = JSON.parse(await fs.readFile(statePath, 'utf8'));
      expect(persistedState.consecutiveFetchFailures).toBe(1);
    });

    it('FeedFetchError (network) bumps the counter', async () => {
      const fail = new FeedFetchError('connect ECONNREFUSED', { url: 'http://x', status: null });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.failed).toBe(true);
      expect(result.errorTag.startsWith('feed_fetch:network:')).toBe(true);
      expect(result.consecutiveFailures).toBe(1);
    });

    it('FeedFetchError with HTTP status uses http_NNN tag', async () => {
      const fail = new FeedFetchError('not found', { url: 'http://x', status: 404 });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.errorTag.startsWith('feed_fetch:http_404:')).toBe(true);
    });

    it('FeedMalformedError bumps the counter', async () => {
      const fail = new FeedMalformedError('shape mismatch', {
        url: 'http://x',
        reason: 'missing items array',
      });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.failed).toBe(true);
      expect(result.errorTag.startsWith('feed_malformed:missing items array')).toBe(true);
    });

    it('classifyError returns null for unknown errors so they propagate', () => {
      expect(classifyError(new Error('totally unrelated'))).toBe(null);
    });

    it('non-array items returned by the client surfaces as feed_malformed:non_array_items', async () => {
      const evilClient = {
        async fetchAllItems() {
          return 'not an array';
        },
        async fetchRunReport() {
          return makeReport([]);
        },
      };
      const result = await runPrecheck({ client: evilClient, statePath });
      expect(result.failed).toBe(true);
      expect(result.errorTag).toBe('feed_malformed:non_array_items');
    });

    it('counter accumulates across consecutive failures', async () => {
      const fail = new FeedFetchError('boom', { url: 'http://x', status: null });
      await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.consecutiveFailures).toBe(3);
    });

    it('successful fetch resets consecutiveFetchFailures to 0', async () => {
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: null,
          consecutiveFetchFailures: 2,
          openWatchdogIssueNumber: null,
          lastSeenItems: [],
        })
      );
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const out = await readOutputs(outputPath);
      const nextState = JSON.parse(await fs.readFile(out.next_state_path, 'utf8'));
      expect(nextState.consecutiveFetchFailures).toBe(0);
    });
  });

  describe('state-file invariants', () => {
    it('refuses to load a state file with unsupported schema version', async () => {
      await fs.writeFile(statePath, JSON.stringify({ version: 99, lastSeenItems: [] }));
      await expect(
        runPrecheck({ client: makeFakeClient({ items: [] }), statePath })
      ).rejects.toThrow(/schema version 99 is not supported/);
    });

    it('prunes lastSeenItems older than 90 days on a successful run', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: '2026-04-27T00:00:00.000Z',
          consecutiveFetchFailures: 0,
          openWatchdogIssueNumber: null,
          lastSeenItems: [
            { id: 'old', uniqueKey: 'old|src', source: 'src', firstSeen: oldDate },
            { id: 'recent', uniqueKey: 'recent|src', source: 'src', firstSeen: recentDate },
          ],
        })
      );
      // Re-fetch the recent item so the next state retains it via the "kept existing" path.
      const items = [makeItem('recent', 'src')];
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      expect(result.nextState.lastSeenItems).toHaveLength(1);
      expect(result.nextState.lastSeenItems[0].id).toBe('recent');
    });

    it('preserves openWatchdogIssueNumber across a successful run', async () => {
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: '2026-04-27T00:00:00.000Z',
          consecutiveFetchFailures: 0,
          openWatchdogIssueNumber: 42,
          lastSeenItems: [],
        })
      );
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      expect(result.nextState.openWatchdogIssueNumber).toBe(42);
    });

    it('writes lastRun as a fresh ISO timestamp on success', async () => {
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      const before = Date.now();
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const after = Date.now();
      const lastRunMs = Date.parse(result.nextState.lastRun);
      expect(lastRunMs).toBeGreaterThanOrEqual(before);
      expect(lastRunMs).toBeLessThanOrEqual(after);
    });
  });

  describe('output contract for downstream workflow steps', () => {
    it('emits all required keys with stable names', async () => {
      const items = [makeItem('v1.0.0', 'claude-code-releases')];
      await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const out = await readOutputs(outputPath);
      // These keys are referenced by .github/workflows/upstream-check.yml — do not rename
      // without auditing every `steps.precheck.outputs.*` reference.
      const required = [
        'has_new',
        'new_count',
        'fetch_failure',
        'consecutive_failures',
        'fetch_error',
        'run_timestamp',
        'new_items_path',
        'feed_report_path',
        'next_state_path',
      ];
      for (const key of required) {
        expect(out, `missing output: ${key}`).toHaveProperty(key);
      }
    });
  });
});
