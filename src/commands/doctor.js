import fs from 'fs-extra';
import path from 'node:path';
import { readWorkflowMeta, workflowMetaExists, getPackageVersion } from '../core/config.js';
import { hashFile } from '../utils/hash.js';
import { fileExists, readFile, listFilesRecursive } from '../utils/file.js';
import {
  UNIVERSAL_AGENTS,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
} from '../data/agents.js';
import * as display from '../utils/display.js';

// Check categories
const PASS = 'pass';
const WARN = 'warn';
const FAIL = 'fail';

function result(status, label, detail) {
  return { status, label, detail };
}

function printResult(r) {
  const icon =
    r.status === PASS
      ? display.green('✓')
      : r.status === WARN
        ? display.yellow('⚠')
        : display.red('✗');
  const text = r.status === PASS ? display.dimColor(r.label) : display.white(r.label);
  console.log(`  ${icon} ${text}`);
  if (r.detail && r.status !== PASS) {
    console.log(`    ${display.dimColor(r.detail)}`);
  }
}

async function checkWorkflowMeta(projectRoot) {
  if (!(await workflowMetaExists(projectRoot))) {
    return result(FAIL, 'workflow-meta.json', 'Missing — run `worclaude init` to create');
  }
  const meta = await readWorkflowMeta(projectRoot);
  if (!meta) {
    return result(FAIL, 'workflow-meta.json', 'Exists but contains invalid JSON');
  }
  if (!meta.version || !meta.projectTypes || !meta.techStack) {
    return result(
      WARN,
      'workflow-meta.json',
      'Missing required fields (version, projectTypes, or techStack)'
    );
  }
  return result(PASS, 'workflow-meta.json', null);
}

async function checkClaudeMd(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    return result(FAIL, 'CLAUDE.md', 'Missing — run `worclaude init` to create');
  }
  try {
    const content = await readFile(claudeMdPath);
    const lines = content.split('\n').length;
    if (lines < 10) {
      return result(
        WARN,
        'CLAUDE.md',
        `Only ${lines} lines — may be a stub. Run /setup to fill it in.`
      );
    }
    return result(PASS, 'CLAUDE.md', null);
  } catch {
    return result(FAIL, 'CLAUDE.md', 'Exists but could not be read');
  }
}

async function checkClaudeMdSize(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    return []; // Already covered by existing checkClaudeMd
  }
  try {
    const content = await readFile(claudeMdPath);
    const charCount = content.length;
    const WARN_THRESHOLD = 30000;
    const FAIL_THRESHOLD = 38000;
    const HARD_LIMIT = 40000;

    if (charCount > FAIL_THRESHOLD) {
      return [
        result(
          FAIL,
          `CLAUDE.md size: ${charCount.toLocaleString()} chars`,
          `Exceeds recommended limit (${FAIL_THRESHOLD.toLocaleString()}/${HARD_LIMIT.toLocaleString()}). Claude Code caps at ${HARD_LIMIT.toLocaleString()} chars. Move domain-specific content to conditional skills with paths frontmatter.`
        ),
      ];
    }
    if (charCount > WARN_THRESHOLD) {
      return [
        result(
          WARN,
          `CLAUDE.md size: ${charCount.toLocaleString()} chars`,
          `Approaching limit (${WARN_THRESHOLD.toLocaleString()}/${HARD_LIMIT.toLocaleString()}). Consider moving content to skills.`
        ),
      ];
    }
    return [
      result(
        PASS,
        `CLAUDE.md size: ${charCount.toLocaleString()} chars (limit: ${HARD_LIMIT.toLocaleString()})`,
        null
      ),
    ];
  } catch {
    return [];
  }
}

async function checkSettingsJson(projectRoot) {
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  if (!(await fileExists(settingsPath))) {
    return result(FAIL, 'settings.json', 'Missing — run `worclaude init` to create');
  }
  try {
    const raw = await readFile(settingsPath);
    const settings = JSON.parse(raw);

    const issues = [];
    if (!settings.permissions?.allow || settings.permissions.allow.length === 0) {
      issues.push('no permissions configured');
    }
    if (!settings.hooks || Object.keys(settings.hooks).length === 0) {
      issues.push('no hooks configured');
    }
    if (!settings.hooks?.PostCompact) {
      issues.push('missing PostCompact hook (context recovery after compaction)');
    }
    if (!settings.hooks?.SessionStart) {
      issues.push('missing SessionStart hook (session persistence)');
    }

    if (issues.length > 0) {
      return result(WARN, 'settings.json', issues.join('; '));
    }
    return result(PASS, 'settings.json', null);
  } catch {
    return result(FAIL, 'settings.json', 'Contains invalid JSON');
  }
}

async function checkAgents(projectRoot, meta) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const results = [];

  // Check universal agents
  for (const agent of UNIVERSAL_AGENTS) {
    const agentPath = path.join(agentsDir, `${agent}.md`);
    if (!(await fileExists(agentPath))) {
      results.push(result(FAIL, `agents/${agent}.md`, 'Missing universal agent'));
    }
  }

  // Check selected optional agents from meta
  if (meta?.optionalAgents) {
    for (const agent of meta.optionalAgents) {
      const agentPath = path.join(agentsDir, `${agent}.md`);
      if (!(await fileExists(agentPath))) {
        results.push(result(WARN, `agents/${agent}.md`, 'Selected optional agent is missing'));
      }
    }
  }

  if (results.length === 0) {
    const totalExpected = UNIVERSAL_AGENTS.length + (meta?.optionalAgents?.length || 0);
    results.push(result(PASS, `agents/ (${totalExpected} expected, all present)`, null));
  }

  return results;
}

async function checkAgentDescription(projectRoot) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const results = [];

  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(agentsDir, file.name);
      const content = await readFile(filePath);

      // Parse YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        results.push(
          result(
            FAIL,
            `agents/${file.name}`,
            'No YAML frontmatter — agent is invisible to Claude Code'
          )
        );
        continue;
      }

      const frontmatter = frontmatterMatch[1];
      const hasName = /^name:\s*.+/m.test(frontmatter);
      const hasDescription = /^description:\s*.+/m.test(frontmatter);

      if (!hasName) {
        results.push(
          result(FAIL, `agents/${file.name}`, 'Missing required "name" field in frontmatter')
        );
      } else if (!hasDescription) {
        results.push(
          result(
            FAIL,
            `agents/${file.name}`,
            'Missing required "description" field — agent is invisible to Claude Code\'s /agents and routing'
          )
        );
      }
    }

    if (results.length === 0 && mdFiles.length > 0) {
      results.push(
        result(PASS, `agents/ frontmatter (${mdFiles.length} agents have required fields)`, null)
      );
    }
  } catch {
    // agents/ doesn't exist — covered by existing component checks
  }

  return results;
}

async function checkCommands(projectRoot) {
  const commandsDir = path.join(projectRoot, '.claude', 'commands');
  const missing = [];

  for (const cmd of COMMAND_FILES) {
    const cmdPath = path.join(commandsDir, `${cmd}.md`);
    if (!(await fileExists(cmdPath))) {
      missing.push(cmd);
    }
  }

  if (missing.length === 0) {
    return [result(PASS, `commands/ (${COMMAND_FILES.length} expected, all present)`, null)];
  }
  return missing.map((cmd) => result(WARN, `commands/${cmd}.md`, 'Missing command'));
}

async function checkSkills(projectRoot) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const missing = [];
  const allExpected = [...UNIVERSAL_SKILLS, ...TEMPLATE_SKILLS, 'agent-routing'];

  for (const skill of allExpected) {
    const skillPath = path.join(skillsDir, skill, 'SKILL.md');
    if (!(await fileExists(skillPath))) {
      missing.push(skill);
    }
  }

  if (missing.length === 0) {
    return [result(PASS, `skills/ (${allExpected.length} expected, all present)`, null)];
  }
  return missing.map((s) => result(WARN, `skills/${s}/SKILL.md`, 'Missing skill'));
}

async function checkSkillFormat(projectRoot) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const results = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const flatMdFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name);

    if (flatMdFiles.length > 0) {
      results.push(
        result(
          FAIL,
          `skills/ has ${flatMdFiles.length} flat .md file(s)`,
          `Flat .md files in .claude/skills/ are invisible to Claude Code. Expected format: skill-name/SKILL.md. Run \`worclaude upgrade\` to migrate. Files: ${flatMdFiles.join(', ')}`
        )
      );
    }

    // Also check directory-format skills exist
    const skillDirs = entries.filter((e) => e.isDirectory());
    let validDirSkills = 0;
    for (const dir of skillDirs) {
      const skillMd = path.join(skillsDir, dir.name, 'SKILL.md');
      if (await fileExists(skillMd)) {
        validDirSkills++;
      }
    }

    if (validDirSkills > 0 && flatMdFiles.length === 0) {
      results.push(
        result(PASS, `skills/ format (${validDirSkills} directory-format skills)`, null)
      );
    }
  } catch {
    // skills/ doesn't exist — covered by existing component checks
  }

  return results;
}

async function checkHashIntegrity(projectRoot, meta) {
  if (!meta?.fileHashes || Object.keys(meta.fileHashes).length === 0) {
    return [result(WARN, 'File integrity', 'No file hashes in workflow-meta.json — cannot verify')];
  }

  let modified = 0;
  let missing = 0;
  let intact = 0;

  for (const [relPath, storedHash] of Object.entries(meta.fileHashes)) {
    const fullPath = path.join(projectRoot, '.claude', ...relPath.split('/'));
    if (!(await fileExists(fullPath))) {
      missing++;
    } else {
      const currentHash = await hashFile(fullPath);
      if (currentHash !== storedHash) {
        modified++;
      } else {
        intact++;
      }
    }
  }

  const total = Object.keys(meta.fileHashes).length;
  const results = [];

  if (missing > 0) {
    results.push(result(FAIL, `File integrity: ${missing}/${total} files missing`, null));
  }
  if (modified > 0) {
    results.push(
      result(PASS, `File integrity: ${modified}/${total} files customized (expected)`, null)
    );
  }
  if (results.length === 0) {
    results.push(
      result(PASS, `File integrity: all ${total} files present (${intact} intact)`, null)
    );
  }

  return results;
}

async function checkSessions(projectRoot) {
  const sessionsDir = path.join(projectRoot, '.claude', 'sessions');
  if (!(await fileExists(sessionsDir))) {
    return result(
      WARN,
      'sessions/',
      "Directory missing — session persistence won't work. Run `worclaude init` or create .claude/sessions/ manually."
    );
  }
  return result(PASS, 'sessions/', null);
}

async function checkDocSpecs(projectRoot) {
  const results = [];
  const progressPath = path.join(projectRoot, 'docs', 'spec', 'PROGRESS.md');
  const specPath = path.join(projectRoot, 'docs', 'spec', 'SPEC.md');

  if (!(await fileExists(progressPath))) {
    results.push(
      result(WARN, 'docs/spec/PROGRESS.md', 'Missing — /start and /sync depend on this')
    );
  }
  if (!(await fileExists(specPath))) {
    results.push(result(WARN, 'docs/spec/SPEC.md', 'Missing — plan-reviewer references this'));
  }

  if (results.length === 0) {
    results.push(result(PASS, 'docs/spec/ (PROGRESS.md + SPEC.md present)', null));
  }
  return results;
}

async function checkPendingReviewFiles(projectRoot) {
  const pending = [];
  try {
    const claudeDir = path.join(projectRoot, '.claude');
    const allFiles = await listFilesRecursive(claudeDir);
    for (const fp of allFiles) {
      const rel = path.relative(claudeDir, fp).split(path.sep).join('/');
      if (rel.endsWith('.workflow-ref.md')) {
        pending.push(rel);
      }
    }
  } catch {
    // .claude dir might not exist
  }

  const suggestionsPath = path.join(projectRoot, 'CLAUDE.md.workflow-suggestions');
  if (await fileExists(suggestionsPath)) {
    pending.push('CLAUDE.md.workflow-suggestions');
  }

  if (pending.length === 0) {
    return [result(PASS, 'No pending review files', null)];
  }
  return pending.map((f) => result(WARN, `Pending review: ${f}`, 'Merge or delete this file'));
}

export async function doctorCommand() {
  const projectRoot = process.cwd();
  const version = await getPackageVersion();

  display.newline();
  display.sectionHeader('WORCLAUDE DOCTOR');
  display.dim(`CLI version: v${version}`);
  display.newline();

  // Core files
  display.barLine(display.white('Core Files'));
  const metaResult = await checkWorkflowMeta(projectRoot);
  printResult(metaResult);

  const meta = await readWorkflowMeta(projectRoot);

  printResult(await checkClaudeMd(projectRoot));
  for (const r of await checkClaudeMdSize(projectRoot)) printResult(r);
  printResult(await checkSettingsJson(projectRoot));
  printResult(await checkSessions(projectRoot));
  display.newline();

  // Components
  display.barLine(display.white('Components'));
  for (const r of await checkAgents(projectRoot, meta)) printResult(r);
  for (const r of await checkAgentDescription(projectRoot)) printResult(r);
  for (const r of await checkCommands(projectRoot)) printResult(r);
  for (const r of await checkSkills(projectRoot)) printResult(r);
  for (const r of await checkSkillFormat(projectRoot)) printResult(r);
  display.newline();

  // Docs
  display.barLine(display.white('Documentation'));
  for (const r of await checkDocSpecs(projectRoot)) printResult(r);
  display.newline();

  // Integrity
  display.barLine(display.white('Integrity'));
  for (const r of await checkHashIntegrity(projectRoot, meta)) printResult(r);
  for (const r of await checkPendingReviewFiles(projectRoot)) printResult(r);
  display.newline();

  // Summary
  if (metaResult.status === FAIL) {
    display.info('Workflow is not installed. Run `worclaude init` to set up.');
  } else {
    display.success('Doctor complete. Review any warnings above.');
  }
  display.newline();
}
