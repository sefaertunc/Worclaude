import path from 'node:path';
import ora from 'ora';
import { createBackup } from '../core/backup.js';
import { fileExists, dirExists, listFiles } from '../utils/file.js';
import * as display from '../utils/display.js';

export async function backupCommand() {
  const projectRoot = process.cwd();

  const spinner = ora('Creating backup...').start();
  let backupDir;
  try {
    backupDir = await createBackup(projectRoot);
    spinner.succeed('Backup created!');
  } catch (err) {
    spinner.fail('Backup failed.');
    display.error(err.message);
    return;
  }

  display.newline();
  display.success(`Backup created!`);
  display.success(`${display.dimColor(path.basename(backupDir) + '/')}`);

  // Summarize contents
  const contents = [];

  if (await fileExists(path.join(backupDir, 'CLAUDE.md'))) {
    contents.push('CLAUDE.md');
  }

  const claudeBackup = path.join(backupDir, '.claude');
  if (await dirExists(claudeBackup)) {
    const agents = await listFiles(path.join(claudeBackup, 'agents'));
    const commands = await listFiles(path.join(claudeBackup, 'commands'));
    const skills = await listFiles(path.join(claudeBackup, 'skills'));
    const parts = [];
    if (agents.length > 0) parts.push(`${agents.length} agents`);
    if (commands.length > 0) parts.push(`${commands.length} commands`);
    if (skills.length > 0) parts.push(`${skills.length} skills`);
    contents.push(`.claude/ (${parts.join(', ')})`);
  }

  if (await fileExists(path.join(backupDir, '.mcp.json'))) {
    contents.push('.mcp.json');
  }

  if (contents.length > 0) {
    display.dim(`  ${contents.join(' · ')}`);
  }
}
