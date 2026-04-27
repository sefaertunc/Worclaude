import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { UNIVERSAL_AGENTS } from '../data/agents.js';
import { loadAgentsFromDir, validateRoutingFields } from '../utils/agent-frontmatter.js';

const AUTO_START = '<!-- AUTO-GENERATED-START -->';
const AUTO_END = '<!-- AUTO-GENERATED-END -->';

const MODEL_LABEL = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };

function modelLabel(model) {
  if (!model) return 'Sonnet';
  return MODEL_LABEL[String(model).toLowerCase()] ?? model;
}

function isolationLabel(isolation) {
  return String(isolation).toLowerCase() === 'worktree' ? 'Worktree' : 'None';
}

function partition(agents) {
  const automatic = [];
  const manual = [];
  const reserved = [];
  for (const agent of agents) {
    if (agent.status === 'reserved') {
      reserved.push(agent);
    } else if (agent.triggerType === 'automatic') {
      automatic.push(agent);
    } else {
      manual.push(agent);
    }
  }
  return { automatic, manual, reserved };
}

const SKILL_FRONTMATTER = [
  '---',
  'description: "Agent Routing Guide — when to spawn each installed agent"',
  '---',
  '',
  '',
].join('\n');

/**
 * Build only the AUTO-GENERATED canonical block — markers + headings + agent
 * entries + decision matrix + rules. Used internally by the public file
 * builder and the regenerator.
 */
function buildAgentRoutingCanonicalBlock(agents) {
  for (const agent of agents) {
    validateRoutingFields(agent, { filePath: agent.filePath });
  }

  const { automatic, manual, reserved } = partition(agents);

  const sections = [
    buildHeader(),
    buildHowAgentsWork(),
    buildAutomaticTriggers(automatic),
    buildManualTriggers(manual),
    buildReserved(reserved),
    buildDecisionMatrix(agents, reserved),
    buildRules(),
  ].filter(Boolean);

  return `${AUTO_START}\n${sections.join('\n')}${AUTO_END}\n`;
}

/**
 * Build a complete agent-routing skill file from a list of fully-parsed
 * agent frontmatter objects. The result is suitable for fresh writes: it
 * starts with a YAML frontmatter block (so Claude Code's skill loader has
 * a description) followed by the canonical block wrapped in
 * `<!-- AUTO-GENERATED-START -->` / `<!-- AUTO-GENERATED-END -->` markers.
 *
 * For in-place updates of files that may carry user-authored prose,
 * use {@link regenerateAgentRoutingContent} instead.
 *
 * @param {object[]} agents - parsed agent frontmatter objects
 * @returns {string} complete file content
 */
export function buildAgentRoutingSkill(agents) {
  return `${SKILL_FRONTMATTER}${buildAgentRoutingCanonicalBlock(agents)}`;
}

/**
 * Replace the AUTO-GENERATED block in `existingContent` with newly-generated
 * content. If `existingContent` has markers, content outside them is
 * preserved verbatim (frontmatter, user notes). If markers are absent or
 * `existingContent` is null/empty, the result is a fresh complete file.
 *
 * @param {string|null} existingContent - the current file contents, or null/empty for first write
 * @param {object[]} agents - parsed agent frontmatter objects
 * @returns {string} updated file content
 */
export function regenerateAgentRoutingContent(existingContent, agents) {
  if (!existingContent) return buildAgentRoutingSkill(agents);
  const startIdx = existingContent.indexOf(AUTO_START);
  const endIdx = existingContent.indexOf(AUTO_END, startIdx + AUTO_START.length);
  if (startIdx === -1 || endIdx === -1) return buildAgentRoutingSkill(agents);
  const before = existingContent.slice(0, startIdx);
  const after = existingContent.slice(endIdx + AUTO_END.length);
  const fresh = buildAgentRoutingCanonicalBlock(agents);
  return `${before}${fresh.trimEnd()}${after}`;
}

/**
 * Convenience wrapper: load agent files from a directory, optionally
 * filter to a subset of names, and return the markdown.
 *
 * @param {string} dir - path to a directory containing agent .md files (recursively)
 * @param {object} [opts]
 * @param {string[]|null} [opts.includeNames] - only include agents whose `name` is in this set; null = include all
 * @returns {Promise<string>} marker-wrapped routing markdown
 */
export async function buildAgentRoutingSkillFromDir(dir, { includeNames = null } = {}) {
  const all = await loadAgentsFromDir(dir);
  const filtered = includeNames ? all.filter((a) => includeNames.includes(a.name)) : all;
  return buildAgentRoutingSkill(filtered);
}

/**
 * Load the default set of agents shipped with worclaude (universal + selected
 * optionals) from the project's `templates/agents/` directory. Used by init
 * and merger when scaffolding into a fresh project.
 *
 * @param {string[]} selectedOptionalNames - names of optional agents the user picked
 * @returns {Promise<object[]>} parsed agent frontmatter objects
 */
export async function loadShippedAgents(selectedOptionalNames) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const templatesDir = path.resolve(here, '..', '..', 'templates', 'agents');
  const all = await loadAgentsFromDir(templatesDir);
  const wanted = new Set([...UNIVERSAL_AGENTS, ...selectedOptionalNames]);
  return all.filter((a) => wanted.has(a.name));
}

function buildHeader() {
  return `# Agent Routing Guide

Read this file at the start of every session. It tells you which agents are available and when to use them.
`;
}

function buildHowAgentsWork() {
  return `## How Agents Work
- Agents are specialist subprocesses. Spawn them to keep your main context clean.
- Worktree agents run in isolation — safe to run in parallel with your work.
- Non-worktree agents share your context — don't edit the same files they're reading.
- Never spawn more than 3 agents simultaneously.
- If a task is small enough to do yourself in 2 minutes, don't spawn an agent for it.

## Background-Agent Concurrency

Two background agents on the same branch coexist cleanly:

- **Worktree-isolated agents** (\`isolation: "worktree"\`) each create their own
  sibling worktree off \`origin/HEAD\`. They never collide on files, refs, or the
  index — running multiple in parallel is safe by design.
- **Non-isolated agents** share the main checkout but are read-only by
  convention. The main session and these agents must avoid editing the same
  files concurrently; otherwise behavior is up to whoever writes last.

Worktree lock semantics: Claude Code locks each agent worktree with the agent's
pid; the lock survives agent completion. Stale locks are normal. Clean up with
\`git worktree remove -f -f <path>\` or the project's worktree-cleanup helper.

The earlier "lock file per branch" plan was rejected after the 2026-04-26
concurrency test — worktree isolation already provides the guarantee a lock
file would have, and a lock would block the legitimate parallel-agents case.

---
`;
}

function buildAgentEntry(agent) {
  let trigger;
  if (agent.triggerType === 'automatic' && agent.triggerCommand) {
    trigger = `Automatic — spawn when trigger condition is met (also: ${agent.triggerCommand})`;
  } else if (agent.triggerType === 'automatic') {
    trigger = 'Automatic — spawn when trigger condition is met';
  } else if (agent.triggerCommand) {
    trigger = `Manual — ${agent.triggerCommand}`;
  } else {
    trigger = 'Manual — spawn when needed';
  }

  return `### ${agent.name}
- **Model:** ${modelLabel(agent.model)} | **Isolation:** ${isolationLabel(agent.isolation)}
- **When:** ${agent.whenToUse}
- **Trigger:** ${trigger}
- **What it does:** ${agent.whatItDoes}
- **Expect back:** ${agent.expectBack}
`;
}

function buildAutomaticTriggers(agents) {
  if (agents.length === 0) {
    return `## Automatic Triggers

No automatic-trigger agents installed.

---
`;
  }

  const entries = agents.map(buildAgentEntry).join('\n');
  return `## Automatic Triggers

These agents should be spawned without being asked when their trigger condition is met.

${entries}---
`;
}

function buildManualTriggers(agents) {
  if (agents.length === 0) {
    return `## Manual Triggers

No manual-trigger agents installed.

---
`;
  }

  const entries = agents.map(buildAgentEntry).join('\n');
  return `## Manual Triggers

These agents are spawned when you or the user explicitly requests them.

${entries}---
`;
}

function buildReserved(reservedAgents) {
  if (reservedAgents.length === 0) return '';

  const entries = reservedAgents
    .map(
      (agent) => `### ${agent.name}
- **Model:** ${modelLabel(agent.model)} | **Isolation:** ${isolationLabel(agent.isolation)}
- **Status:** Reserved — no in-session command currently invokes this agent.
- **Why kept:** ${agent.whenToUse}
- **Do NOT spawn this agent in regular sessions.** It exists for scheduled
  automation (CI/Actions) and for future revival; spawning it manually has no
  defined entry path today.
`
    )
    .join('\n');

  return `## Reserved

${entries}---
`;
}

function buildDecisionMatrix(allAgents, reservedAgents) {
  const reservedSet = new Set(reservedAgents.map((a) => a.name));
  const header = `## Decision Matrix

| You just... | Spawn this | Auto? |
|---|---|---|`;

  const rows = [];
  for (const agent of allAgents) {
    if (reservedSet.has(agent.name)) continue;
    const auto = agent.triggerType === 'automatic' ? 'Yes' : 'Manual';
    rows.push(`| ${agent.situationLabel} | ${agent.name} | ${auto} |`);
  }

  return `${header}
${rows.join('\n')}

---
`;
}

function buildRules() {
  return `## Rules
1. Universal agents are your defaults. Use them every session.
2. Project agents are specialists. Use them when their domain is relevant.
3. Worktree agents are safe to run in parallel — they can't break your work.
4. Non-worktree agents share your context — don't edit the same files they're reading.
5. When in doubt, spawn the agent. A wasted agent run costs less than a missed bug.
6. If you spawn an agent and it's not useful, tell the user — they may remove it.
`;
}

export { AUTO_START, AUTO_END };

/**
 * Read a file and run regenerateAgentRoutingContent on it. Convenience for
 * call sites that already have a target path.
 */
export async function regenerateAgentRoutingFile(filePath, agents) {
  let existing = null;
  try {
    existing = await readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return regenerateAgentRoutingContent(existing, agents);
}
