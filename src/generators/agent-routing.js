import { UNIVERSAL_AGENTS } from '../data/agents.js';
import { AGENT_REGISTRY } from '../data/agent-registry.js';

/**
 * Generates the agent-routing.md skill file content based on selected agents.
 * @param {string[]} selectedAgentNames - names of optional agents the user selected
 * @param {string[]} projectTypes - e.g. ['Backend / API', 'Frontend / UI']
 * @returns {string} - complete markdown content for agent-routing.md
 */
export function buildAgentRoutingSkill(selectedAgentNames, _projectTypes) {
  const allAgents = [...new Set([...UNIVERSAL_AGENTS, ...selectedAgentNames])];

  const automaticAgents = [];
  const manualAgents = [];

  const reservedAgents = [];

  for (const name of allAgents) {
    const entry = AGENT_REGISTRY[name];
    if (!entry) continue;
    if (entry.status === 'reserved') {
      reservedAgents.push({ name, ...entry });
    } else if (entry.triggerType === 'automatic') {
      automaticAgents.push({ name, ...entry });
    } else {
      manualAgents.push({ name, ...entry });
    }
  }

  const sections = [
    buildHeader(),
    buildHowAgentsWork(),
    buildAutomaticTriggers(automaticAgents),
    buildManualTriggers(manualAgents),
    buildReserved(reservedAgents),
    buildDecisionMatrix(allAgents, reservedAgents),
    buildRules(),
  ];

  return sections.filter(Boolean).join('\n');
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
  const isolation = agent.isolation === 'worktree' ? 'Worktree' : 'None';
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
- **Model:** ${agent.model} | **Isolation:** ${isolation}
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

${entries}
---
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

${entries}
---
`;
}

function buildReserved(reservedAgents) {
  if (reservedAgents.length === 0) return '';

  const entries = reservedAgents
    .map(
      (agent) => `### ${agent.name}
- **Model:** ${agent.model} | **Isolation:** ${agent.isolation === 'worktree' ? 'Worktree' : 'None'}
- **Status:** Reserved — no in-session command currently invokes this agent.
- **Why kept:** ${agent.whenToUse}
- **Do NOT spawn this agent in regular sessions.** It exists for scheduled
  automation (CI/Actions) and for future revival; spawning it manually has no
  defined entry path today.
`
    )
    .join('\n');

  return `## Reserved

${entries}
---
`;
}

function buildDecisionMatrix(allAgents, reservedAgents = []) {
  const reservedSet = new Set(reservedAgents.map((a) => a.name));
  const header = `## Decision Matrix

| You just... | Spawn this | Auto? |
|---|---|---|`;

  const rows = [];
  for (const name of allAgents) {
    const entry = AGENT_REGISTRY[name];
    if (!entry) continue;
    if (reservedSet.has(name)) continue;
    const auto = entry.triggerType === 'automatic' ? 'Yes' : 'Manual';
    rows.push(`| ${entry.situationLabel} | ${name} | ${auto} |`);
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
