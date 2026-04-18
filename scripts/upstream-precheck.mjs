#!/usr/bin/env node
// Zero-dep so the workflow runs without `npm ci`. See docs/reference/upstream-automation.md.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ensureRunnerTemp, writeOutputs } from './_gha-outputs.mjs';

const FEED_BASE = 'https://sefaertunc.github.io/anthropic-watch/feeds';
const FETCH_TIMEOUT_MS = 10_000;
const SNIPPET_MAX = 500;
const PRUNE_DAYS = 90;

const STATE_PATH = process.env.STATE_PATH || '.github/upstream-state.json';

const DEFAULT_STATE = {
  version: 2,
  lastRun: null,
  consecutiveFetchFailures: 0,
  openWatchdogIssueNumber: null,
  lastSeenItems: [],
};

async function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { ...DEFAULT_STATE };
  }
  const raw = await readFile(STATE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (parsed.version !== 2) {
    throw new Error(`state file schema version ${parsed.version} is not supported (expected 2)`);
  }
  return parsed;
}

async function fetchJson(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!resp.ok) {
    throw new Error(`fetch ${url} failed: HTTP ${resp.status}`);
  }
  return await resp.json();
}

function truncate(s, max) {
  if (typeof s !== 'string') return '';
  return s.length > max ? s.slice(0, max) : s;
}

async function handleFetchFailure(error, state) {
  const nextFailures = (state.consecutiveFetchFailures || 0) + 1;
  const nextState = {
    ...state,
    version: 2,
    lastRun: new Date().toISOString(),
    consecutiveFetchFailures: nextFailures,
  };
  await writeFile(STATE_PATH, JSON.stringify(nextState, null, 2) + '\n');
  await writeOutputs({
    has_new: 'false',
    new_count: '0',
    fetch_failure: 'true',
    consecutive_failures: String(nextFailures),
    fetch_error: error.message.replace(/[\r\n]+/g, ' ').slice(0, 500),
    run_timestamp: '',
    new_items_path: '',
    feed_report_path: '',
    next_state_path: '',
  });
  console.log(
    `fetch failed (${nextFailures} consecutive): ${error.message}. State bumped, exiting 0.`
  );
  process.exit(0);
}

async function main() {
  const state = await loadState();

  let runReport;
  let all;
  try {
    [runReport, all] = await Promise.all([
      fetchJson(`${FEED_BASE}/run-report.json`),
      fetchJson(`${FEED_BASE}/all.json`),
    ]);
  } catch (err) {
    await handleFetchFailure(err, state);
    return;
  }

  if (!Array.isArray(all?.items)) {
    await handleFetchFailure(new Error('all.json has no items array'), state);
    return;
  }

  const seen = new Set(state.lastSeenItems.map((s) => s.id));
  const newItems = all.items.filter((i) => !seen.has(i.id));
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
  const newEntries = newItems.map((i) => ({ id: i.id, firstSeen: nowUtc }));
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

  console.log(
    `fetched ${all.items.length} items; ${newItems.length} new; lastSeen pruned ${state.lastSeenItems.length - keptExisting.length} of ${state.lastSeenItems.length}`
  );
}

main().catch((err) => {
  console.error('FATAL:', err.stack || err.message);
  process.exit(1);
});
