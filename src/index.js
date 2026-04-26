#!/usr/bin/env node

import { Command } from 'commander';
import { getPackageVersionSync } from './core/config.js';
import { initCommand } from './commands/init.js';
import { upgradeCommand } from './commands/upgrade.js';
import { statusCommand } from './commands/status.js';
import { backupCommand } from './commands/backup.js';
import { restoreCommand } from './commands/restore.js';
import { diffCommand } from './commands/diff.js';
import { deleteCommand } from './commands/delete.js';
import { doctorCommand } from './commands/doctor.js';
import { scanCommand } from './commands/scan.js';
import { setupStateCommand } from './commands/setup-state.js';
import { worktreesCleanCommand } from './commands/worktrees.js';

const program = new Command();

program
  .name('worclaude')
  .version(getPackageVersionSync())
  .description('Scaffold a comprehensive Claude Code workflow into any project');

program.showSuggestionAfterError(true);
program.showHelpAfterError(true);

program
  .command('init')
  .description('Initialize Claude workflow in the current project')
  .action(initCommand);

program
  .command('upgrade')
  .description('Update workflow components to the latest version')
  .option('--dry-run', 'Preview changes without writing')
  .option('--yes', 'Skip confirmation prompts')
  .option('--repair-only', 'Restore missing files without applying template updates')
  .action((options) => upgradeCommand(options));

program
  .command('status')
  .description('Show current workflow installation status')
  .action(statusCommand);

program
  .command('backup')
  .description('Create a backup of current Claude setup')
  .action(backupCommand);

program.command('restore').description('Restore Claude setup from a backup').action(restoreCommand);

program
  .command('diff')
  .description('Compare current setup against installed workflow version')
  .action(diffCommand);

program
  .command('delete')
  .description('Remove worclaude workflow from project')
  .action(deleteCommand);

program
  .command('doctor')
  .description('Validate workflow installation health')
  .option('--json', 'Output results as JSON')
  .action((options) => doctorCommand(options));

program
  .command('scan')
  .description('Scan project for detectable facts (writes .claude/cache/detection-report.json)')
  .option('--path <dir>', 'Project root to scan', process.cwd())
  .option('--json', 'Print the detection report as JSON to stdout')
  .option('--quiet', 'Suppress human-readable summary (still writes the report file)')
  .action((options) => scanCommand(options));

const setupState = program
  .command('setup-state')
  .description('Inspect or mutate the /setup state file (.claude/cache/setup-state.json)');

setupState
  .command('show')
  .description('Print the state file as JSON, or "no state" if absent')
  .option('--path <dir>', 'Project root', process.cwd())
  .action((options) => setupStateCommand('show', options));

setupState
  .command('save')
  .description('Read a JSON state from stdin or a file, validate, and persist')
  .option('--stdin', 'Read JSON from stdin')
  .option('--from-file <path>', 'Read JSON from a file path')
  .option('--path <dir>', 'Project root', process.cwd())
  .action((options) => setupStateCommand('save', options));

setupState
  .command('reset')
  .description('Delete the state file (idempotent)')
  .option('--path <dir>', 'Project root', process.cwd())
  .action((options) => setupStateCommand('reset', options));

setupState
  .command('resume-info')
  .description('Print state/age/staleness summary, or "no state" if absent')
  .option('--path <dir>', 'Project root', process.cwd())
  .action((options) => setupStateCommand('resume-info', options));

// Catch unknown setup-state subcommands with the spec-matching exit code 2.
// Commander's default would exit 1, but setup-state's own arg-error contract
// (see src/commands/setup-state.js) is exit 2 for bad inputs.
setupState.on('command:*', (operands) => {
  console.error(
    `Error: unknown setup-state subcommand: ${operands[0]} (expected one of show, save, reset, resume-info)`
  );
  process.exitCode = 2;
});

const worktrees = program.command('worktrees').description('Manage agent worktrees');

worktrees
  .command('clean')
  .description('Force-remove locked agent worktrees under .claude/worktrees/')
  .option('--path <dir>', 'Project root', process.cwd())
  .action((options) => worktreesCleanCommand(options));

worktrees.on('command:*', (operands) => {
  console.error(`Error: unknown worktrees subcommand: ${operands[0]} (expected one of clean)`);
  process.exitCode = 2;
});

program.parse();
