#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import * as display from './utils/display.js';

const program = new Command();

program
  .name('claude-workflow')
  .version('1.0.0')
  .description('Scaffold a comprehensive Claude Code workflow into any project');

program
  .command('init')
  .description('Initialize Claude workflow in the current project')
  .action(initCommand);

// Placeholder commands for later phases
const placeholders = ['upgrade', 'status', 'backup', 'restore', 'diff'];
for (const cmd of placeholders) {
  program
    .command(cmd)
    .description(`${cmd.charAt(0).toUpperCase() + cmd.slice(1)} workflow components`)
    .action(() => {
      display.info(`The "${cmd}" command is coming in Phase 4.`);
    });
}

program.parse();
