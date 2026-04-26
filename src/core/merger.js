import path from 'node:path';
import os from 'node:os';
import { readFile, writeFile } from '../utils/file.js';
import {
  readTemplate,
  substituteVariables,
  scaffoldFile,
  scaffoldAgentsMd,
  mergeSettings,
  scaffoldHooks,
  scaffoldPluginJson,
  scaffoldMemoryDocs,
} from './scaffolder.js';
import { workflowRefRelPath } from './file-categorizer.js';
import { promptHookConflict } from '../prompts/conflict-resolution.js';
import {
  detectMissingSections,
  generateWorkflowSuggestions,
  promptClaudeMdMerge,
  interactiveSectionMerge,
} from '../prompts/claude-md-merge.js';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
  NOTIFICATION_COMMANDS,
  SPEC_MD_TEMPLATE_MAP,
} from '../data/agents.js';
import { buildAgentRoutingSkill } from '../generators/agent-routing.js';
import * as display from '../utils/display.js';

// --- Settings builder (shared with Scenario A) ---

export async function buildSettingsJson(languages, useDocker) {
  const baseSettings = JSON.parse(await readTemplate('settings/base.json'));
  const formatters = [];
  const settingsToMerge = [];

  for (const lang of languages) {
    if (lang !== 'other') {
      const stackRaw = await readTemplate(`settings/${lang}.json`);
      const stackSettings = JSON.parse(stackRaw);
      if (stackSettings.formatter) {
        formatters.push(stackSettings.formatter);
      }
      delete stackSettings.formatter;
      settingsToMerge.push(stackSettings);
    }
  }

  if (useDocker) {
    const dockerRaw = await readTemplate('settings/docker.json');
    const dockerSettings = JSON.parse(dockerRaw);
    delete dockerSettings.formatter;
    settingsToMerge.push(dockerSettings);
  }

  const formatter =
    formatters.length > 0 ? formatters.join(' && ') : "echo 'No formatter configured'";

  const mergedSettings = mergeSettings(baseSettings, ...settingsToMerge);

  const platform = os.platform();
  const notification = NOTIFICATION_COMMANDS[platform] || NOTIFICATION_COMMANDS.linux;

  replaceHookCommands(mergedSettings, {
    formatter_command: formatter,
    notification_command: notification,
  });

  const settingsStr = JSON.stringify(mergedSettings, null, 2);
  return { settingsStr, settingsObject: mergedSettings };
}

function replaceHookCommands(settings, variables) {
  if (!settings.hooks) return;
  for (const entries of Object.values(settings.hooks)) {
    for (const entry of entries) {
      if (!entry.hooks) continue;
      for (const hook of entry.hooks) {
        if (typeof hook.command === 'string') {
          hook.command = hook.command.replace(/\{(\w+)\}/g, (match, key) =>
            variables[key] !== undefined ? variables[key] : match
          );
        }
      }
    }
  }
}

function parseUserJson(raw, filename) {
  try {
    return JSON.parse(raw);
  } catch {
    // Try stripping shell-escaped braces (common zsh heredoc artifact)
    const cleaned = raw.replace(/\\([{}])/g, '$1');
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      throw new Error(`existing ${filename} contains invalid JSON: ${err.message}`);
    }
  }
}

// --- Sub-merge operations ---

async function mergeSkills(projectRoot, existingScan, variables, report, selections) {
  const allSkills = [
    ...UNIVERSAL_SKILLS.map((s) => ({
      name: s,
      templatePath: `skills/universal/${s}.md`,
      vars: {},
    })),
    ...TEMPLATE_SKILLS.map((s) => ({
      name: s,
      templatePath: `skills/templates/${s}.md`,
      vars: variables,
    })),
  ];

  for (const skill of allSkills) {
    const destPath = path.join('.claude', 'skills', skill.name, 'SKILL.md');
    const existsAsDir = existingScan.existingSkillDirs.includes(skill.name);
    const existsAsFlat = existingScan.existingSkills.includes(`${skill.name}.md`);

    if (existsAsDir || existsAsFlat) {
      // Tier 2: conflict — save under .claude/workflow-ref/ so the live
      // SKILL.md stays authoritative and the ref cannot shadow it.
      await scaffoldFile(
        skill.templatePath,
        workflowRefRelPath(`skills/${skill.name}/SKILL.md`),
        skill.vars,
        projectRoot
      );
      report.conflicts.skills.push(skill.name);
    } else {
      // Tier 1: add
      await scaffoldFile(skill.templatePath, destPath, skill.vars, projectRoot);
      report.added.skills.push(skill.name);
    }
  }

  // Generated skill: agent-routing
  const skillsDir = path.join('.claude', 'skills');
  const routingContent = buildAgentRoutingSkill(selections.selectedAgents, selections.projectTypes);
  const routingExistsAsDir = existingScan.existingSkillDirs.includes('agent-routing');
  const routingExistsAsFlat = existingScan.existingSkills.includes('agent-routing.md');

  if (routingExistsAsDir || routingExistsAsFlat) {
    await writeFile(
      path.join(projectRoot, workflowRefRelPath('skills/agent-routing/SKILL.md')),
      routingContent
    );
    report.conflicts.skills.push('agent-routing');
  } else {
    await writeFile(path.join(projectRoot, skillsDir, 'agent-routing', 'SKILL.md'), routingContent);
    report.added.skills.push('agent-routing');
  }
}

async function mergeAgents(projectRoot, existingScan, selectedAgents, report) {
  // Universal agents
  for (const agent of UNIVERSAL_AGENTS) {
    const filename = `${agent}.md`;
    const destDir = path.join('.claude', 'agents');

    if (existingScan.existingAgents.includes(filename)) {
      await scaffoldFile(
        `agents/universal/${agent}.md`,
        workflowRefRelPath(`agents/${filename}`),
        {},
        projectRoot
      );
      report.conflicts.agents.push(filename);
    } else {
      await scaffoldFile(
        `agents/universal/${agent}.md`,
        path.join(destDir, filename),
        {},
        projectRoot
      );
      report.added.agents.push(filename);
    }
  }

  // Selected optional agents
  for (const agent of selectedAgents) {
    const category = AGENT_CATALOG[agent].category;
    const filename = `${agent}.md`;
    const destDir = path.join('.claude', 'agents');

    if (existingScan.existingAgents.includes(filename)) {
      await scaffoldFile(
        `agents/optional/${category}/${agent}.md`,
        workflowRefRelPath(`agents/${filename}`),
        {},
        projectRoot
      );
      report.conflicts.agents.push(filename);
    } else {
      await scaffoldFile(
        `agents/optional/${category}/${agent}.md`,
        path.join(destDir, filename),
        {},
        projectRoot
      );
      report.added.agents.push(filename);
    }
  }
}

async function mergeCommands(projectRoot, existingScan, report) {
  for (const cmd of COMMAND_FILES) {
    const filename = `${cmd}.md`;
    const destDir = path.join('.claude', 'commands');

    if (existingScan.existingCommands.includes(filename)) {
      await scaffoldFile(
        `commands/${cmd}.md`,
        workflowRefRelPath(`commands/${filename}`),
        {},
        projectRoot
      );
      report.conflicts.commands.push(filename);
    } else {
      await scaffoldFile(`commands/${cmd}.md`, path.join(destDir, filename), {}, projectRoot);
      report.added.commands.push(filename);
    }
  }
}

export async function mergeSettingsPermissionsAndHooks(
  projectRoot,
  workflowSettings,
  report,
  options = {}
) {
  const existingRaw = await readFile(path.join(projectRoot, '.claude', 'settings.json'));
  const existing = parseUserJson(existingRaw, '.claude/settings.json');

  // Merge permissions (Tier 1) — union-merge both allow and deny
  const existingAllow = existing.permissions?.allow || [];
  const workflowAllow = workflowSettings.permissions?.allow || [];
  const newAllow = workflowAllow.filter((p) => !existingAllow.includes(p));
  if (!existing.permissions) existing.permissions = {};
  existing.permissions.allow = [...existingAllow, ...newAllow];

  const existingDeny = existing.permissions?.deny || [];
  const workflowDeny = workflowSettings.permissions?.deny || [];
  const newDeny = workflowDeny.filter((p) => !existingDeny.includes(p));
  if (newDeny.length > 0 || existingDeny.length > 0) {
    existing.permissions.deny = [...existingDeny, ...newDeny];
  }

  report.added.permissions = newAllow.length + newDeny.length;

  // Merge hooks (Tier 1 + Tier 3)
  if (!existing.hooks) existing.hooks = {};
  const workflowHooks = workflowSettings.hooks || {};

  for (const category of Object.keys(workflowHooks)) {
    if (!existing.hooks[category]) existing.hooks[category] = [];

    const existingEntries = existing.hooks[category];
    const existingByMatcher = new Map();
    for (const entry of existingEntries) {
      if (!existingByMatcher.has(entry.matcher)) {
        existingByMatcher.set(entry.matcher, []);
      }
      existingByMatcher.get(entry.matcher).push(entry);
    }
    const matched = new Set();

    for (const workflowEntry of workflowHooks[category]) {
      const candidates = existingByMatcher.get(workflowEntry.matcher) || [];
      const workflowCmd = workflowEntry.hooks?.[0]?.command || '';

      // Try exact match first (identical command = skip)
      const exactMatch = candidates.find(
        (c) => !matched.has(c) && (c.hooks?.[0]?.command || '') === workflowCmd
      );
      if (exactMatch) {
        matched.add(exactMatch);
        continue;
      }

      // Try unmatched candidate with same matcher (conflict)
      const conflictCandidate = candidates.find((c) => !matched.has(c));
      if (conflictCandidate) {
        matched.add(conflictCandidate);

        // Tier 3: conflict — ask user (or auto-keep if --yes)
        const resolution = await promptHookConflict(category, conflictCandidate, workflowEntry, {
          yes: options.yes,
        });

        if (resolution === 'replace') {
          const idx = existingEntries.indexOf(conflictCandidate);
          existingEntries[idx] = workflowEntry;
          report.hookConflicts.push(
            `${category} "${workflowEntry.matcher}": replaced with workflow hook`
          );
        } else if (resolution === 'chain') {
          const idx = existingEntries.indexOf(conflictCandidate);
          existingEntries[idx] = {
            matcher: conflictCandidate.matcher,
            hooks: [
              {
                type: 'command',
                command: `${conflictCandidate.hooks[0].command} && ${workflowEntry.hooks[0].command}`,
              },
            ],
          };
          report.hookConflicts.push(`${category} "${workflowEntry.matcher}": chained both hooks`);
        } else {
          report.hookConflicts.push(`${category} "${workflowEntry.matcher}": kept existing hook`);
        }
      } else {
        // Tier 1: no match — append
        existingEntries.push(workflowEntry);
        report.added.hooks++;
      }
    }
  }

  await writeFile(
    path.join(projectRoot, '.claude', 'settings.json'),
    JSON.stringify(existing, null, 2)
  );
}

async function mergeSettingsJson(projectRoot, existingScan, selections, report) {
  const { languages, useDocker } = selections;
  const { settingsStr, settingsObject: workflowSettings } = await buildSettingsJson(
    languages,
    useDocker
  );

  if (!existingScan.hasSettingsJson) {
    // No existing settings — create fresh
    await writeFile(path.join(projectRoot, '.claude', 'settings.json'), settingsStr);
    report.added.permissions =
      (workflowSettings.permissions?.allow?.length || 0) +
      (workflowSettings.permissions?.deny?.length || 0);
    report.added.hooks = countHooks(workflowSettings.hooks);
    return;
  }

  try {
    await mergeSettingsPermissionsAndHooks(projectRoot, workflowSettings, report);
  } catch {
    display.warn('Existing settings.json contains invalid JSON — creating fresh settings instead.');
    await writeFile(path.join(projectRoot, '.claude', 'settings.json'), settingsStr);
    report.added.permissions =
      (workflowSettings.permissions?.allow?.length || 0) +
      (workflowSettings.permissions?.deny?.length || 0);
    report.added.hooks = countHooks(workflowSettings.hooks);
  }
}

function countHooks(hooks) {
  if (!hooks) return 0;
  return Object.values(hooks).reduce((sum, entries) => sum + entries.length, 0);
}

async function mergeMcpJson(projectRoot, existingScan) {
  if (!existingScan.hasMcpJson) {
    await scaffoldFile('core/mcp-json.json', '.mcp.json', {}, projectRoot);
    return;
  }

  // Merge mcpServers — user's servers take priority
  const existingRaw = await readFile(path.join(projectRoot, '.mcp.json'));
  const existing = parseUserJson(existingRaw, '.mcp.json');
  const workflowRaw = await readTemplate('core/mcp-json.json');
  const workflow = JSON.parse(workflowRaw);

  const merged = {
    ...existing,
    mcpServers: { ...workflow.mcpServers, ...existing.mcpServers },
  };

  await writeFile(path.join(projectRoot, '.mcp.json'), JSON.stringify(merged, null, 2));
}

async function mergeDocSpecs(projectRoot, existingScan, variables, selections, report) {
  if (!existingScan.hasProgressMd) {
    await scaffoldFile(
      'core/progress-md.md',
      path.join('docs', 'spec', 'PROGRESS.md'),
      variables,
      projectRoot
    );
  }
  report.skipped.progressMd = existingScan.hasProgressMd;

  if (!existingScan.hasSpecMd) {
    const primaryType = selections.projectTypes[0];
    const specTemplate = SPEC_MD_TEMPLATE_MAP[primaryType] || 'specs/spec-md.md';
    await scaffoldFile(specTemplate, path.join('docs', 'spec', 'SPEC.md'), variables, projectRoot);
  }
  report.skipped.specMd = existingScan.hasSpecMd;
}

async function handleClaudeMd(projectRoot, existingScan, variables, selections, report) {
  if (!existingScan.hasClaudeMd) {
    // No CLAUDE.md — scaffold fresh
    await scaffoldFile('core/claude-md.md', 'CLAUDE.md', variables, projectRoot);
    report.claudeMdHandling = 'created';
    return;
  }

  const existingContent = await readFile(path.join(projectRoot, 'CLAUDE.md'));
  const renderedTemplate = substituteVariables(await readTemplate('core/claude-md.md'), variables);
  const missingSections = detectMissingSections(existingContent);

  // Tier 3 notice: if user opted into GTD memory AND their CLAUDE.md already has
  // a Memory Architecture section, the pointer bullets from the rendered template
  // won't be merged in automatically. Surface this so the user can add them manually.
  if (selections.scaffoldGtdMemory && !missingSections.includes('Memory Architecture')) {
    report.memoryArchitectureSectionExists = true;
  }

  if (missingSections.length === 0) {
    display.newline();
    display.info(`Your CLAUDE.md (${existingContent.split(/\r?\n/).length} lines) was detected.`);
    display.success('Your CLAUDE.md already has all recommended sections!');
    report.claudeMdHandling = 'kept';
    return;
  }

  const choice = await promptClaudeMdMerge(existingContent, missingSections);

  if (choice === 'keep') {
    const suggestions = generateWorkflowSuggestions(existingContent, renderedTemplate);
    await writeFile(path.join(projectRoot, 'CLAUDE.md.workflow-suggestions'), suggestions);
    report.claudeMdHandling = 'suggestions-generated';
  } else if (choice === 'merge-sections') {
    const updatedContent = await interactiveSectionMerge(
      existingContent,
      renderedTemplate,
      missingSections
    );
    await writeFile(path.join(projectRoot, 'CLAUDE.md'), updatedContent);
    report.claudeMdHandling = 'merged-sections';
  }
}

async function mergeAgentsMd(projectRoot, variables, report) {
  const result = await scaffoldAgentsMd(projectRoot, variables);
  // Preserve the existing report-field vocabulary for downstream observability.
  report.agentsMdHandling = result === 'created' ? 'created' : 'saved-alongside';
}

// --- Main merge function ---

export async function performMerge(
  projectRoot,
  existingScan,
  selections,
  variables,
  { spinner } = {}
) {
  const report = {
    added: { skills: [], agents: [], commands: [], permissions: 0, hooks: 0 },
    conflicts: { skills: [], agents: [], commands: [] },
    skipped: { progressMd: false, specMd: false },
    claudeMdHandling: 'kept',
    agentsMdHandling: 'kept',
    hookConflicts: [],
  };

  await mergeSkills(projectRoot, existingScan, variables, report, selections);
  await mergeAgents(projectRoot, existingScan, selections.selectedAgents, report);
  await mergeCommands(projectRoot, existingScan, report);

  // Stop spinner before settings merge — hook conflicts may prompt for input
  if (spinner) spinner.stop();
  await mergeSettingsJson(projectRoot, existingScan, selections, report);
  if (spinner) spinner.start();

  await mergeMcpJson(projectRoot, existingScan);

  // Ensure sessions directory exists for session persistence
  await writeFile(path.join(projectRoot, '.claude', 'sessions', '.gitkeep'), '');

  // Copy hook scripts (preserves existing user modifications)
  await scaffoldHooks(projectRoot);

  // Create learnings directory for correction capture
  await writeFile(path.join(projectRoot, '.claude', 'learnings', '.gitkeep'), '');

  // Opt-in: plugin.json (idempotent — scaffolder skips if file exists)
  if (selections.generatePluginJson) {
    await scaffoldPluginJson(projectRoot, selections);
  }

  // Opt-in: GTD memory scaffold (idempotent per-file). Tier 3 notice for
  // existing Memory Architecture section is handled inside handleClaudeMd,
  // which already reads CLAUDE.md and runs section detection.
  if (selections.scaffoldGtdMemory) {
    await scaffoldMemoryDocs(projectRoot);
  }

  await mergeDocSpecs(projectRoot, existingScan, variables, selections, report);

  // Stop spinner before CLAUDE.md merge — interactive prompts for section selection
  if (spinner) spinner.stop();
  await handleClaudeMd(projectRoot, existingScan, variables, selections, report);
  await mergeAgentsMd(projectRoot, variables, report);
  if (spinner) spinner.start();

  return report;
}
