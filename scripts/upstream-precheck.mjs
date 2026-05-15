#!/usr/bin/env node
// Pre-check step for `.github/workflows/upstream-check.yml`. Fetches anthropic-watch
// feeds via the official client library, dedupes against the cached state file,
// and writes the slim new-items payload that downstream steps feed to Claude.
//
// State persistence: this script only reads/writes `.github/upstream-state.json`
// in place. Persistence between runs is handled by `actions/cache@v4` in the
// workflow — see docs/reference/upstream-automation.md.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AnthropicWatchClient,
  filterNew,
  uniqueKey,
  FeedVersionMismatchError,
  FeedFetchError,
  FeedMalformedError,
} from '@sefaertunc/anthropic-watch-client';
import { ensureRunnerTemp, requireRunnerTemp, writeOutputs } from './_gha-outputs.mjs';

export const FETCH_TIMEOUT_MS = 10_000;
export const SNIPPET_MAX = 500;
export const PRUNE_DAYS = 90;
export const MAX_NEW_ITEMS_DEFAULT = 40;

const DEFAULT_STATE_PATH = '.github/upstream-state.json';

// Tier ordering for prioritizing items when the per-run cap forces truncation.
// Lower number = higher priority. Mirrors `docs/reference/upstream-automation.md`
// "Critical sources" + the "engineering-blog cross-reference" carve-out. If those
// rules change, update both places (also the inlined prompt in upstream-check.yml).
const SOURCE_TIER = {
  'claude-code-releases': 1,
  'claude-code-changelog': 1,
  'npm-claude-code': 1,
  'agent-sdk-ts-changelog': 1,
  'agent-sdk-py-changelog': 1,
  'engineering-blog': 2,
};
const DEFAULT_TIER = 3;
const COMMUNITY_TIER = 4;

function tierFor(item) {
  if (item.sourceCategory === 'community') return COMMUNITY_TIER;
  return SOURCE_TIER[item.source] ?? DEFAULT_TIER;
}

export function prioritizeAndCap(items, max) {
  const sorted = [...items].sort((a, b) => {
    const ta = tierFor(a);
    const tb = tierFor(b);
    if (ta !== tb) return ta - tb;
    const da = Date.parse(a.date ?? '') || 0;
    const db = Date.parse(b.date ?? '') || 0;
    return db - da;
  });
  if (!Number.isFinite(max) || max <= 0 || sorted.length <= max) {
    return { kept: sorted, truncated: 0 };
  }
  return { kept: sorted.slice(0, max), truncated: sorted.length - max };
}

function resolveMaxNewItems() {
  const raw = process.env.MAX_NEW_ITEMS;
  if (raw === undefined || raw === '') return MAX_NEW_ITEMS_DEFAULT;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : MAX_NEW_ITEMS_DEFAULT;
}

// Prefixes for `fetch_error` GitHub-Actions output. Tests assert these via
// startsWith(); keep them in one place so producer + tests can't drift.
export const ERROR_TAGS = {
  VERSION_MISMATCH: 'feed_version_mismatch:got=',
  FETCH_NETWORK: 'feed_fetch:network:',
  FETCH_HTTP_PREFIX: 'feed_fetch:http_',
  MALFORMED_PREFIX: 'feed_malformed:',
  MALFORMED_NON_ARRAY_ITEMS: 'feed_malformed:non_array_items',
};

// Empty-shaped outputs used by the crash-path writer in `cli()` so downstream
// workflow gates always see parseable values, even when precheck throws.
const EMPTY_OUTPUTS = {
  has_new: 'false',
  new_count: '0',
  kept_count: '0',
  truncated_count: '0',
  fetch_failure: 'false',
  consecutive_failures: '0',
  fetch_error: '',
  run_timestamp: '',
  new_items_path: '',
  feed_report_path: '',
  next_state_path: '',
};

const DEFAULT_STATE = {
  version: 2,
  lastRun: null,
  consecutiveFetchFailures: 0,
  openWatchdogIssueNumber: null,
  lastSeenItems: [],
};

async function loadState(statePath) {
  let raw;
  try {
    raw = await readFile(statePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_STATE };
    throw err;
  }
  const parsed = JSON.parse(raw);
  if (parsed.version !== 2) {
    throw new Error(`state file schema version ${parsed.version} is not supported (expected 2)`);
  }
  return parsed;
}

function truncate(s, max) {
  if (typeof s !== 'string') return '';
  return s.length > max ? s.slice(0, max) : s;
}

export function seenKeyForStateEntry(entry) {
  // `uniqueKey` is the post-migration shape. `${id}|${source}` covers entries
  // written by older worclaude versions that recorded `source`. The literal
  // `unknown` source covers the original v2 schema (only `id` + `firstSeen`)
  // — those entries lose source-specificity but match by id, which is the
  // best the data supports. Self-heals after the 90-day prune.
  if (entry.uniqueKey) return entry.uniqueKey;
  return `${entry.id}|${entry.source ?? 'unknown'}`;
}

export function classifyError(err) {
  if (err instanceof FeedVersionMismatchError) {
    return `${ERROR_TAGS.VERSION_MISMATCH}${err.actualVersion ?? 'unknown'}`;
  }
  if (err instanceof FeedFetchError) {
    const message = truncate(err.message, 200).replace(/[\r\n]+/g, ' ');
    if (err.status === null || err.status === undefined) {
      return `${ERROR_TAGS.FETCH_NETWORK}${message}`;
    }
    return `${ERROR_TAGS.FETCH_HTTP_PREFIX}${err.status}:${message}`;
  }
  if (err instanceof FeedMalformedError) {
    return `${ERROR_TAGS.MALFORMED_PREFIX}${err.reason ?? 'unknown'}`;
  }
  return null;
}

async function handleFetchFailure(errorTag, state, statePath) {
  const nextFailures = (state.consecutiveFetchFailures || 0) + 1;
  const nextState = {
    ...state,
    version: 2,
    lastRun: new Date().toISOString(),
    consecutiveFetchFailures: nextFailures,
  };
  await writeFile(statePath, JSON.stringify(nextState, null, 2) + '\n');
  await writeOutputs({
    has_new: 'false',
    new_count: '0',
    kept_count: '0',
    truncated_count: '0',
    fetch_failure: 'true',
    consecutive_failures: String(nextFailures),
    fetch_error: errorTag,
    run_timestamp: '',
    new_items_path: '',
    feed_report_path: '',
    next_state_path: '',
  });
  console.log(`fetch failed (${nextFailures} consecutive): ${errorTag}. State bumped.`);
  return { failed: true, errorTag, consecutiveFailures: nextFailures };
}

export async function runPrecheck({ client, statePath } = {}) {
  const resolvedStatePath = statePath ?? process.env.STATE_PATH ?? DEFAULT_STATE_PATH;
  const resolvedClient = client ?? new AnthropicWatchClient({ timeout: FETCH_TIMEOUT_MS });

  const state = await loadState(resolvedStatePath);

  let runReport;
  let items;
  try {
    [runReport, items] = await Promise.all([
      resolvedClient.fetchRunReport(),
      resolvedClient.fetchAllItems(),
    ]);
  } catch (err) {
    const tag = classifyError(err);
    if (tag === null) throw err;
    return handleFetchFailure(tag, state, resolvedStatePath);
  }

  if (!Array.isArray(items)) {
    return handleFetchFailure(ERROR_TAGS.MALFORMED_NON_ARRAY_ITEMS, state, resolvedStatePath);
  }

  const seen = new Set(state.lastSeenItems.map(seenKeyForStateEntry));
  const newItems = filterNew(items, seen);
  const nowUtc = new Date().toISOString();

  const slimItems = newItems.map((i) => ({
    id: i.id,
    title: i.title,
    source: i.source,
    sourceCategory: i.sourceCategory,
    date: i.date,
    url: i.url,
    snippet: truncate(i.snippet, SNIPPET_MAX),
  }));

  const maxNewItems = resolveMaxNewItems();
  const { kept: cappedItems, truncated: truncatedCount } = prioritizeAndCap(slimItems, maxNewItems);

  const pruneCutoff = Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000;
  const keptExisting = state.lastSeenItems.filter((s) => {
    if (!s.firstSeen) return true;
    const t = Date.parse(s.firstSeen);
    return Number.isNaN(t) || t >= pruneCutoff;
  });
  const newEntries = newItems.map((i) => ({
    id: i.id,
    uniqueKey: uniqueKey(i),
    source: i.source,
    firstSeen: nowUtc,
  }));
  const lastSeenItems = [...keptExisting, ...newEntries];

  const nextState = {
    version: 2,
    lastRun: nowUtc,
    consecutiveFetchFailures: 0,
    openWatchdogIssueNumber: state.openWatchdogIssueNumber ?? null,
    lastSeenItems,
  };

  const runnerTemp = await ensureRunnerTemp();
  const newItemsPath = path.join(runnerTemp, 'new-items.json');
  const feedReportPath = path.join(runnerTemp, 'feed-report.json');
  const nextStatePath = path.join(runnerTemp, 'next-state.json');

  await Promise.all([
    writeFile(newItemsPath, JSON.stringify(cappedItems, null, 2)),
    writeFile(feedReportPath, JSON.stringify(runReport, null, 2)),
    writeFile(nextStatePath, JSON.stringify(nextState, null, 2) + '\n'),
  ]);

  const hasNew = newItems.length > 0;
  await writeOutputs({
    has_new: hasNew ? 'true' : 'false',
    new_count: String(newItems.length),
    kept_count: String(cappedItems.length),
    truncated_count: String(truncatedCount),
    fetch_failure: 'false',
    consecutive_failures: '0',
    fetch_error: '',
    run_timestamp: runReport?.timestamp ?? '',
    new_items_path: newItemsPath,
    feed_report_path: feedReportPath,
    next_state_path: nextStatePath,
  });

  const sourcesChecked = runReport?.summary?.sourcesChecked ?? '?';
  console.log(
    `fetched ${items.length} items from ${sourcesChecked} sources; ${newItems.length} new; surfacing ${cappedItems.length} (truncated ${truncatedCount}, max=${maxNewItems}); lastSeen pruned ${state.lastSeenItems.length - keptExisting.length} of ${state.lastSeenItems.length}`
  );

  return {
    failed: false,
    newCount: newItems.length,
    nextState,
    paths: { newItemsPath, feedReportPath, nextStatePath },
  };
}

async function cli() {
  requireRunnerTemp();
  await runPrecheck();
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  cli().catch(async (err) => {
    console.error('FATAL:', err.stack || err.message);
    try {
      await writeOutputs({
        ...EMPTY_OUTPUTS,
        fetch_failure: 'true',
        fetch_error: `precheck_crashed:${(err.message ?? 'unknown').replace(/[\r\n]+/g, ' ').slice(0, 300)}`,
      });
    } catch {
      // best-effort
    }
    process.exit(1);
  });
}
