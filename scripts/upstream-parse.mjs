#!/usr/bin/env node
// Zero-dep so the workflow runs without `npm ci`. See docs/reference/upstream-automation.md.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRunnerTemp, requireRunnerTemp, writeOutputs } from './_gha-outputs.mjs';

// GitHub's issue body limit is 65,536 chars. The parse-error fallback step
// feeds `claude-raw.md` straight to `gh issue create --body-file`, so we
// must stay under that. 60,000 bytes leaves headroom for the `Parse error:`
// header plus the `[truncated]` marker.
export const MAX_RAW_BYTES = 60_000;
const TRUNCATION_MARKER = '\n\n[truncated]';

// Parser contract emitted by the workflow prompt — see `.github/workflows/upstream-check.yml`.
const SKIP_MARKER = 'SKIP_ISSUE';
const TITLE_PREFIX = '# Title: ';
const BODY_MARKER = '# Body';

// All five outputs the downstream workflow steps expect. Spread as
// `{ ...EMPTY_OUTPUTS, ...overrides }` so each call reads as "emit a
// skip / an issue / an error" without burying the intent in defaults.
const EMPTY_OUTPUTS = {
  skip: 'false',
  title: '',
  body_path: '',
  parse_error: '',
  raw_path: '',
};

// `claude-code-action@v1.0.101` writes `$RUNNER_TEMP/claude-execution-output.json`
// as a pretty-printed JSON array: `JSON.stringify(messages, null, 2)`. Each
// element is an `SDKMessage` with a `type` discriminator (`system` / `user` /
// `assistant` / `result`). See
// https://github.com/anthropics/claude-code-action/blob/38ec876110f9fbf8b950c79f534430740c3ac009/base-action/src/run-claude-sdk.ts
// If `JSON.parse` fails or the root is not an array, we return null and let
// the caller treat the raw content as the response (plaintext fallback).
export function extractAssistantText(raw) {
  let events;
  try {
    events = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(events)) return null;

  let lastNonEmpty = null;

  for (const event of events) {
    const isAssistant = event?.type === 'assistant' || event?.role === 'assistant';
    if (!isAssistant) continue;

    const content = event?.message?.content ?? event?.content;
    if (!content) continue;

    if (typeof content === 'string') {
      if (content.trim().length > 0) lastNonEmpty = content;
      continue;
    }

    if (Array.isArray(content)) {
      // tool_use blocks are not assistant "text". Only text blocks count,
      // otherwise a tool_use-only turn would clobber the real final response.
      const text = content
        .filter((b) => b?.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n');
      if (text.trim().length > 0) lastNonEmpty = text;
    }
  }

  return lastNonEmpty;
}

export function buildRawBody(assistantText, transcript, reason) {
  const header = `Parse error: ${reason}\n\n---\n\n`;
  const source = assistantText?.trim() ? assistantText : transcript || '';
  const buf = Buffer.from(source, 'utf8');

  const budget = MAX_RAW_BYTES - Buffer.byteLength(header, 'utf8');
  if (buf.byteLength <= budget) {
    return header + source;
  }

  // Byte-aware truncation: slice by bytes, then drop any trailing partial
  // multibyte sequence so the result is valid UTF-8.
  const sliceBudget = budget - Buffer.byteLength(TRUNCATION_MARKER, 'utf8');
  return header + buf.subarray(0, sliceBudget).toString('utf8') + TRUNCATION_MARKER;
}

async function saveRaw(assistantText, transcript, reason) {
  const runnerTemp = await ensureRunnerTemp();
  const rawPath = path.join(runnerTemp, 'claude-raw.md');
  await writeFile(rawPath, buildRawBody(assistantText, transcript, reason));
  return rawPath;
}

async function reportParseError(reason, transcript = '', assistantText = '') {
  const rawPath = await saveRaw(assistantText, transcript, reason);
  await writeOutputs({ ...EMPTY_OUTPUTS, parse_error: reason, raw_path: rawPath });
  console.error(`parse-error: ${reason}`);
}

export async function runParse(execPath) {
  let raw;
  try {
    raw = await readFile(execPath, 'utf8');
  } catch (err) {
    await reportParseError(`execution file unreadable: ${err.message}`);
    return;
  }

  const extracted = extractAssistantText(raw);
  const response = extracted?.trim() ? extracted : raw;

  const rawLines = response.split(/\r?\n/);
  const contractIdx = rawLines.findIndex((l) => {
    const t = l.trim();
    return t === SKIP_MARKER || t.startsWith(TITLE_PREFIX);
  });

  if (contractIdx === -1) {
    await reportParseError(
      `no contract line (${SKIP_MARKER} or "${TITLE_PREFIX}") found in response`,
      raw,
      extracted
    );
    return;
  }

  const firstLine = rawLines[contractIdx].trim();

  if (firstLine === SKIP_MARKER) {
    await writeOutputs({ ...EMPTY_OUTPUTS, skip: 'true' });
    console.log('skip=true');
    return;
  }

  // firstLine.startsWith(TITLE_PREFIX) was the match predicate above, with the
  // trailing space — so a title of just whitespace can never reach here: the
  // per-line trim would have shrunk the line to '# Title:', failing startsWith.
  const title = firstLine.slice(TITLE_PREFIX.length).trim();

  const bodyIdx = rawLines.findIndex((l, i) => i > contractIdx && l.trim() === BODY_MARKER);

  if (bodyIdx === -1) {
    await reportParseError(`"${BODY_MARKER}" marker missing after title`, raw, extracted);
    return;
  }

  const body = rawLines
    .slice(bodyIdx + 1)
    .join('\n')
    .trimStart();

  const runnerTemp = await ensureRunnerTemp();
  const bodyPath = path.join(runnerTemp, 'issue-body.md');
  await writeFile(bodyPath, body);

  await writeOutputs({ ...EMPTY_OUTPUTS, title, body_path: bodyPath });

  console.log(`parsed: title="${title}" body_path=${bodyPath}`);
}

async function cli() {
  requireRunnerTemp();
  const execPath = process.argv[2];
  if (!execPath) {
    console.error('FATAL: execution file path missing (argv[2])');
    process.exit(1);
  }
  await runParse(execPath);
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  cli().catch(async (err) => {
    console.error('FATAL:', err.stack || err.message);
    try {
      await writeOutputs({ ...EMPTY_OUTPUTS, parse_error: `parser crashed: ${err.message}` });
    } catch {
      // best-effort
    }
    process.exit(1);
  });
}
