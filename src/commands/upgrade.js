import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import { requireWorkflowMeta, writeWorkflowMeta, getPackageVersion } from '../core/config.js';
import { createBackup } from '../core/backup.js';
import { categorizeFiles, resolveKeyPath, resolveRefPath } from '../core/file-categorizer.js';
import { buildSettingsJson, mergeSettingsPermissionsAndHooks } from '../core/merger.js';
import { readTemplate, substituteVariables, updateGitignore } from '../core/scaffolder.js';
import { buildAgentsMdVariables } from '../core/variables.js';
import {
  hasClaudeMdMemoryGuidance,
  ensureLearningsDir,
  writeMemoryGuidanceSidecar,
  readClaudeMd,
} from '../core/drift-checks.js';
import { writeFile, readFile, fileExists } from '../utils/file.js';
import { hashFile } from '../utils/hash.js';
import { getLatestNpmVersion } from '../utils/npm.js';
import * as display from '../utils/display.js';
import {
  semverLessThan,
  semverGreaterThan,
  migrateSkillFormat,
  patchAgentDescriptions,
  migrateWorkflowRefLocation,
} from '../core/migration.js';
import { regenerateRoutingForProject } from './regenerate-routing.js';
import { availableOptionalFeatures } from '../data/optional-features.js';

const CONFLICT_CHECK_TYPES = new Set(['hook', 'root-file']);

function selfUpdate(latestVersion) {
  const spinner = ora(`Updating worclaude to v${latestVersion}...`).start();
  try {
    execSync('npm install -g worclaude@latest', { encoding: 'utf-8', stdio: 'pipe' });
    spinner.succeed(`worclaude updated to v${latestVersion}.`);
    return true;
  } catch (err) {
    spinner.fail('Self-update failed (permission denied).');
    const msg = String(err.message || err);
    if (msg.includes('EACCES') || msg.includes('permission denied') || msg.includes('EPERM')) {
      display.info('Try: sudo npm install -g worclaude@latest');
    } else {
      display.info('Try manually: npm install -g worclaude@latest');
    }
    return false;
  }
}

async function renderTemplate({ templatePath, type }, variables) {
  const templateContent = await readTemplate(templatePath);
  return type === 'root-file' ? substituteVariables(templateContent, variables) : templateContent;
}

async function writeTemplateToDest(entry, dest, variables) {
  await fs.ensureDir(path.dirname(dest));
  await writeFile(dest, await renderTemplate(entry, variables));
}

async function writeSidecarFor(entry, projectRoot, variables) {
  const sidecarPath = resolveRefPath(entry.key, projectRoot);
  await writeFile(sidecarPath, await renderTemplate(entry, variables));
  return sidecarPath;
}

async function diskContentMatchesTemplate(entry, dest, variables) {
  const currentContent = await readFile(dest);
  return currentContent === (await renderTemplate(entry, variables));
}

async function buildRepairPlan(projectRoot, categories, claudeMdContent) {
  const migrationNewFiles = categories.newFiles.filter((f) => CONFLICT_CHECK_TYPES.has(f.type));
  const templateNewFiles = categories.newFiles.filter((f) => !CONFLICT_CHECK_TYPES.has(f.type));
  const learningsGitkeep = path.join(projectRoot, '.claude', 'learnings', '.gitkeep');
  const learningsDirMissing = !(await fileExists(learningsGitkeep));
  const claudeMdNeedsSidecar =
    typeof claudeMdContent === 'string' && !hasClaudeMdMemoryGuidance(claudeMdContent);
  return {
    missingExpected: categories.missingExpected,
    migrationNewFiles,
    templateNewFiles,
    learningsDirMissing,
    claudeMdNeedsSidecar,
  };
}

function hasRepairWork(plan) {
  return (
    plan.missingExpected.length > 0 ||
    plan.migrationNewFiles.length > 0 ||
    plan.learningsDirMissing ||
    plan.claudeMdNeedsSidecar
  );
}

function hasTemplateWork(categories, plan) {
  return (
    categories.autoUpdate.length > 0 ||
    categories.conflict.length > 0 ||
    plan.templateNewFiles.length > 0
  );
}

function renderRepairPreview(plan) {
  if (plan.missingExpected.length > 0) {
    display.barLine(`${display.green('+')} Restore (missing from disk):`);
    for (const { key } of plan.missingExpected) {
      display.barLine(`  ${display.green('+')} ${key}`);
    }
    display.newline();
  }
  if (plan.migrationNewFiles.length > 0) {
    display.barLine(`${display.green('+')} Track & install (new file type in this CLI version):`);
    for (const { key } of plan.migrationNewFiles) {
      display.barLine(`  ${display.green('+')} ${key}`);
    }
    display.newline();
  }
  const sidecarLines = [];
  if (plan.learningsDirMissing) {
    sidecarLines.push('  ~ `.claude/learnings/` directory missing (will be created)');
  }
  if (plan.claudeMdNeedsSidecar) {
    sidecarLines.push(
      '  ~ CLAUDE.md memory guidance missing (will write .claude/workflow-ref/CLAUDE.md sidecar)'
    );
  }
  if (sidecarLines.length > 0) {
    display.barLine(`${display.yellow('~')} Also:`);
    for (const line of sidecarLines) {
      display.barLine(line);
    }
    display.newline();
  }
}

function renderTemplatePreview(categories, plan) {
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
  if (plan.templateNewFiles.length > 0) {
    display.barLine(`${display.green('+')} New in this version:`);
    for (const { key } of plan.templateNewFiles) {
      display.barLine(`  ${display.green('+')} ${key}`);
    }
    display.newline();
  }
  if (categories.missingUntracked.length > 0) {
    display.barLine(`${display.red('−')} Deleted (removed in current version):`);
    for (const { key } of categories.missingUntracked) {
      display.barLine(`  ${display.red('−')} ${key}`);
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
}

async function applyRepairPass(projectRoot, plan, variables) {
  const result = {
    restored: [],
    migrated: [],
    migrationConflicts: [],
    createdDirs: [],
    sidecars: [],
  };

  for (const entry of plan.missingExpected) {
    const dest = resolveKeyPath(entry.key, projectRoot);
    await writeTemplateToDest(entry, dest, variables);
    result.restored.push({ key: entry.key, dest });
  }

  for (const entry of plan.migrationNewFiles) {
    const dest = resolveKeyPath(entry.key, projectRoot);
    if (await fileExists(dest)) {
      const matches = await diskContentMatchesTemplate(entry, dest, variables);
      if (!matches) {
        const sidecarPath = await writeSidecarFor(entry, projectRoot, variables);
        result.migrationConflicts.push({ key: entry.key, dest, sidecarPath });
        continue;
      }
    }
    await writeTemplateToDest(entry, dest, variables);
    result.migrated.push({ key: entry.key, dest });
  }

  if (plan.learningsDirMissing) {
    const created = await ensureLearningsDir(projectRoot);
    if (created) {
      result.createdDirs.push(path.join(projectRoot, '.claude', 'learnings'));
    }
  }

  if (plan.claudeMdNeedsSidecar) {
    const sidecarPath = await writeMemoryGuidanceSidecar(projectRoot);
    result.sidecars.push(sidecarPath);
  }

  return result;
}

async function promptProceed(message) {
  const { proceed } = await inquirer.prompt([
    {
      type: 'list',
      name: 'proceed',
      message,
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    },
  ]);
  return proceed;
}

async function runRepairOnlyFlow({
  projectRoot,
  meta,
  plan,
  variables,
  dryRun,
  yes,
  refRelocationReport = { moved: 0, names: [], skipped: [] },
}) {
  display.sectionHeader(`WORCLAUDE REPAIR (v${meta.version})`);
  display.newline();
  display.barLine('Drift detected:');
  renderRepairPreview(plan);
  if (refRelocationReport.moved > 0) {
    display.barLine(
      `${display.green('→')} Relocated ${refRelocationReport.moved} legacy ref file(s) ${display.dimColor('→ .claude/workflow-ref/')}`
    );
    display.newline();
  }

  if (dryRun) {
    display.info('Dry run — no changes written.');
    return;
  }

  if (!yes) {
    const proceed = await promptProceed('Repair drifted files?');
    if (!proceed) {
      display.info('Repair cancelled.');
      return;
    }
  }

  const spinner = ora('Repairing...').start();
  try {
    const backupDir = await createBackup(projectRoot);
    spinner.text = 'Backup created, restoring files...';

    const result = await applyRepairPass(projectRoot, plan, variables);

    const fileHashes = { ...meta.fileHashes };
    for (const { key, dest } of [...result.restored, ...result.migrated]) {
      fileHashes[key] = await hashFile(dest);
    }

    meta.lastUpdated = new Date().toISOString();
    meta.fileHashes = fileHashes;
    await writeWorkflowMeta(projectRoot, meta);

    spinner.succeed('Repair complete.');

    display.newline();
    if (result.restored.length > 0) {
      display.barLine(`Restored:    ${result.restored.length} files`);
    }
    if (result.migrated.length > 0) {
      display.barLine(`Installed:   ${result.migrated.length} files`);
    }
    if (result.migrationConflicts.length > 0) {
      display.barLine(
        `Conflicts:   ${result.migrationConflicts.length} files ${display.dimColor('(saved under .claude/workflow-ref/)')}`
      );
    }
    if (result.createdDirs.length > 0) {
      display.barLine(`Created:     ${result.createdDirs.length} directories`);
    }
    if (result.sidecars.length > 0) {
      display.barLine(`Sidecar:     ${result.sidecars.length} suggestion files`);
    }
    if (refRelocationReport.moved > 0) {
      display.barLine(
        `Relocated:   ${refRelocationReport.moved} legacy ref file(s) ${display.dimColor('→ .claude/workflow-ref/')}`
      );
    }
    display.barLine(display.dimColor(`Backup: ${path.basename(backupDir)}/`));

    if (result.migrationConflicts.length > 0 || result.sidecars.length > 0) {
      display.newline();
      display.barLine(`Review files under .claude/workflow-ref/ and merge what's useful.`);
    }

    const features = await promptAndScaffoldOptionalFeatures(projectRoot, meta, { yes, dryRun });
    if (features.scaffolded.length + features.declined.length > 0) {
      await writeWorkflowMeta(projectRoot, meta);
    }
  } catch (err) {
    spinner.fail('Repair failed.');
    display.error(err.message);
  }
}

async function promptAndScaffoldOptionalFeatures(projectRoot, meta, { yes, dryRun }) {
  const empty = { scaffolded: [], declined: [] };
  if (yes || dryRun) return empty;

  const available = await availableOptionalFeatures(projectRoot, meta);
  if (available.length === 0) return empty;

  const upgradeSelections = {
    projectName: path.basename(projectRoot),
    selectedAgents: meta.optionalAgents || [],
  };

  display.newline();
  display.barLine('Optional features available:');

  const scaffolded = [];
  const declined = [];

  for (const feature of available) {
    const { accept } = await inquirer.prompt([
      {
        type: 'list',
        name: 'accept',
        message: feature.label,
        choices: [
          { name: 'Yes', value: true },
          { name: 'No, skip (will not ask again)', value: false },
        ],
      },
    ]);

    if (accept) {
      await feature.scaffold(projectRoot, upgradeSelections);
      scaffolded.push(feature.id);
      display.success(feature.successPath);
    } else {
      declined.push(feature.id);
    }
  }

  meta.optionalFeatures = [...new Set([...(meta.optionalFeatures || []), ...scaffolded])];
  meta.optedOutFeatures = [...new Set([...(meta.optedOutFeatures || []), ...declined])];

  return { scaffolded, declined };
}

export async function upgradeCommand(options = {}) {
  const { dryRun = false, yes = false, repairOnly = false } = options;
  const projectRoot = process.cwd();

  // 1. Check for CLI self-update from npm
  const cliVersion = await getPackageVersion();
  const latestVersion = await getLatestNpmVersion();

  if (latestVersion && latestVersion !== cliVersion) {
    display.newline();
    display.info(
      `New worclaude version available: ${display.dimColor(`v${cliVersion}`)} → ${display.green(`v${latestVersion}`)}`
    );
    const { doUpdate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'doUpdate',
        message: 'Update worclaude CLI?',
        choices: [
          { name: 'Yes, update and continue', value: true },
          { name: 'No, continue with current version', value: false },
        ],
      },
    ]);

    if (doUpdate) {
      const updated = await selfUpdate(latestVersion);
      if (updated) {
        display.info('Re-run `worclaude upgrade` to apply the new workflow files.');
        return;
      }
    }
  }

  // 2. Check prerequisite
  const { meta, error } = await requireWorkflowMeta(projectRoot);
  if (error === 'not-installed') {
    display.info('Workflow is not installed. Run `worclaude init` to set up.');
    return;
  }
  if (error === 'corrupted') {
    display.error('workflow-meta.json is corrupted. Run `worclaude init` to reinstall.');
    return;
  }

  // 3. Version + categorize
  const currentVersion = await getPackageVersion();
  const installedVersion = meta.version;
  const versionMatch = installedVersion === currentVersion;

  if (semverGreaterThan(installedVersion, currentVersion)) {
    display.error(
      `Refusing to downgrade: installed v${installedVersion} is newer than CLI v${currentVersion}.`
    );
    display.info('Upgrade the CLI with `npm install -g worclaude@latest`.');
    return;
  }

  // v2.5.1 migration: relocate legacy ref files. Runs before any early-exit
  // so version-match projects with leftover legacy siblings still self-heal.
  // Idempotent (skips already-migrated files).
  const refRelocationReport = await migrateWorkflowRefLocation(projectRoot);

  const categories = await categorizeFiles(projectRoot, meta);
  const claudeMdContent = await readClaudeMd(projectRoot);
  const plan = await buildRepairPlan(projectRoot, categories, claudeMdContent);

  const repairWork = hasRepairWork(plan);
  const templateWork = hasTemplateWork(categories, plan);
  const refWork = refRelocationReport.moved > 0;

  // Version match + no repair + no template work + no ref relocation → up to date.
  if (versionMatch && !repairWork && !templateWork && !refWork) {
    const features = await promptAndScaffoldOptionalFeatures(projectRoot, meta, { yes, dryRun });
    if (features.scaffolded.length + features.declined.length > 0) {
      meta.lastUpdated = new Date().toISOString();
      await writeWorkflowMeta(projectRoot, meta);
    }
    if (features.scaffolded.length === 0) {
      display.success(`Already up to date (v${currentVersion}).`);
    }
    return;
  }

  const variables = await buildAgentsMdVariables(meta, projectRoot);

  // Version match + repair only OR explicit --repair-only → repair-only flow
  if ((versionMatch && !templateWork) || repairOnly) {
    await runRepairOnlyFlow({
      projectRoot,
      meta,
      plan,
      variables,
      dryRun,
      yes,
      refRelocationReport,
    });
    return;
  }

  // Full upgrade flow (version mismatch)
  display.sectionHeader(`WORCLAUDE UPGRADE (v${installedVersion} → v${currentVersion})`);
  display.newline();
  display.barLine('Changes:');

  if (repairWork) {
    renderRepairPreview(plan);
  }
  renderTemplatePreview(categories, plan);

  if (!repairWork && !templateWork) {
    display.info('No file changes needed — only updating version metadata.');
    display.newline();
  }

  if (dryRun) {
    display.info('Dry run — no changes written.');
    return;
  }

  if (!yes) {
    const proceed = await promptProceed('Proceed with upgrade?');
    if (!proceed) {
      display.info('Upgrade cancelled.');
      return;
    }
  }

  const spinner = ora('Upgrading...').start();

  try {
    const backupDir = await createBackup(projectRoot);
    spinner.text = 'Backup created, applying updates...';

    // Repair pass (restoration + migration) runs first so hash-prune below
    // cannot drop entries we just rewrote.
    const repairResult = await applyRepairPass(projectRoot, plan, variables);

    // v2.0.0 migrations (version-gated)
    let skillReport = { migrated: 0, skipped: 0, names: [] };
    let agentReport = { autoPatched: 0, prompted: 0, declined: 0, skipped: [] };

    if (semverLessThan(installedVersion, '2.0.0')) {
      spinner.text = 'Running v2.0.0 migrations...';

      skillReport = await migrateSkillFormat(projectRoot, meta);

      spinner.stop();
      agentReport = await patchAgentDescriptions(projectRoot, meta, async (agentName) => {
        const { patch } = await inquirer.prompt([
          {
            type: 'list',
            name: 'patch',
            message: `Agent "${agentName}" has been customized. Add missing description field?`,
            choices: [
              { name: 'Yes', value: true },
              { name: 'No, skip', value: false },
            ],
          },
        ]);
        return patch;
      });
      spinner.start('Applying updates...');
    }

    // v2.5.1 migration already ran before the early-exit check (above).
    if (refRelocationReport.moved > 0) {
      spinner.text = `Relocated ${refRelocationReport.moved} legacy ref file(s)...`;
    }

    // Auto-update files
    for (const { key, templatePath } of categories.autoUpdate) {
      const content = await readTemplate(templatePath);
      await writeFile(resolveKeyPath(key, projectRoot), content);
    }

    // Conflict files: save under .claude/workflow-ref/ so they never collide
    // with Claude Code's command/agent discovery.
    for (const { key, templatePath } of categories.conflict) {
      const content = await readTemplate(templatePath);
      await writeFile(resolveRefPath(key, projectRoot), content);
    }

    // New files (non-migration types handled here; migration types were
    // processed in applyRepairPass with conflict safety)
    for (const entry of plan.templateNewFiles) {
      const content = await readTemplate(entry.templatePath);
      await writeFile(resolveKeyPath(entry.key, projectRoot), content);
    }

    // Settings.json merge: append new permissions and hooks
    const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
    if (await fileExists(settingsPath)) {
      const techStack = meta.techStack || [];
      const useDocker = meta.useDocker || false;
      const { settingsObject: workflowSettings } = await buildSettingsJson(techStack, useDocker);
      const settingsReport = { added: { permissions: 0, hooks: 0 }, hookConflicts: [] };
      await mergeSettingsPermissionsAndHooks(projectRoot, workflowSettings, settingsReport, {
        yes,
      });
      spinner.text = 'Settings merged...';
    }

    // Ensure sessions directory exists for session persistence
    await writeFile(path.join(projectRoot, '.claude', 'sessions', '.gitkeep'), '');

    // Ensure scratch directory exists for SHA-keyed transient artifacts (gitignored)
    await writeFile(path.join(projectRoot, '.claude', 'scratch', '.gitkeep'), '');

    // Ensure plans directory exists for active work guidance (tracked)
    await writeFile(path.join(projectRoot, '.claude', 'plans', '.gitkeep'), '');

    // Ensure observability directory exists for hook-captured event logs (gitignored)
    await writeFile(path.join(projectRoot, '.claude', 'observability', '.gitkeep'), '');

    // Hash refresh — files we just wrote (repair restored, repair migrated,
    // autoUpdate, templateNewFiles). Modified / conflict / unchanged /
    // userAdded / missingUntracked keep their prior hash; missingUntracked
    // keys are dropped below.
    const fileHashes = { ...meta.fileHashes };
    const rehashTargets = [
      ...repairResult.restored,
      ...repairResult.migrated,
      ...categories.autoUpdate.map(({ key }) => ({ key, dest: resolveKeyPath(key, projectRoot) })),
      ...plan.templateNewFiles.map(({ key }) => ({ key, dest: resolveKeyPath(key, projectRoot) })),
    ];
    for (const { key, dest } of rehashTargets) {
      fileHashes[key] = await hashFile(dest);
    }
    for (const { key } of categories.missingUntracked) {
      delete fileHashes[key];
    }

    await updateGitignore(projectRoot);

    try {
      const routingResult = await regenerateRoutingForProject(projectRoot);
      if (routingResult.regenerated) {
        const rel = path.relative(projectRoot, routingResult.skillPath);
        if (rel in fileHashes || (await fs.pathExists(routingResult.skillPath))) {
          fileHashes[rel] = await hashFile(routingResult.skillPath);
        }
      }
    } catch (err) {
      display.warn(`agent-routing regeneration skipped: ${err.message}`);
    }

    meta.version = currentVersion;
    meta.lastUpdated = new Date().toISOString();
    meta.fileHashes = fileHashes;
    await writeWorkflowMeta(projectRoot, meta);

    spinner.succeed(`Upgrade complete! (${installedVersion} → ${currentVersion})`);

    display.newline();
    if (repairResult.restored.length > 0) {
      display.barLine(`Restored:    ${repairResult.restored.length} files`);
    }
    if (repairResult.migrated.length > 0) {
      display.barLine(`Installed:   ${repairResult.migrated.length} files (migration)`);
    }
    if (repairResult.migrationConflicts.length > 0) {
      display.barLine(
        `Migration conflicts: ${repairResult.migrationConflicts.length} ${display.dimColor('(saved under .claude/workflow-ref/)')}`
      );
    }
    if (categories.autoUpdate.length > 0) {
      display.barLine(`Updated:     ${categories.autoUpdate.length} files`);
    }
    if (categories.conflict.length > 0) {
      display.barLine(
        `Conflicts:   ${categories.conflict.length} files ${display.dimColor('(saved under .claude/workflow-ref/)')}`
      );
    }
    if (refRelocationReport.moved > 0) {
      display.barLine(
        `Relocated:   ${refRelocationReport.moved} legacy ref file(s) ${display.dimColor('→ .claude/workflow-ref/')}`
      );
    }
    if (plan.templateNewFiles.length > 0) {
      display.barLine(`New:         ${plan.templateNewFiles.length} files added`);
    }
    display.barLine(`Unchanged:   ${categories.unchanged.length} files`);
    if (categories.modified.length > 0) {
      display.barLine(
        `Customized:  ${categories.modified.length} files ${display.dimColor('(no updates needed)')}`
      );
    }
    if (repairResult.sidecars.length > 0) {
      display.barLine(`Sidecar:     ${repairResult.sidecars.length} suggestion files`);
    }
    if (skillReport.migrated > 0) {
      display.barLine(`Migrated:    ${skillReport.migrated} skills to directory format`);
    }
    const patchedTotal = agentReport.autoPatched + agentReport.prompted;
    if (patchedTotal > 0) {
      const detail =
        agentReport.autoPatched > 0 && agentReport.prompted > 0
          ? ` (${agentReport.autoPatched} auto, ${agentReport.prompted} confirmed)`
          : '';
      display.barLine(`Patched:     ${patchedTotal} agents with description${detail}`);
    }
    if (agentReport.skipped.length > 0) {
      display.barLine(
        `Skipped:     ${agentReport.skipped.length} user-created agents ${display.dimColor(`(${agentReport.skipped.join(', ')})`)}`
      );
    }
    display.newline();
    display.barLine(display.dimColor(`Backup: ${path.basename(backupDir)}/`));

    if (
      categories.conflict.length > 0 ||
      repairResult.migrationConflicts.length > 0 ||
      repairResult.sidecars.length > 0
    ) {
      display.newline();
      display.barLine(`Review files under .claude/workflow-ref/ and merge what's useful.`);
    }

    const features = await promptAndScaffoldOptionalFeatures(projectRoot, meta, { yes, dryRun });
    if (features.scaffolded.length + features.declined.length > 0) {
      await writeWorkflowMeta(projectRoot, meta);
    }
  } catch (err) {
    spinner.fail('Upgrade failed.');
    display.error(err.message);
  }
}
