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
  const source =
    assistantText && assistantText.trim().length > 0 ? assistantText : transcript || '';

  const budget = MAX_RAW_BYTES - Buffer.byteLength(header, 'utf8');
  if (Buffer.byteLength(source, 'utf8') <= budget) {
    return header + source;
  }

  // Byte-aware truncation: slice by bytes, then drop any trailing partial
  // multibyte sequence so the result is valid UTF-8.
  const markerBytes = Buffer.byteLength(TRUNCATION_MARKER, 'utf8');
  const sliceBudget = budget - markerBytes;
  const buf = Buffer.from(source, 'utf8');
  const clipped = buf.subarray(0, sliceBudget).toString('utf8');
  return header + clipped + TRUNCATION_MARKER;
}

async function saveRaw(assistantText, transcript, reason) {
  const runnerTemp = await ensureRunnerTemp();
  const rawPath = path.join(runnerTemp, 'claude-raw.md');
  await writeFile(rawPath, buildRawBody(assistantText, transcript, reason));
  return rawPath;
}

async function reportParseError(reason, transcript, assistantText) {
  const rawPath = await saveRaw(assistantText, transcript, reason);
  await writeOutputs({
    skip: 'false',
    title: '',
    body_path: '',
    parse_error: reason,
    raw_path: rawPath,
  });
  console.error(`parse-error: ${reason}`);
}

function stripBomAndLeading(s) {
  return s.replace(/^\uFEFF/, '').replace(/^\s+/, '');
}

export async function runParse(execPath) {
  let raw;
  try {
    raw = await readFile(execPath, 'utf8');
  } catch (err) {
    await reportParseError(`execution file unreadable: ${err.message}`, '', '');
    return;
  }

  const extracted = extractAssistantText(raw);
  const response = extracted !== null && extracted.trim().length > 0 ? extracted : raw;

  const cleaned = stripBomAndLeading(response);
  const rawLines = cleaned.split(/\r?\n/);
  const contractIdx = rawLines.findIndex((l) => {
    const t = l.trim();
    return t === 'SKIP_ISSUE' || t.startsWith('# Title: ');
  });

  if (contractIdx === -1) {
    await reportParseError(
      'no contract line (SKIP_ISSUE or "# Title: ") found in response',
      raw,
      extracted
    );
    return;
  }

  const firstLine = rawLines[contractIdx].trim();

  if (firstLine === 'SKIP_ISSUE') {
    await writeOutputs({
      skip: 'true',
      title: '',
      body_path: '',
      parse_error: '',
      raw_path: '',
    });
    console.log('skip=true');
    return;
  }

  const title = firstLine.slice('# Title: '.length).trim();
  if (!title) {
    await reportParseError('empty title after "# Title: "', raw, extracted);
    return;
  }

  const bodyIdx = rawLines.findIndex((l, i) => i > contractIdx && l.trim() === '# Body');

  if (bodyIdx === -1) {
    await reportParseError('"# Body" marker missing after title', raw, extracted);
    return;
  }

  const body = rawLines
    .slice(bodyIdx + 1)
    .join('\n')
    .trimStart();

  const runnerTemp = await ensureRunnerTemp();
  const bodyPath = path.join(runnerTemp, 'issue-body.md');
  await writeFile(bodyPath, body);

  await writeOutputs({
    skip: 'false',
    title,
    body_path: bodyPath,
    parse_error: '',
    raw_path: '',
  });

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
      await writeOutputs({
        skip: 'false',
        title: '',
        body_path: '',
        parse_error: `parser crashed: ${err.message}`,
        raw_path: '',
      });
    } catch {
      // best-effort
    }
    process.exit(1);
  });
}
