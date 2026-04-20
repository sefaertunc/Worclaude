// Zero-dep helpers for GH Actions step outputs. Shared by sibling scripts/
// so they stay runnable with just `node scripts/<name>.mjs`.

import { appendFile, mkdir } from 'node:fs/promises';

export function requireRunnerTemp() {
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) {
    console.error('FATAL: RUNNER_TEMP is not set');
    process.exit(1);
  }
  return runnerTemp;
}

export async function ensureRunnerTemp() {
  const runnerTemp = requireRunnerTemp();
  await mkdir(runnerTemp, { recursive: true });
  return runnerTemp;
}

export async function writeOutputs(pairs) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(pairs)
    .map(([k, v]) => `${k}=${v ?? ''}`)
    .join('\n');
  await appendFile(outputPath, lines + '\n');
}
