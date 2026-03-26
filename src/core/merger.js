import path from 'node:path';
import os from 'node:os';
import { readFile, writeFile } from '../utils/file.js';
import { readTemplate, substituteVariables, scaffoldFile, mergeSettings } from './scaffolder.js';
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
    const filename = `${skill.name}.md`;
    const destDir = path.join('.claude', 'skills');

    if (existingScan.existingSkills.includes(filename)) {
      // Tier 2: conflict — save as .workflow-ref.md
      await scaffoldFile(
        skill.templatePath,
        path.join(destDir, `${skill.name}.workflow-ref.md`),
        skill.vars,
        projectRoot
      );
      report.conflicts.skills.push(filename);
    } else {
      // Tier 1: add
      await scaffoldFile(skill.templatePath, path.join(destDir, filename), skill.vars, projectRoot);
      report.added.skills.push(filename);
    }
  }

  // Generated skill: agent-routing.md
  const routingFilename = 'agent-routing.md';
  const skillsDir = path.join('.claude', 'skills');
  const routingContent = buildAgentRoutingSkill(selections.selectedAgents, selections.projectTypes);

  if (existingScan.existingSkills.includes(routingFilename)) {
    await writeFile(
      path.join(projectRoot, skillsDir, 'agent-routing.workflow-ref.md'),
      routingContent
    );
    report.conflicts.skills.push(routingFilename);
  } else {
    await writeFile(path.join(projectRoot, skillsDir, routingFilename), routingContent);
    report.added.skills.push(routingFilename);
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
        path.join(destDir, `${agent}.workflow-ref.md`),
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
        path.join(destDir, `${agent}.workflow-ref.md`),
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
        path.join(destDir, `${cmd}.workflow-ref.md`),
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

export async function mergeSettingsPermissionsAndHooks(projectRoot, workflowSettings, report) {
  const existingRaw = await readFile(path.join(projectRoot, '.claude', 'settings.json'));
  const existing = parseUserJson(existingRaw, '.claude/settings.json');

  // Merge permissions (Tier 1)
  const existingAllow = existing.permissions?.allow || [];
  const workflowAllow = workflowSettings.permissions?.allow || [];
  const newPerms = workflowAllow.filter((p) => !existingAllow.includes(p));
  if (!existing.permissions) existing.permissions = {};
  existing.permissions.allow = [...existingAllow, ...newPerms];
  report.added.permissions = newPerms.length;

  // Merge hooks (Tier 1 + Tier 3)
  if (!existing.hooks) existing.hooks = {};
  const workflowHooks = workflowSettings.hooks || {};

  for (const category of Object.keys(workflowHooks)) {
    if (!existing.hooks[category]) existing.hooks[category] = [];

    const existingEntries = existing.hooks[category];
    const existingMatchers = new Map(existingEntries.map((h) => [h.matcher, h]));

    for (const workflowEntry of workflowHooks[category]) {
      if (existingMatchers.has(workflowEntry.matcher)) {
        const existingEntry = existingMatchers.get(workflowEntry.matcher);

        // If hooks are identical, skip — no conflict to resolve
        const existingCmd = existingEntry.hooks?.[0]?.command || '';
        const workflowCmd = workflowEntry.hooks?.[0]?.command || '';
        if (existingCmd === workflowCmd) {
          continue;
        }

        // Tier 3: conflict — ask user
        const resolution = await promptHookConflict(category, existingEntry, workflowEntry);

        if (resolution === 'replace') {
          const idx = existingEntries.indexOf(existingEntry);
          existingEntries[idx] = workflowEntry;
          report.hookConflicts.push(
            `${category} "${workflowEntry.matcher}": replaced with workflow hook`
          );
        } else if (resolution === 'chain') {
          const idx = existingEntries.indexOf(existingEntry);
          existingEntries[idx] = {
            matcher: existingEntry.matcher,
            hooks: [
              {
                type: 'command',
                command: `${existingEntry.hooks[0].command} && ${workflowEntry.hooks[0].command}`,
              },
            ],
          };
          report.hookConflicts.push(`${category} "${workflowEntry.matcher}": chained both hooks`);
        } else {
          report.hookConflicts.push(`${category} "${workflowEntry.matcher}": kept existing hook`);
        }
      } else {
        // Tier 1: no conflict — append
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
    report.added.permissions = workflowSettings.permissions?.allow?.length || 0;
    report.added.hooks = countHooks(workflowSettings.hooks);
    return;
  }

  try {
    await mergeSettingsPermissionsAndHooks(projectRoot, workflowSettings, report);
  } catch {
    display.warn('Existing settings.json contains invalid JSON — creating fresh settings instead.');
    await writeFile(path.join(projectRoot, '.claude', 'settings.json'), settingsStr);
    report.added.permissions = workflowSettings.permissions?.allow?.length || 0;
    report.added.hooks = countHooks(workflowSettings.hooks);
  }
}

function countHooks(hooks) {
  if (!hooks) return 0;
  return Object.values(hooks).reduce((sum, entries) => sum + entries.length, 0);
}

async function mergeMcpJson(projectRoot, existingScan) {
  if (!existingScan.hasMcpJson) {
    await scaffoldFile('mcp-json.json', '.mcp.json', {}, projectRoot);
    return;
  }

  // Merge mcpServers — user's servers take priority
  const existingRaw = await readFile(path.join(projectRoot, '.mcp.json'));
  const existing = parseUserJson(existingRaw, '.mcp.json');
  const workflowRaw = await readTemplate('mcp-json.json');
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
      'progress-md.md',
      path.join('docs', 'spec', 'PROGRESS.md'),
      variables,
      projectRoot
    );
  }
  report.skipped.progressMd = existingScan.hasProgressMd;

  if (!existingScan.hasSpecMd) {
    const primaryType = selections.projectTypes[0];
    const specTemplate = SPEC_MD_TEMPLATE_MAP[primaryType] || 'spec-md.md';
    await scaffoldFile(specTemplate, path.join('docs', 'spec', 'SPEC.md'), variables, projectRoot);
  }
  report.skipped.specMd = existingScan.hasSpecMd;
}

async function handleClaudeMd(projectRoot, existingScan, variables, report) {
  if (!existingScan.hasClaudeMd) {
    // No CLAUDE.md — scaffold fresh
    await scaffoldFile('claude-md.md', 'CLAUDE.md', variables, projectRoot);
    report.claudeMdHandling = 'created';
    return;
  }

  const existingContent = await readFile(path.join(projectRoot, 'CLAUDE.md'));
  const renderedTemplate = substituteVariables(await readTemplate('claude-md.md'), variables);
  const missingSections = detectMissingSections(existingContent);

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
  await mergeDocSpecs(projectRoot, existingScan, variables, selections, report);

  // Stop spinner before CLAUDE.md merge — interactive prompts for section selection
  if (spinner) spinner.stop();
  await handleClaudeMd(projectRoot, existingScan, variables, report);
  if (spinner) spinner.start();

  return report;
}
