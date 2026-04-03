import path from 'node:path';
import inquirer from 'inquirer';
import ora from 'ora';
import { requireWorkflowMeta } from '../core/config.js';
import { createBackup } from '../core/backup.js';
import {
  classifyClaudeFiles,
  detectRootFiles,
  removeTrackedFiles,
  removeRootFiles,
  cleanGitignore,
} from '../core/remover.js';
import * as display from '../utils/display.js';

export async function deleteCommand() {
  const projectRoot = process.cwd();

  // Pre-flight: ensure worclaude is installed
  const { meta, error } = await requireWorkflowMeta(projectRoot);
  if (error === 'not-installed') {
    display.info('Workflow is not installed. Run `worclaude init` to set up.');
    return;
  }
  if (error === 'corrupted') {
    display.error('workflow-meta.json is corrupted. Run `worclaude init` to reinstall.');
    return;
  }

  display.sectionHeader('DELETE WORKFLOW');
  display.newline();

  // Step 1: Mode selection
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to do?',
      choices: [
        { name: 'Remove workflow from this project', value: 'project' },
        { name: 'Remove workflow and uninstall worclaude globally', value: 'global' },
        new inquirer.Separator(),
        { name: '← Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (mode === 'cancel') {
    display.info('Delete cancelled.');
    return;
  }

  // Step 2: Classify files
  const classification = await classifyClaudeFiles(projectRoot, meta);
  const rootFiles = await detectRootFiles(projectRoot);

  // Step 3: Show preview
  display.newline();
  display.barLine('Workflow files in .claude/:');
  if (classification.safeToDelete.length > 0) {
    display.barLine(
      `  ${display.green('✓')} ${classification.safeToDelete.length} unmodified files (safe to remove)`
    );
  }
  if (classification.modified.length > 0) {
    display.barLine(
      `  ${display.yellow('~')} ${classification.modified.length} files you've customized`
    );
    for (const key of classification.modified) {
      display.barLine(`      ${display.yellow('~')} .claude/${key}`);
    }
  }
  if (classification.userOwned.length > 0) {
    display.barLine(
      `  ${display.blue('●')} ${classification.userOwned.length} user-added files (will NOT be touched)`
    );
  }

  // Step 4: Handle modified files
  let filesToDelete = [...classification.safeToDelete];

  if (classification.modified.length > 0) {
    display.newline();
    const { modifiedAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'modifiedAction',
        message: `${classification.modified.length} file(s) have been customized. What should we do?`,
        choices: [
          { name: "Delete them too (they'll be in the backup)", value: 'delete' },
          { name: 'Keep them in .claude/', value: 'keep' },
        ],
      },
    ]);

    if (modifiedAction === 'delete') {
      filesToDelete.push(...classification.modified);
    }
  }

  // Step 5: Handle root-level files (settings.json + project root files)
  let rootFilesToDelete = [];

  if (rootFiles.length > 0) {
    display.newline();
    display.info('These files were created or modified by worclaude but may contain your work:');
    for (const f of rootFiles) {
      display.dim(`    ${f.label}`);
    }
    display.newline();

    const { rootAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'rootAction',
        message: 'What would you like to do with these files?',
        choices: [
          { name: 'Keep all (recommended)', value: 'keep' },
          { name: 'Let me choose which to remove', value: 'choose' },
          { name: 'Remove all', value: 'remove' },
        ],
        default: 0,
      },
    ]);

    if (rootAction === 'remove') {
      rootFilesToDelete = rootFiles.map((f) => f.path);
    } else if (rootAction === 'choose') {
      const { selected } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selected',
          message: 'Select files to remove:',
          choices: rootFiles.map((f) => ({ name: f.label, value: f.path })),
        },
      ]);
      rootFilesToDelete = selected;
    }
  }

  // Step 6: Final confirmation
  const totalDeletions = filesToDelete.length + rootFilesToDelete.length;

  if (totalDeletions === 0) {
    display.newline();
    display.info('No files selected for removal.');
    return;
  }

  display.newline();
  display.warn(`This will permanently delete ${totalDeletions} file(s).`);
  display.dim('  A backup will be created first.');
  display.newline();

  const { confirm } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirm',
      message: 'Confirm deletion?',
      choices: [
        { name: 'Yes, delete', value: true },
        { name: 'No, cancel', value: false },
      ],
      default: 1,
    },
  ]);

  if (!confirm) {
    display.info('Delete cancelled.');
    return;
  }

  // Step 7: Execute
  const spinner = ora('Creating backup...').start();

  try {
    const backupDir = await createBackup(projectRoot);
    spinner.text = 'Removing workflow files...';

    // Remove .claude/ tracked files
    const claudeRemoved = await removeTrackedFiles(projectRoot, filesToDelete);

    // Remove root files
    let rootRemoved = 0;
    if (rootFilesToDelete.length > 0) {
      rootRemoved = await removeRootFiles(projectRoot, rootFilesToDelete);
    }

    // Clean .gitignore
    const gitignoreCleaned = await cleanGitignore(projectRoot);

    spinner.succeed('Workflow removed!');

    // Step 8: Report
    display.newline();
    if (claudeRemoved > 0) {
      display.success(`Removed ${claudeRemoved} workflow files from .claude/`);
    }
    if (rootRemoved > 0) {
      display.success(`Removed ${rootRemoved} root-level file(s)`);
    }
    if (gitignoreCleaned) {
      display.success('Cleaned up .gitignore');
    }

    const keptModified = classification.modified.filter((f) => !filesToDelete.includes(f));
    if (keptModified.length > 0) {
      display.info(`Kept ${keptModified.length} customized file(s) in .claude/`);
    }
    if (classification.userOwned.length > 0) {
      display.info(`Kept ${classification.userOwned.length} user-added file(s) in .claude/`);
    }

    const keptRootFiles = rootFiles.filter((f) => !rootFilesToDelete.includes(f.path));
    if (keptRootFiles.length > 0) {
      display.info(`Kept: ${keptRootFiles.map((f) => f.label).join(', ')}`);
    }

    display.newline();
    display.dim(`  Backup: ${path.basename(backupDir)}/`);

    // Step 9: Global uninstall hint
    if (mode === 'global') {
      display.newline();
      display.info('To uninstall worclaude CLI globally, run:');
      display.dim('  npm uninstall -g worclaude');
    }
  } catch (err) {
    spinner.fail('Delete failed.');
    display.error(err.message);
  }
}
