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
  .action(upgradeCommand);

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
  .action(doctorCommand);

program.parse();
