import { requireWorkflowMeta, getPackageVersion } from '../core/config.js';
import { categorizeFiles } from '../core/file-categorizer.js';
import * as display from '../utils/display.js';

export async function diffCommand() {
  const projectRoot = process.cwd();

  const { meta, error } = await requireWorkflowMeta(projectRoot);
  if (error === 'not-installed') {
    display.info('Workflow is not installed. Run `worclaude init` to set up.');
    return;
  }
  if (error === 'corrupted') {
    display.error('workflow-meta.json is corrupted. Run `worclaude init` to reinstall.');
    return;
  }

  const categories = await categorizeFiles(projectRoot, meta);
  const cliVersion = await getPackageVersion();

  display.sectionHeader(`WORCLAUDE DIFF (v${meta.version} → v${cliVersion})`);
  display.newline();

  let hasChanges = false;

  if (categories.modified.length > 0) {
    hasChanges = true;
    display.barLine(`${display.yellow('~')} Modified (your changes):`);
    for (const { key } of categories.modified) {
      display.barLine(`  ${display.yellow(key)}`);
    }
    display.newline();
  }

  if (categories.deleted.length > 0) {
    hasChanges = true;
    display.barLine(`${display.red('-')} Deleted (removed since install):`);
    for (const { key } of categories.deleted) {
      display.barLine(`  ${display.red(key)}`);
    }
    display.newline();
  }

  if (categories.userAdded.length > 0) {
    hasChanges = true;
    display.barLine(`${display.green('+')} Extra (you added):`);
    for (const { key } of categories.userAdded) {
      display.barLine(`  ${display.green(key)}`);
    }
    display.newline();
  }

  if (categories.outdated.length > 0) {
    hasChanges = true;
    display.barLine(`${display.blue('↑')} Outdated (newer version available):`);
    for (const { key } of categories.outdated) {
      display.barLine(`  ${display.blue(key)}`);
    }
    display.newline();
  }

  display.barLine(
    `${display.dimColor('=')} Unchanged: ${display.dimColor(`${categories.unchanged.length} files`)}`
  );

  if (!hasChanges) {
    display.newline();
    display.success('No changes detected.');
  }

  if (categories.outdated.length > 0) {
    display.newline();
    display.barLine(`Run ${display.purple('worclaude upgrade')} to apply changes.`);
  }
}
