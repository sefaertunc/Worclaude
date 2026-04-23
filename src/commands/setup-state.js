import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';
import {
  loadSetupState,
  saveSetupState,
  clearSetupState,
  isSetupStateStale,
} from '../core/setup-state.js';

function formatAge(updatedAtIso) {
  const ageMs = Date.now() - Date.parse(updatedAtIso);
  const minutes = Math.floor(ageMs / (60 * 1000));
  if (minutes < 90) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 48) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'}`;
}

async function runOrExit(fn, { errorPrefix = 'Error' } = {}) {
  try {
    await fn();
  } catch (err) {
    console.error(`${errorPrefix}: ${err.message}`);
    process.exitCode = 1;
  }
}

async function showSubcommand(projectRoot) {
  await runOrExit(async () => {
    const state = await loadSetupState(projectRoot);
    if (state === null) {
      console.log('no state');
      return;
    }
    console.log(JSON.stringify(state, null, 2));
  });
}

async function saveSubcommand(projectRoot, options) {
  const hasStdin = Boolean(options.stdin);
  const hasFromFile = Boolean(options.fromFile);

  if (hasStdin && hasFromFile) {
    console.error('Error: --stdin and --from-file are mutually exclusive');
    process.exitCode = 2;
    return;
  }
  if (!hasStdin && !hasFromFile) {
    console.error('Error: save requires --stdin or --from-file <path>');
    process.exitCode = 2;
    return;
  }

  let raw;
  if (hasFromFile) {
    const filePath = path.resolve(options.fromFile);
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      console.error(`Error reading ${filePath}: ${err.message}`);
      process.exitCode = 1;
      return;
    }
  } else {
    const inputStream = options.inputStream || process.stdin;
    try {
      raw = await text(inputStream);
    } catch (err) {
      console.error(`Error reading stdin: ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const source = hasFromFile ? options.fromFile : 'stdin';
    console.error(`Error: invalid JSON on ${source}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  await runOrExit(() => saveSetupState(projectRoot, parsed));
}

async function resetSubcommand(projectRoot) {
  await runOrExit(() => clearSetupState(projectRoot));
}

async function resumeInfoSubcommand(projectRoot) {
  await runOrExit(async () => {
    const state = await loadSetupState(projectRoot);
    if (state === null) {
      console.log('no state');
      return;
    }
    const age = formatAge(state.updatedAt);
    const staleness = isSetupStateStale(state) ? 'stale' : 'fresh';
    console.log(`state: ${state.currentState}, age: ${age}, staleness: ${staleness}`);
  });
}

const SUBCOMMANDS = new Set(['show', 'save', 'reset', 'resume-info']);

export async function setupStateCommand(subcommand, options = {}) {
  if (!SUBCOMMANDS.has(subcommand)) {
    console.error(
      `Error: unknown subcommand: ${subcommand} (expected one of show, save, reset, resume-info)`
    );
    process.exitCode = 2;
    return;
  }

  const projectRoot = path.resolve(options.path || process.cwd());

  switch (subcommand) {
    case 'show':
      return showSubcommand(projectRoot);
    case 'save':
      return saveSubcommand(projectRoot, options);
    case 'reset':
      return resetSubcommand(projectRoot);
    case 'resume-info':
      return resumeInfoSubcommand(projectRoot);
  }
}
