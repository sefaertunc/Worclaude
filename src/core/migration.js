import path from 'node:path';
import { AGENT_CATALOG } from '../data/agents.js';
import { readFile, writeFile, dirExists, moveFile, listFiles } from '../utils/file.js';
import { hashFile } from '../utils/hash.js';

// --- Version comparison ---

export function semverLessThan(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return true;
    if ((pa[i] || 0) > (pb[i] || 0)) return false;
  }
  return false;
}

// --- Agent description lookup ---

const UNIVERSAL_AGENT_DESCRIPTIONS = {
  'plan-reviewer': 'Reviews implementation plans for specificity, gaps, and executability',
  'code-simplifier': 'Reviews changed code and simplifies overly complex implementations',
  'test-writer': 'Writes comprehensive, meaningful tests for recently changed code',
  'build-validator': 'Validates that the project builds and all tests pass',
  'verify-app':
    'Verifies the running application end-to-end — tests actual behavior, not just code reading',
};

function getAgentDescription(agentName) {
  if (UNIVERSAL_AGENT_DESCRIPTIONS[agentName]) {
    return UNIVERSAL_AGENT_DESCRIPTIONS[agentName];
  }
  if (AGENT_CATALOG[agentName]) {
    return AGENT_CATALOG[agentName].description;
  }
  return null;
}

// --- Item 14: Skill Format Migration ---

export async function migrateSkillFormat(projectRoot, meta) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const report = { migrated: 0, skipped: 0, names: [] };

  if (!(await dirExists(skillsDir))) return report;

  const files = await listFiles(skillsDir);
  const mdFiles = files.filter((f) => f.endsWith('.md') && !f.endsWith('.workflow-ref.md'));
  const refFiles = files.filter((f) => f.endsWith('.workflow-ref.md'));

  for (const file of mdFiles) {
    const skillName = file.replace(/\.md$/, '');
    const newDir = path.join(skillsDir, skillName);

    if (await dirExists(newDir)) {
      report.skipped++;
      continue;
    }

    await moveFile(path.join(skillsDir, file), path.join(newDir, 'SKILL.md'));

    // Move corresponding .workflow-ref.md if exists
    const refFile = `${skillName}.workflow-ref.md`;
    if (refFiles.includes(refFile)) {
      await moveFile(path.join(skillsDir, refFile), path.join(newDir, 'SKILL.workflow-ref.md'));
    }

    // Update meta hash keys
    if (meta?.fileHashes) {
      const oldKey = `skills/${file}`;
      const newKey = `skills/${skillName}/SKILL.md`;
      if (meta.fileHashes[oldKey] !== undefined) {
        meta.fileHashes[newKey] = meta.fileHashes[oldKey];
        delete meta.fileHashes[oldKey];
      }

      const oldRefKey = `skills/${refFile}`;
      const newRefKey = `skills/${skillName}/SKILL.workflow-ref.md`;
      if (meta.fileHashes[oldRefKey] !== undefined) {
        meta.fileHashes[newRefKey] = meta.fileHashes[oldRefKey];
        delete meta.fileHashes[oldRefKey];
      }
    }

    report.migrated++;
    report.names.push(skillName);
  }

  return report;
}

// --- Item 15: Agent Frontmatter Patch ---

export async function patchAgentDescriptions(projectRoot, meta, promptFn) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const report = { autoPatched: 0, prompted: 0, declined: 0, skipped: [] };

  if (!(await dirExists(agentsDir))) return report;

  const files = await listFiles(agentsDir);
  const mdFiles = files.filter((f) => f.endsWith('.md') && !f.endsWith('.workflow-ref.md'));

  for (const file of mdFiles) {
    const filePath = path.join(agentsDir, file);
    const content = await readFile(filePath);

    // Check if frontmatter exists
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) continue;

    // Skip if description already present
    if (/^description:\s*.+/m.test(frontmatterMatch[1])) continue;

    const agentName = file.replace(/\.md$/, '');
    const description = getAgentDescription(agentName);

    if (!description) {
      report.skipped.push(agentName);
      continue;
    }

    // Check if user has modified the file
    const storedHash = meta?.fileHashes?.[`agents/${file}`];
    const currentHash = await hashFile(filePath);
    const isModified = storedHash && currentHash !== storedHash;

    if (isModified && promptFn) {
      const confirmed = await promptFn(agentName);
      if (!confirmed) {
        report.declined++;
        continue;
      }
      report.prompted++;
    } else {
      report.autoPatched++;
    }

    // Insert description after name line
    const updated = content.replace(/^(name:\s*.+)$/m, `$1\ndescription: "${description}"`);
    await writeFile(filePath, updated);
  }

  return report;
}
