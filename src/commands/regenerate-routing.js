import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import {
  buildAgentRoutingSkill,
  regenerateAgentRoutingContent,
} from '../generators/agent-routing.js';
import { loadAgentsFromDir } from '../utils/agent-frontmatter.js';
import * as display from '../utils/display.js';

/**
 * Regenerate `.claude/skills/agent-routing/SKILL.md` from the project's
 * installed agent files. Preserves any user-authored prose that lives
 * outside the AUTO-GENERATED markers.
 *
 * @param {string} projectRoot
 * @returns {Promise<{regenerated: boolean, agentsDir: string, skillPath: string, count: number, reason?: string}>}
 */
export async function regenerateRoutingForProject(projectRoot) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const skillDir = path.join(projectRoot, '.claude', 'skills', 'agent-routing');
  const skillPath = path.join(skillDir, 'SKILL.md');

  const agents = await loadAgentsFromDir(agentsDir);
  if (agents.length === 0) {
    return {
      regenerated: false,
      agentsDir,
      skillPath,
      count: 0,
      reason: 'no agent files found',
    };
  }

  let existing = null;
  try {
    existing = await readFile(skillPath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const content = existing
    ? regenerateAgentRoutingContent(existing, agents)
    : buildAgentRoutingSkill(agents);

  await mkdir(skillDir, { recursive: true });
  await writeFile(skillPath, content, 'utf8');

  return {
    regenerated: true,
    agentsDir,
    skillPath,
    count: agents.length,
  };
}

export async function regenerateRoutingCommand() {
  const projectRoot = process.cwd();
  try {
    const result = await regenerateRoutingForProject(projectRoot);
    if (!result.regenerated) {
      display.warn(`Skipped: ${result.reason} at ${path.relative(projectRoot, result.agentsDir)}/`);
      return;
    }
    const rel = path.relative(projectRoot, result.skillPath);
    display.success(`Regenerated ${rel} from ${result.count} agent file(s).`);
  } catch (err) {
    display.error(`Failed to regenerate agent-routing skill: ${err.message}`);
    process.exitCode = 1;
  }
}
