#!/usr/bin/env node
// Zero-dep so the workflow runs without `npm ci`. See docs/reference/upstream-automation.md.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureRunnerTemp, requireRunnerTemp, writeOutputs } from './_gha-outputs.mjs';

requireRunnerTemp();

const execPath = process.argv[2];
if (!execPath) {
  console.error('FATAL: execution file path missing (argv[2])');
  process.exit(1);
}

function extractAssistantText(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let lastAssistantText = null;

  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    // Support both stream-json shapes: {type:'assistant', message:{content:[...]}}
    // (Claude Code stream) and {type:'assistant', content:[...]} (legacy).
    const isAssistant = event?.type === 'assistant' || event?.role === 'assistant';
    if (!isAssistant) continue;

    const content = event?.message?.content ?? event?.content;
    if (!content) continue;

    if (typeof content === 'string') {
      lastAssistantText = content;
      continue;
    }

    if (Array.isArray(content)) {
      const textBlocks = content
        .filter((b) => b?.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text);
      if (textBlocks.length > 0) {
        lastAssistantText = textBlocks.join('\n');
      }
    }
  }

  return lastAssistantText;
}

async function saveRaw(raw, reason) {
  const runnerTemp = await ensureRunnerTemp();
  const rawPath = path.join(runnerTemp, 'claude-raw.md');
  await writeFile(rawPath, `Parse error: ${reason}\n\n---\n\n${raw}`);
  return rawPath;
}

async function reportParseError(reason, raw) {
  const rawPath = await saveRaw(raw, reason);
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

async function main() {
  let raw;
  try {
    raw = await readFile(execPath, 'utf8');
  } catch (err) {
    await reportParseError(`execution file unreadable: ${err.message}`, '');
    return;
  }

  let response = extractAssistantText(raw);
  if (response === null || response.trim().length === 0) {
    response = raw;
  }

  const cleaned = stripBomAndLeading(response);
  const rawLines = cleaned.split(/\r?\n/);
  const contractIdx = rawLines.findIndex((l) => {
    const t = l.trim();
    return t === 'SKIP_ISSUE' || t.startsWith('# Title: ');
  });

  if (contractIdx === -1) {
    await reportParseError('no contract line (SKIP_ISSUE or "# Title: ") found in response', raw);
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
    await reportParseError('empty title after "# Title: "', raw);
    return;
  }

  const bodyIdx = rawLines.findIndex((l, i) => i > contractIdx && l.trim() === '# Body');

  if (bodyIdx === -1) {
    await reportParseError('"# Body" marker missing after title', raw);
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

main().catch(async (err) => {
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
