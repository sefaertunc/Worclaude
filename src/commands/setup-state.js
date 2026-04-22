import path from 'node:path';
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
  if (!options.stdin) {
    console.error('Error: save requires --stdin');
    process.exitCode = 2;
    return;
  }

  const inputStream = options.inputStream || process.stdin;
  let raw;
  try {
    raw = await text(inputStream);
  } catch (err) {
    console.error(`Error reading stdin: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Error: invalid JSON on stdin: ${err.message}`);
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
