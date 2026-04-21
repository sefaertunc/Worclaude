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

program.parse();
