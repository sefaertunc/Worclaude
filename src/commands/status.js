import path from 'node:path';
import { requireWorkflowMeta, getPackageVersion } from '../core/config.js';
import { hashFile } from '../utils/hash.js';
import { fileExists, readFile, listFilesRecursive } from '../utils/file.js';
import { getLatestNpmVersion } from '../utils/npm.js';
import { isWorkflowRefFile } from '../core/file-categorizer.js';
import { TECH_STACKS } from '../data/agents.js';
import * as display from '../utils/display.js';

const TECH_DISPLAY_NAMES = Object.fromEntries(TECH_STACKS.map((t) => [t.value, t.name]));

function countByPrefix(fileHashes, prefix) {
  return Object.keys(fileHashes).filter((k) => k.startsWith(prefix)).length;
}

export async function statusCommand() {
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

  display.sectionHeader('WORCLAUDE STATUS');

  // Version
  const cliVersion = await getPackageVersion();
  const latestVersion = getLatestNpmVersion();

  let versionSuffix = '';
  if (meta.version !== cliVersion) {
    versionSuffix = ` ${display.yellow(`(upgrade available: v${cliVersion})`)}`;
  } else if (latestVersion && latestVersion !== cliVersion) {
    versionSuffix = ` ${display.yellow(`(CLI update available: v${latestVersion})`)}`;
  } else if (latestVersion) {
    versionSuffix = ` ${display.dimColor('(up to date)')}`;
  }

  display.barLine(`${'Version'.padEnd(11)}${display.green(`v${meta.version}`)}${versionSuffix}`);

  // Project info
  const projectTypes = meta.projectTypes || [];
  if (projectTypes.length > 0) {
    display.barLine(`${'Project'.padEnd(11)}${display.white(projectTypes.join(', '))}`);
    display.barLine(
      `${'Type'.padEnd(11)}${display.renderBadgeList(projectTypes, display.TYPE_BADGES)}`
    );
  }

  const techNames = (meta.techStack || []).map((t) => TECH_DISPLAY_NAMES[t] || t);
  if (techNames.length > 0) {
    display.barLine(
      `${'Stack'.padEnd(11)}${display.renderBadgeList(techNames, display.STACK_BADGES)}`
    );
  }

  // Agents
  const universalCount = (meta.universalAgents || []).length;
  const optionalCount = (meta.optionalAgents || []).length;
  display.barLine(
    `${'Agents'.padEnd(11)}${display.white(`${universalCount} universal + ${optionalCount} optional`)}`
  );

  // Commands and skills counts
  const commandCount = countByPrefix(meta.fileHashes || {}, 'commands/');
  const skillCount = countByPrefix(meta.fileHashes || {}, 'skills/');
  display.barLine(`${'Commands'.padEnd(11)}${display.white(String(commandCount))}`);
  display.barLine(`${'Skills'.padEnd(11)}${display.white(String(skillCount))}`);
  display.newline();

  // Installation rationale (T3.6) — recorded at init time. Older installs
  // pre-dating this field gracefully degrade: nothing surfaces.
  if (meta.installation && meta.installation.rationale) {
    display.info('Installation rationale:');
    display.dim(`    ${meta.installation.rationale}`);
    if (
      Array.isArray(meta.installation.selectedCategories) &&
      meta.installation.selectedCategories.length > 0
    ) {
      display.dim(`    Categories: ${meta.installation.selectedCategories.join(', ')}`);
    }
    display.newline();
  }

  // Customized files
  const customized = [];
  for (const [key, storedHash] of Object.entries(meta.fileHashes || {})) {
    const filePath = path.join(projectRoot, '.claude', ...key.split('/'));
    if (await fileExists(filePath)) {
      const currentHash = await hashFile(filePath);
      if (currentHash !== storedHash) {
        customized.push(`.claude/${key}`);
      }
    }
  }

  // Check CLAUDE.md separately
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (await fileExists(claudeMdPath)) {
    // CLAUDE.md is always considered potentially customized
    customized.push('CLAUDE.md');
  }

  if (customized.length > 0) {
    display.info('Customized files (differ from installed version):');
    for (const f of customized) {
      display.dim(`    ~ ${f}`);
    }
    display.newline();
  }

  // Pending review files — anything isWorkflowRefFile() recognizes. That
  // covers the v2.5.1+ .claude/workflow-ref/ tree plus legacy .workflow-ref.md
  // siblings, so users mid-migration still see what they need to resolve.
  const pendingReview = [];
  try {
    const claudeDir = path.join(projectRoot, '.claude');
    const allFiles = await listFilesRecursive(claudeDir);
    for (const fp of allFiles) {
      if (!isWorkflowRefFile(fp, claudeDir)) continue;
      const rel = path.relative(claudeDir, fp).split(path.sep).join('/');
      pendingReview.push(`.claude/${rel}`);
    }
  } catch {
    // .claude dir might not exist
  }

  const suggestionsPath = path.join(projectRoot, 'CLAUDE.md.workflow-suggestions');
  if (await fileExists(suggestionsPath)) {
    pendingReview.push('CLAUDE.md.workflow-suggestions');
  }

  if (pendingReview.length > 0) {
    display.warn('Pending review:');
    for (const f of pendingReview) {
      display.dim(`    ⚠ ${f}`);
    }
    display.newline();
  }

  // Settings info
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  if (await fileExists(settingsPath)) {
    try {
      const raw = await readFile(settingsPath);
      const settings = JSON.parse(raw);

      const allow = settings.permissions?.allow || [];
      const permCount = allow.filter((p) => !p.trim().startsWith('//')).length;

      const hooks = settings.hooks || {};
      const hookCount = Object.values(hooks).reduce((sum, entries) => sum + entries.length, 0);

      display.dim(`  Hooks:        ${hookCount} active`);
      display.dim(`  Permissions:  ${permCount} rules`);
    } catch {
      display.dim('  Settings:     (could not parse settings.json)');
    }
  }
}
