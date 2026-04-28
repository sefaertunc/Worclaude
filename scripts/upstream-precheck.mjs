#!/usr/bin/env node
// Pre-check step for `.github/workflows/upstream-check.yml`. Fetches anthropic-watch
// feeds via the official client library, dedupes against the cached state file,
// and writes the slim new-items payload that downstream steps feed to Claude.
//
// State persistence: this script only reads/writes `.github/upstream-state.json`
// in place. Persistence between runs is handled by `actions/cache@v4` in the
// workflow — see docs/reference/upstream-automation.md.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
import { ensureRunnerTemp, writeOutputs } from './_gha-outputs.mjs';

export const FETCH_TIMEOUT_MS = 10_000;
export const SNIPPET_MAX = 500;
export const PRUNE_DAYS = 90;

const DEFAULT_STATE_PATH = '.github/upstream-state.json';

const DEFAULT_STATE = {
  version: 2,
  lastRun: null,
  consecutiveFetchFailures: 0,
  openWatchdogIssueNumber: null,
  lastSeenItems: [],
};

async function loadState(statePath) {
  if (!existsSync(statePath)) {
    return { ...DEFAULT_STATE };
  }
  const raw = await readFile(statePath, 'utf8');
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
    return `feed_version_mismatch:got=${err.actualVersion ?? 'unknown'}`;
  }
  if (err instanceof FeedFetchError) {
    const status =
      err.status === null || err.status === undefined ? 'network' : `http_${err.status}`;
    return `feed_fetch:${status}:${truncate(err.message, 200).replace(/[\r\n]+/g, ' ')}`;
  }
  if (err instanceof FeedMalformedError) {
    return `feed_malformed:${err.reason ?? 'unknown'}`;
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
    return handleFetchFailure('feed_malformed:non_array_items', state, resolvedStatePath);
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

  await writeFile(newItemsPath, JSON.stringify(slimItems, null, 2));
  await writeFile(feedReportPath, JSON.stringify(runReport, null, 2));
  await writeFile(nextStatePath, JSON.stringify(nextState, null, 2) + '\n');

  const hasNew = newItems.length > 0;
  await writeOutputs({
    has_new: hasNew ? 'true' : 'false',
    new_count: String(newItems.length),
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
    `fetched ${items.length} items from ${sourcesChecked} sources; ${newItems.length} new; lastSeen pruned ${state.lastSeenItems.length - keptExisting.length} of ${state.lastSeenItems.length}`
  );

  return {
    failed: false,
    newCount: newItems.length,
    nextState,
    paths: { newItemsPath, feedReportPath, nextStatePath },
  };
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runPrecheck().catch((err) => {
    console.error('FATAL:', err.stack || err.message);
    process.exit(1);
  });
}
