import path from 'node:path';
import { AGENT_CATALOG } from '../data/agents.js';
import {
  fileExists,
  readFile,
  writeFile,
  dirExists,
  moveFile,
  listFiles,
  listFilesRecursive,
} from '../utils/file.js';
import { hashFile } from '../utils/hash.js';
import { WORKFLOW_REF_DIR } from './file-categorizer.js';

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

export function semverGreaterThan(a, b) {
  return semverLessThan(b, a);
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

// --- Workflow-ref relocation (v2.5.1) ---

const LEGACY_ROOT_REFS = ['CLAUDE.md.workflow-ref.md', 'AGENTS.md.workflow-ref'];

// Legacy ref files could only live inside these subdirs. Scoping the scan
// here instead of walking all of .claude/ matters because `sessions/` and
// `learnings/` can accumulate hundreds of files that will never be refs.
const LEGACY_REF_SUBDIRS = ['commands', 'agents', 'skills'];

function legacyClaudeRefTarget(relKey) {
  // relKey is relative to .claude/, e.g. "commands/sync.workflow-ref.md".
  // Lookahead `(?=\.[^.]+$)` ensures ".workflow-ref" is stripped only when
  // followed by a final extension — so "sync.workflow-ref.md" → "sync.md",
  // but a hypothetical "sync.workflow-ref" (no final ext) wouldn't match.
  const parts = relKey.split('/');
  const name = parts.pop();
  parts.push(name.replace(/\.workflow-ref(?=\.[^.]+$)/, ''));
  return path.join(WORKFLOW_REF_DIR, ...parts);
}

export async function migrateWorkflowRefLocation(projectRoot) {
  const report = { moved: 0, names: [], skipped: [] };
  const claudeDir = path.join(projectRoot, '.claude');
  const refDir = path.join(claudeDir, WORKFLOW_REF_DIR);

  // 1. Scan only the subdirs where legacy `.workflow-ref.md` siblings could
  //    live. Walking all of .claude/ would re-stat hundreds of session files
  //    on every upgrade for no benefit.
  for (const subdir of LEGACY_REF_SUBDIRS) {
    const scanRoot = path.join(claudeDir, subdir);
    if (!(await dirExists(scanRoot))) continue;

    const allFiles = await listFilesRecursive(scanRoot);
    for (const fp of allFiles) {
      const rel = path.relative(claudeDir, fp).split(path.sep).join('/');
      if (!rel.endsWith('.workflow-ref.md')) continue;

      const target = path.join(claudeDir, legacyClaudeRefTarget(rel));
      if (await fileExists(target)) {
        report.skipped.push(rel);
        continue;
      }
      await moveFile(fp, target);
      report.moved++;
      report.names.push(rel);
    }
  }

  // 2. Legacy root-level refs (CLAUDE.md.workflow-ref.md, AGENTS.md.workflow-ref).
  for (const legacyName of LEGACY_ROOT_REFS) {
    const src = path.join(projectRoot, legacyName);
    if (!(await fileExists(src))) continue;

    const original = legacyName.replace(/\.workflow-ref(?:\.md)?$/, '');
    const target = path.join(refDir, original);
    if (await fileExists(target)) {
      report.skipped.push(legacyName);
      continue;
    }
    await moveFile(src, target);
    report.moved++;
    report.names.push(legacyName);
  }

  return report;
}
