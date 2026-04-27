import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAgentRoutingSkill,
  loadShippedAgents,
  regenerateAgentRoutingContent,
  AUTO_START,
  AUTO_END,
} from '../../src/generators/agent-routing.js';
import { loadAgentsFromDir, validateRoutingFields } from '../../src/utils/agent-frontmatter.js';
import { UNIVERSAL_AGENTS, AGENT_CATALOG } from '../../src/data/agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(__dirname, '..', '..', 'templates', 'agents');

let allAgents;

beforeAll(async () => {
  allAgents = await loadAgentsFromDir(templatesDir);
});

function pick(names) {
  const set = new Set(names);
  return allAgents.filter((a) => set.has(a.name));
}

function universalsOnly() {
  return pick(UNIVERSAL_AGENTS);
}

describe('buildAgentRoutingSkill', () => {
  it('generates routing with only universal agents when no optional selected', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));

    for (const agent of UNIVERSAL_AGENTS) {
      expect(result).toContain(`### ${agent}`);
    }
    expect(result).not.toContain('### api-designer');
    expect(result).not.toContain('### ui-reviewer');
  });

  it('includes backend agents when selected', async () => {
    const agents = await loadShippedAgents(['api-designer', 'database-analyst', 'auth-auditor']);
    const result = buildAgentRoutingSkill(agents);

    expect(result).toContain('### api-designer');
    expect(result).toContain('### database-analyst');
    expect(result).toContain('### auth-auditor');
  });

  it('generates all agents when all optional agents selected', async () => {
    const allOptional = Object.keys(AGENT_CATALOG);
    const result = buildAgentRoutingSkill(await loadShippedAgents(allOptional));

    for (const agent of UNIVERSAL_AGENTS) {
      expect(result).toContain(`### ${agent}`);
    }
    for (const agent of allOptional) {
      expect(result).toContain(`### ${agent}`);
    }
  });

  it('has correct number of Decision Matrix rows', async () => {
    const universals = universalsOnly();
    const nonReservedUniversal = universals.filter((a) => a.status !== 'reserved');

    const resultUniversal = buildAgentRoutingSkill(universals);
    const universalRows = resultUniversal
      .split('\n')
      .filter(
        (line) =>
          line.startsWith('| ') && !line.startsWith('| You just') && !line.startsWith('|---')
      );
    expect(universalRows).toHaveLength(nonReservedUniversal.length);

    const resultAll = buildAgentRoutingSkill(allAgents);
    const allRows = resultAll
      .split('\n')
      .filter(
        (line) =>
          line.startsWith('| ') && !line.startsWith('| You just') && !line.startsWith('|---')
      );
    const nonReservedAll = allAgents.filter((a) => a.status !== 'reserved');
    expect(allRows).toHaveLength(nonReservedAll.length);
  });

  it('partitions automatic and manual triggers correctly', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));

    const autoSection = result.split('## Manual Triggers')[0];
    expect(autoSection).toContain('### test-writer');
    expect(autoSection).toContain('### code-simplifier');
    expect(autoSection).toContain('### build-validator');

    const manualSection = result.split('## Manual Triggers')[1].split('## Reserved')[0];
    expect(manualSection).toContain('### plan-reviewer');
    expect(manualSection).toContain('### verify-app');

    expect(manualSection).not.toContain('### upstream-watcher');
    const reservedSection = result.split('## Reserved')[1].split('## Decision Matrix')[0];
    expect(reservedSection).toContain('### upstream-watcher');
  });

  it('contains all expected section headers', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));

    expect(result).toContain('# Agent Routing Guide');
    expect(result).toContain('## How Agents Work');
    expect(result).toContain('## Background-Agent Concurrency');
    expect(result).toContain('## Automatic Triggers');
    expect(result).toContain('## Manual Triggers');
    expect(result).toContain('## Reserved');
    expect(result).toContain('## Decision Matrix');
    expect(result).toContain('## Rules');
  });

  it('wraps the canonical block in AUTO-GENERATED markers, after frontmatter', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));
    // Skill loaders need a leading frontmatter block for description.
    expect(result.startsWith('---\n')).toBe(true);
    expect(result).toMatch(/^---\ndescription: "Agent Routing Guide/);
    // Canonical block is fully marker-wrapped.
    expect(result.includes(AUTO_START)).toBe(true);
    expect(result.includes(AUTO_END)).toBe(true);
    // File ends with the canonical block's trailing newline.
    expect(result.endsWith(`${AUTO_END}\n`)).toBe(true);
  });

  it('excludes reserved agents from the Decision Matrix', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));
    const matrixSection = result.split('## Decision Matrix')[1].split('## Rules')[0];
    expect(matrixSection).not.toContain('| upstream-watcher |');
  });

  it('includes model and isolation info for each agent', async () => {
    const agents = await loadShippedAgents(['api-designer']);
    const result = buildAgentRoutingSkill(agents);

    expect(result).toContain('**Model:** Opus | **Isolation:** None');
    expect(result).toContain('**Model:** Sonnet | **Isolation:** Worktree');
    expect(result).toContain('**Model:** Haiku | **Isolation:** None');
  });

  it('only includes selected optional agents, not all', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents(['ui-reviewer', 'bug-fixer']));

    expect(result).toContain('### ui-reviewer');
    expect(result).toContain('### bug-fixer');
    expect(result).not.toContain('### api-designer');
    expect(result).not.toContain('### docker-helper');
    expect(result).not.toContain('### prompt-engineer');
  });

  it('shows trigger commands for agents that have them', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));

    expect(result).toContain('/review-plan');
    expect(result).toContain('/simplify');
    expect(result).toContain('/verify');
  });
});

describe('content quality', () => {
  it('should not contain undefined or null in output', async () => {
    const allOptional = Object.keys(AGENT_CATALOG);
    const result = buildAgentRoutingSkill(await loadShippedAgents(allOptional));

    expect(result).not.toMatch(/\bundefined\b/);
    expect(result).not.toMatch(/\bnull\b/);
  });

  it('should include When, Trigger, What it does, Expect back for each agent entry', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents(['api-designer']));

    const apiSection = result.split('### api-designer')[1].split('###')[0];
    expect(apiSection).toContain('**When:**');
    expect(apiSection).toContain('**Trigger:**');
    expect(apiSection).toContain('**What it does:**');
    expect(apiSection).toContain('**Expect back:**');
  });

  it('canonical block opens with a level-1 header', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents([]));
    const startIdx = result.indexOf(AUTO_START);
    const afterMarker = result.slice(startIdx + AUTO_START.length).trimStart();
    expect(afterMarker).toMatch(/^# /);
  });

  it('should produce valid markdown with no broken table rows', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents(['bug-fixer', 'api-designer']));
    const tableRows = result.split('\n').filter((line) => line.startsWith('|'));

    for (const row of tableRows) {
      const pipeCount = (row.match(/\|/g) || []).length;
      expect(pipeCount).toBe(4);
    }
  });
});

describe('edge cases', () => {
  it('ignores unknown agent slugs gracefully', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents(['nonexistent-agent']));

    expect(result).toContain('# Agent Routing Guide');
    expect(result).not.toContain('### nonexistent-agent');
    for (const agent of UNIVERSAL_AGENTS) {
      expect(result).toContain(`### ${agent}`);
    }
  });

  it('handles duplicate agent slugs', async () => {
    // loadShippedAgents dedupes via Set lookup; the list of agents is unique
    // by virtue of how files are named on disk.
    const result = buildAgentRoutingSkill(await loadShippedAgents(['bug-fixer', 'bug-fixer']));

    const sectionBeforeMatrix = result.split('## Decision Matrix')[0];
    const matches = sectionBeforeMatrix.match(/### bug-fixer/g) || [];
    expect(matches).toHaveLength(1);
  });

  it('does not duplicate universal agents when passed as a selected name', async () => {
    const result = buildAgentRoutingSkill(await loadShippedAgents(['plan-reviewer']));

    const matches = result.match(/### plan-reviewer/g) || [];
    expect(matches).toHaveLength(1);
  });

  it('produces deterministic output', async () => {
    const a1 = await loadShippedAgents(['api-designer', 'bug-fixer']);
    const a2 = await loadShippedAgents(['api-designer', 'bug-fixer']);
    expect(buildAgentRoutingSkill(a1)).toBe(buildAgentRoutingSkill(a2));
  });
});

describe('regenerateAgentRoutingContent', () => {
  it('returns a fresh complete file when given empty input', () => {
    const fresh = regenerateAgentRoutingContent(null, universalsOnly());
    expect(fresh.startsWith('---\n')).toBe(true);
    expect(fresh).toContain(AUTO_START);
    expect(fresh.endsWith(`${AUTO_END}\n`)).toBe(true);
  });

  it('replaces only the marker block when present, preserving prose around it', () => {
    const fresh = buildAgentRoutingSkill(universalsOnly());
    const userEpilogue = '\n\n## Local Notes\n\nThis section must survive.\n';
    const existing = `${fresh}${userEpilogue}`;

    const out = regenerateAgentRoutingContent(existing, universalsOnly());
    // Frontmatter at top is preserved verbatim.
    expect(out.startsWith('---\n')).toBe(true);
    // User epilogue after the AUTO-GENERATED-END marker is preserved.
    expect(out.endsWith(userEpilogue)).toBe(true);
    expect(out).toContain(AUTO_START);
    expect(out).toContain(AUTO_END);
  });

  it('falls back to a fresh complete file when the existing file has no markers', () => {
    const existing = '# An old hand-written file with no markers\n';
    const out = regenerateAgentRoutingContent(existing, universalsOnly());
    // Fresh file starts with frontmatter; the marker-less existing content is
    // intentionally replaced (no silent merge).
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toContain(AUTO_START);
    expect(out).not.toContain('hand-written file with no markers');
  });
});

describe('agent frontmatter completeness', () => {
  it('every shipped template has the required routing fields', () => {
    for (const agent of allAgents) {
      validateRoutingFields(agent, { filePath: agent.filePath });
    }
  });

  it('every universal agent has category="universal"', () => {
    for (const name of UNIVERSAL_AGENTS) {
      const agent = allAgents.find((a) => a.name === name);
      expect(agent, `template missing for universal agent ${name}`).toBeDefined();
      expect(agent.category).toBe('universal');
    }
  });

  it('every optional agent in AGENT_CATALOG has a corresponding template', () => {
    for (const name of Object.keys(AGENT_CATALOG)) {
      const agent = allAgents.find((a) => a.name === name);
      expect(agent, `template missing for optional agent ${name}`).toBeDefined();
      expect(agent.category).not.toBe('universal');
    }
  });

  it('templates contain exactly 25 agents (6 universal + 19 optional)', () => {
    expect(allAgents).toHaveLength(25);
  });
});
