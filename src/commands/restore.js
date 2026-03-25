import path from 'node:path';
import inquirer from 'inquirer';
import ora from 'ora';
import { listBackups, restoreBackup } from '../core/backup.js';
import { fileExists, dirExists } from '../utils/file.js';
import { relativeTime } from '../utils/time.js';
import * as display from '../utils/display.js';

export async function restoreCommand() {
  const projectRoot = process.cwd();

  const backups = await listBackups(projectRoot);
  if (backups.length === 0) {
    display.info('No backups found. Run `worclaude backup` to create one.');
    return;
  }

  display.sectionHeader('AVAILABLE BACKUPS');
  display.newline();

  const choices = backups.map((b, i) => ({
    name: `${path.basename(b.path)} (${relativeTime(b.dateString)})`,
    value: i,
  }));
  choices.push(new inquirer.Separator());
  choices.push({ name: '← Cancel', value: '__cancel__' });

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Select backup to restore:',
      choices,
    },
  ]);

  if (selected === '__cancel__') {
    display.info('Restore cancelled.');
    return;
  }

  const backup = backups[selected];

  display.newline();
  display.warn('This will replace your current Claude setup with the backup.');
  display.dim('  Current files will be overwritten.');
  display.newline();

  const { confirm } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirm',
      message: 'Confirm restore?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: 1,
    },
  ]);

  if (!confirm) {
    display.info('Restore cancelled.');
    return;
  }

  const spinner = ora('Restoring...').start();
  try {
    await restoreBackup(projectRoot, backup.path);
    spinner.succeed('Restore complete!');
  } catch (err) {
    spinner.fail('Restore failed.');
    display.error(err.message);
    return;
  }

  display.newline();
  display.success(`Restored from ${path.basename(backup.path)}/`);
  display.newline();

  // Show what was restored
  const restored = [];
  if (await fileExists(path.join(projectRoot, 'CLAUDE.md'))) restored.push('CLAUDE.md');
  if (await dirExists(path.join(projectRoot, '.claude')))
    restored.push('.claude/ (full directory)');
  if (await fileExists(path.join(projectRoot, '.mcp.json'))) restored.push('.mcp.json');

  if (restored.length > 0) {
    display.info('Restored:');
    for (const item of restored) {
      display.dim(`  ${item}`);
    }
  }

  display.newline();
  display.info('Note: workflow-meta.json has been restored to its backup state.');
  display.dim('  Run `worclaude upgrade` if you want to update to the latest version.');
}
