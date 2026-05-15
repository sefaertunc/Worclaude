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
  prioritizeAndCap,
  ERROR_TAGS,
  MAX_NEW_ITEMS_DEFAULT,
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
    delete process.env.MAX_NEW_ITEMS;
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
      expect(result.errorTag).toBe(`${ERROR_TAGS.VERSION_MISMATCH}2.0`);
      expect(result.consecutiveFailures).toBe(1);

      const out = await readOutputs(outputPath);
      expect(out.fetch_failure).toBe('true');
      expect(out.consecutive_failures).toBe('1');
      expect(out.fetch_error).toBe(`${ERROR_TAGS.VERSION_MISMATCH}2.0`);

      const persistedState = JSON.parse(await fs.readFile(statePath, 'utf8'));
      expect(persistedState.consecutiveFetchFailures).toBe(1);
    });

    it('FeedFetchError (network) bumps the counter', async () => {
      const fail = new FeedFetchError('connect ECONNREFUSED', { url: 'http://x', status: null });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.failed).toBe(true);
      expect(result.errorTag.startsWith(ERROR_TAGS.FETCH_NETWORK)).toBe(true);
      expect(result.consecutiveFailures).toBe(1);
    });

    it('FeedFetchError with HTTP status uses http_NNN tag', async () => {
      const fail = new FeedFetchError('not found', { url: 'http://x', status: 404 });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.errorTag.startsWith(`${ERROR_TAGS.FETCH_HTTP_PREFIX}404:`)).toBe(true);
    });

    it('FeedMalformedError bumps the counter', async () => {
      const fail = new FeedMalformedError('shape mismatch', {
        url: 'http://x',
        reason: 'missing items array',
      });
      const result = await runPrecheck({ client: makeFakeClient({ fail }), statePath });
      expect(result.failed).toBe(true);
      expect(result.errorTag).toBe(`${ERROR_TAGS.MALFORMED_PREFIX}missing items array`);
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
      expect(result.errorTag).toBe(ERROR_TAGS.MALFORMED_NON_ARRAY_ITEMS);
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
        'kept_count',
        'truncated_count',
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

  describe('prioritizeAndCap — tier-priority sort + item cap', () => {
    const t1 = (id) => makeItem(id, 'claude-code-releases', { sourceCategory: 'core' });
    const t1b = (id) => makeItem(id, 'agent-sdk-ts-changelog', { sourceCategory: 'core' });
    const t2 = (id) => makeItem(id, 'engineering-blog', { sourceCategory: 'core' });
    const t3 = (id) => makeItem(id, 'misc-source', { sourceCategory: 'extended' });
    const t4 = (id) => makeItem(id, 'reddit-claude', { sourceCategory: 'community' });

    it('sorts critical sources before engineering-blog before other before community', () => {
      const items = [t4('a'), t3('b'), t2('c'), t1('d'), t1b('e')];
      const { kept, truncated } = prioritizeAndCap(items, 100);
      expect(truncated).toBe(0);
      expect(kept.map((i) => i.source)).toEqual([
        'claude-code-releases',
        'agent-sdk-ts-changelog',
        'engineering-blog',
        'misc-source',
        'reddit-claude',
      ]);
    });

    it('breaks ties within a tier by date, newest first', () => {
      const items = [
        t1('old', { date: '2026-04-01T00:00:00.000Z' }),
        t1('new', { date: '2026-05-01T00:00:00.000Z' }),
        t1('mid', { date: '2026-04-15T00:00:00.000Z' }),
      ].map((i) => i); // makeItem already returns object; overrides via second arg above were a no-op
      // Rebuild with proper date overrides:
      const dated = [
        makeItem('old', 'claude-code-releases', { date: '2026-04-01T00:00:00.000Z' }),
        makeItem('new', 'claude-code-releases', { date: '2026-05-01T00:00:00.000Z' }),
        makeItem('mid', 'claude-code-releases', { date: '2026-04-15T00:00:00.000Z' }),
      ];
      const { kept } = prioritizeAndCap(dated, 100);
      expect(kept.map((i) => i.id)).toEqual(['new', 'mid', 'old']);
      // silence unused-var lint on the malformed helper-call array
      expect(items.length).toBe(3);
    });

    it('caps to max and reports truncation count', () => {
      const items = [t1('a'), t1b('b'), t2('c'), t3('d'), t4('e'), t4('f')];
      const { kept, truncated } = prioritizeAndCap(items, 3);
      expect(kept).toHaveLength(3);
      expect(truncated).toBe(3);
      // Cap keeps the highest-tier items; the dropped tail is the community pair.
      expect(kept.map((i) => i.source)).toEqual([
        'claude-code-releases',
        'agent-sdk-ts-changelog',
        'engineering-blog',
      ]);
    });

    it('returns the full list unchanged when items <= max', () => {
      const items = [t1('a'), t2('b')];
      const { kept, truncated } = prioritizeAndCap(items, 10);
      expect(kept).toHaveLength(2);
      expect(truncated).toBe(0);
    });

    it('treats non-positive or non-finite max as "no cap"', () => {
      const items = [t1('a'), t2('b'), t3('c')];
      expect(prioritizeAndCap(items, 0).kept).toHaveLength(3);
      expect(prioritizeAndCap(items, -5).kept).toHaveLength(3);
      expect(prioritizeAndCap(items, NaN).kept).toHaveLength(3);
    });

    it('does not mutate the input array', () => {
      const items = [t4('a'), t1('b')];
      const before = items.map((i) => i.id);
      prioritizeAndCap(items, 10);
      expect(items.map((i) => i.id)).toEqual(before);
    });

    it('exports a sensible MAX_NEW_ITEMS_DEFAULT', () => {
      expect(Number.isInteger(MAX_NEW_ITEMS_DEFAULT)).toBe(true);
      expect(MAX_NEW_ITEMS_DEFAULT).toBeGreaterThan(0);
    });
  });

  describe('runPrecheck wires cap + outputs into the pipeline', () => {
    it('writes the capped, priority-sorted slice to new-items.json', async () => {
      process.env.MAX_NEW_ITEMS = '2';
      const items = [
        makeItem('com', 'reddit-claude', { sourceCategory: 'community' }),
        makeItem('eng', 'engineering-blog', { sourceCategory: 'core' }),
        makeItem('rel', 'claude-code-releases', { sourceCategory: 'core' }),
      ];
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      expect(result.newCount).toBe(3);

      const out = await readOutputs(outputPath);
      expect(out.new_count).toBe('3');
      expect(out.kept_count).toBe('2');
      expect(out.truncated_count).toBe('1');

      const newItems = JSON.parse(await fs.readFile(out.new_items_path, 'utf8'));
      expect(newItems).toHaveLength(2);
      expect(newItems.map((i) => i.source)).toEqual(['claude-code-releases', 'engineering-blog']);
    });

    it('advances state for ALL new items even when truncated', async () => {
      // Truncated items are surfaced via the fallback issue (or implicitly dropped
      // by policy). Re-evaluating them tomorrow defeats the cap's purpose.
      process.env.MAX_NEW_ITEMS = '1';
      const items = [
        makeItem('com', 'reddit-claude', { sourceCategory: 'community' }),
        makeItem('rel', 'claude-code-releases', { sourceCategory: 'core' }),
      ];
      const result = await runPrecheck({ client: makeFakeClient({ items }), statePath });
      expect(result.nextState.lastSeenItems.map((i) => i.id).sort()).toEqual(['com', 'rel']);
    });

    it('emits kept_count == new_count when below the cap', async () => {
      const items = [makeItem('rel', 'claude-code-releases', { sourceCategory: 'core' })];
      await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const out = await readOutputs(outputPath);
      expect(out.new_count).toBe('1');
      expect(out.kept_count).toBe('1');
      expect(out.truncated_count).toBe('0');
    });

    it('reports zeroes for kept_count and truncated_count when no new items', async () => {
      await fs.writeFile(
        statePath,
        JSON.stringify({
          version: 2,
          lastRun: '2026-04-27T00:00:00.000Z',
          consecutiveFetchFailures: 0,
          openWatchdogIssueNumber: null,
          lastSeenItems: [
            {
              id: 'rel',
              uniqueKey: 'rel|claude-code-releases',
              source: 'claude-code-releases',
              firstSeen: '2026-04-27T00:00:00.000Z',
            },
          ],
        })
      );
      const items = [makeItem('rel', 'claude-code-releases', { sourceCategory: 'core' })];
      await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const out = await readOutputs(outputPath);
      expect(out.new_count).toBe('0');
      expect(out.kept_count).toBe('0');
      expect(out.truncated_count).toBe('0');
    });

    it('falls back to MAX_NEW_ITEMS_DEFAULT when env is unset or invalid', async () => {
      delete process.env.MAX_NEW_ITEMS;
      const items = Array.from({ length: 5 }, (_, i) =>
        makeItem(`x${i}`, 'claude-code-releases', { sourceCategory: 'core' })
      );
      await runPrecheck({ client: makeFakeClient({ items }), statePath });
      const out = await readOutputs(outputPath);
      // Default cap is much larger than 5 — nothing should be truncated.
      expect(out.kept_count).toBe('5');
      expect(out.truncated_count).toBe('0');
    });
  });
});
