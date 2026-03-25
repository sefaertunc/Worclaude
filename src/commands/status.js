import path from 'node:path';
import { readWorkflowMeta, workflowMetaExists } from '../core/config.js';
import { hashFile } from '../utils/hash.js';
import { fileExists, readFile, listFilesRecursive } from '../utils/file.js';
import { TECH_STACKS } from '../data/agents.js';
import * as display from '../utils/display.js';

const TECH_DISPLAY_NAMES = Object.fromEntries(TECH_STACKS.map((t) => [t.value, t.name]));

function countByPrefix(fileHashes, prefix) {
  return Object.keys(fileHashes).filter((k) => k.startsWith(prefix)).length;
}

export async function statusCommand() {
  const projectRoot = process.cwd();

  if (!(await workflowMetaExists(projectRoot))) {
    display.info('Workflow is not installed. Run `worclaude init` to set up.');
    return;
  }

  const meta = await readWorkflowMeta(projectRoot);
  if (!meta) {
    display.error('workflow-meta.json is corrupted. Run `worclaude init` to reinstall.');
    return;
  }

  display.sectionHeader('WORCLAUDE STATUS');

  // Version
  display.barLine(
    `${'Version'.padEnd(11)}${display.green(`v${meta.version}`)} ${display.dimColor('(up to date)')}`
  );

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

  // Pending review files
  const pendingReview = [];
  try {
    const claudeDir = path.join(projectRoot, '.claude');
    const allFiles = await listFilesRecursive(claudeDir);
    for (const fp of allFiles) {
      const rel = path.relative(claudeDir, fp).split(path.sep).join('/');
      if (rel.endsWith('.workflow-ref.md')) {
        pendingReview.push(`.claude/${rel}`);
      }
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
