import path from 'node:path';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  readWorkflowMeta,
  workflowMetaExists,
  writeWorkflowMeta,
  getPackageVersion,
} from '../core/config.js';
import { createBackup } from '../core/backup.js';
import { categorizeFiles } from '../core/file-categorizer.js';
import { buildSettingsJson, mergeSettingsPermissionsAndHooks } from '../core/merger.js';
import { readTemplate } from '../core/scaffolder.js';
import { hashFile } from '../utils/hash.js';
import { writeFile, fileExists, listFilesRecursive } from '../utils/file.js';
import * as display from '../utils/display.js';

export async function upgradeCommand() {
  const projectRoot = process.cwd();

  // 1. Check prerequisite
  if (!(await workflowMetaExists(projectRoot))) {
    display.error('No workflow installation found.');
    display.info('Run `worclaude init` to set up the workflow first.');
    return;
  }

  const meta = await readWorkflowMeta(projectRoot);
  if (!meta) {
    display.error('workflow-meta.json is corrupted or invalid.');
    display.info('Run `worclaude init` to reinstall (a backup will be created first).');
    return;
  }

  // 2. Version comparison
  const currentVersion = await getPackageVersion();
  const installedVersion = meta.version;

  if (installedVersion === currentVersion) {
    display.success(`Already up to date (v${currentVersion}).`);
    return;
  }

  // 3. Categorize files
  const categories = await categorizeFiles(projectRoot, meta);

  // 4. Preview
  display.sectionHeader(`WORCLAUDE UPGRADE (v${installedVersion} → v${currentVersion})`);
  display.newline();

  display.barLine('Changes:');

  if (categories.autoUpdate.length > 0) {
    display.barLine(`${display.green('✓')} Auto-update (unchanged since install):`);
    const showCount = Math.min(categories.autoUpdate.length, 3);
    for (let i = 0; i < showCount; i++) {
      display.barLine(`  ${display.green('✓')} ${categories.autoUpdate[i].key}`);
    }
    if (categories.autoUpdate.length > 3) {
      display.barLine(`  ${display.green('✓')} ${categories.autoUpdate.length - 3} more files`);
    }
    display.newline();
  }

  if (categories.conflict.length > 0) {
    display.barLine(`${display.yellow('~')} Needs review (you've customized these):`);
    for (const { key } of categories.conflict) {
      display.barLine(
        `  ${display.yellow('~')} ${key} ${display.dimColor('(modified since install)')}`
      );
    }
    display.newline();
  }

  if (categories.newFiles.length > 0) {
    display.barLine(`${display.green('+')} New in this version:`);
    for (const { key } of categories.newFiles) {
      display.barLine(`  ${display.green('+')} ${key}`);
    }
    display.newline();
  }

  if (categories.unchanged.length > 0) {
    display.barLine(
      `${display.dimColor('=')} Unchanged: ${display.dimColor(`${categories.unchanged.length} files`)}`
    );
    display.newline();
  }

  if (categories.modified.length > 0) {
    display.barLine(`${display.yellow('~')} Your customizations (no workflow updates available):`);
    for (const { key } of categories.modified) {
      display.barLine(`  ${display.yellow('~')} ${key}`);
    }
    display.newline();
  }

  const hasWork =
    categories.autoUpdate.length > 0 ||
    categories.conflict.length > 0 ||
    categories.newFiles.length > 0;

  if (!hasWork) {
    display.info('No file changes needed — only updating version metadata.');
    display.newline();
  }

  // 5. Confirm
  const { proceed } = await inquirer.prompt([
    {
      type: 'list',
      name: 'proceed',
      message: 'Proceed with upgrade?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    },
  ]);

  if (!proceed) {
    display.info('Upgrade cancelled.');
    return;
  }

  // 6. Execute
  const spinner = ora('Upgrading...').start();

  try {
    // Create backup first
    const backupDir = await createBackup(projectRoot);
    spinner.text = 'Backup created, applying updates...';

    // Auto-update files
    for (const { key, templatePath } of categories.autoUpdate) {
      const content = await readTemplate(templatePath);
      await writeFile(path.join(projectRoot, '.claude', ...key.split('/')), content);
    }

    // Conflict files: save as .workflow-ref.md
    for (const { key, templatePath } of categories.conflict) {
      const content = await readTemplate(templatePath);
      const refKey = key.replace(/\.md$/, '.workflow-ref.md');
      await writeFile(path.join(projectRoot, '.claude', ...refKey.split('/')), content);
    }

    // New files: add directly
    for (const { key, templatePath } of categories.newFiles) {
      const content = await readTemplate(templatePath);
      await writeFile(path.join(projectRoot, '.claude', ...key.split('/')), content);
    }

    // Settings.json merge: append new permissions and hooks
    const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
    if (await fileExists(settingsPath)) {
      const techStack = meta.techStack || [];
      const useDocker = meta.useDocker || false;
      const { settingsObject: workflowSettings } = await buildSettingsJson(techStack, useDocker);
      const settingsReport = { added: { permissions: 0, hooks: 0 }, hookConflicts: [] };
      await mergeSettingsPermissionsAndHooks(projectRoot, workflowSettings, settingsReport);
      spinner.text = 'Settings merged...';
    }

    // Recompute file hashes
    const fileHashes = {};
    const claudeDir = path.join(projectRoot, '.claude');
    const allFiles = await listFilesRecursive(claudeDir);
    for (const filePath of allFiles) {
      const relKey = path.relative(claudeDir, filePath).split(path.sep).join('/');
      if (relKey !== 'workflow-meta.json' && relKey !== 'settings.json') {
        fileHashes[relKey] = await hashFile(filePath);
      }
    }

    // Update meta
    meta.version = currentVersion;
    meta.lastUpdated = new Date().toISOString();
    meta.fileHashes = fileHashes;
    await writeWorkflowMeta(projectRoot, meta);

    spinner.succeed(`Upgrade complete! (${installedVersion} → ${currentVersion})`);

    // 7. Display report
    display.newline();
    if (categories.autoUpdate.length > 0) {
      display.barLine(`Updated:     ${categories.autoUpdate.length} files`);
    }
    if (categories.conflict.length > 0) {
      display.barLine(
        `Conflicts:   ${categories.conflict.length} files ${display.dimColor('(saved as .workflow-ref.md)')}`
      );
    }
    if (categories.newFiles.length > 0) {
      display.barLine(`New:         ${categories.newFiles.length} files added`);
    }
    display.barLine(`Unchanged:   ${categories.unchanged.length} files`);
    if (categories.modified.length > 0) {
      display.barLine(
        `Customized:  ${categories.modified.length} files ${display.dimColor('(no updates needed)')}`
      );
    }
    display.newline();
    display.barLine(display.dimColor(`Backup: ${path.basename(backupDir)}/`));

    if (categories.conflict.length > 0) {
      display.newline();
      display.barLine(`Review .workflow-ref.md files and merge what's useful.`);
    }
  } catch (err) {
    spinner.fail('Upgrade failed.');
    display.error(err.message);
  }
}
