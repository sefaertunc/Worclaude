import fs from 'fs-extra';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

// Claude Code v2.1.101 documented hook events (closed set)
const VALID_HOOK_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'PreCompact',
  'PostCompact',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Notification',
  'PermissionRequest',
  'PermissionDenied',
  'SubagentStart',
  'SubagentStop',
  'Setup',
  'CwdChanged',
  'FileChanged',
  'WorktreeCreate',
  'WorktreeRemove',
  'TeammateIdle',
]);

// Models deprecated in favor of alias-only references (opus, sonnet, haiku)
const DEPRECATED_MODELS = new Set([
  'opus-4',
  'opus-4.1',
  'claude-3-opus',
  'claude-3-haiku',
  'claude-opus-4',
  'claude-opus-4-1',
]);

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

async function checkClaudeMdLineCount(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    return []; // Already covered by checkClaudeMd
  }
  try {
    const content = await readFile(claudeMdPath);
    const lines = content.split(/\r?\n/).length;
    const WARN_LINES = 150;
    const FAIL_LINES = 200;
    const detail = `CLAUDE.md is ${lines} lines. Recommended max: 200. Claude Code performance degrades with bloated context files. Move domain content to .claude/rules/ or .claude/skills/.`;

    if (lines > FAIL_LINES) {
      return [result(FAIL, `CLAUDE.md line count: ${lines}/200`, detail)];
    }
    if (lines > WARN_LINES) {
      return [result(WARN, `CLAUDE.md line count: ${lines}/200`, detail)];
    }
    return [result(PASS, `CLAUDE.md line count: ${lines}/200`, null)];
  } catch {
    return [];
  }
}

async function checkClaudeMdMemoryGuidance(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    return []; // Already covered by checkClaudeMd
  }
  try {
    const content = await readFile(claudeMdPath);
    const indicators = [
      'memory architecture',
      'native memory',
      '.claude/learnings',
      '[LEARN]',
      '/learn',
    ];
    const lower = content.toLowerCase();
    const hasGuidance = indicators.some((i) => lower.includes(i.toLowerCase()));
    if (hasGuidance) {
      return [result(PASS, 'CLAUDE.md memory guidance', null)];
    }
    return [
      result(
        WARN,
        'CLAUDE.md memory guidance',
        'CLAUDE.md has no memory architecture guidance. Auto-learnings may pollute this file. Run worclaude upgrade to add.'
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

async function readSettingsJson(projectRoot) {
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  if (!(await fileExists(settingsPath))) return null;
  try {
    return JSON.parse(await readFile(settingsPath));
  } catch {
    return null;
  }
}

async function checkHookEventNames(projectRoot) {
  const settings = await readSettingsJson(projectRoot);
  if (!settings) {
    return [result(WARN, 'Hook event names', 'settings.json missing or invalid')];
  }
  const events = Object.keys(settings.hooks ?? {});
  if (events.length === 0) {
    return [result(WARN, 'Hook event names', 'No hooks configured')];
  }
  const invalid = events.filter((e) => !VALID_HOOK_EVENTS.has(e));
  if (invalid.length === 0) {
    return [result(PASS, `Hook event names (${events.length} events)`, null)];
  }
  return invalid.map((name) =>
    result(
      FAIL,
      `Hook event: ${name}`,
      `Unknown hook event '${name}'. Check Claude Code docs for valid event names.`
    )
  );
}

function extractHookCommands(settings) {
  const out = [];
  for (const [event, arr] of Object.entries(settings.hooks ?? {})) {
    if (!Array.isArray(arr)) continue;
    for (const group of arr) {
      const inner = Array.isArray(group?.hooks) ? group.hooks : [];
      for (const h of inner) {
        if (h && typeof h === 'object') {
          out.push({ event, type: h.type, command: h.command, async: h.async === true });
        }
      }
    }
  }
  return out;
}

async function checkHookScriptFiles(projectRoot) {
  const settings = await readSettingsJson(projectRoot);
  if (!settings) return [];
  const entries = extractHookCommands(settings).filter((h) => h.type === 'command' && h.command);
  const pathRegex = /\.claude\/hooks\/[A-Za-z0-9._-]+\.(?:cjs|js|mjs|sh)\b/g;
  const referenced = new Set();
  for (const { command } of entries) {
    const matches = command.match(pathRegex);
    if (matches) for (const m of matches) referenced.add(m);
  }
  if (referenced.size === 0) {
    return [result(PASS, 'Hook script files (no file-based hooks)', null)];
  }
  const missing = [];
  for (const rel of referenced) {
    if (!(await fileExists(path.join(projectRoot, rel)))) {
      missing.push(rel);
    }
  }
  if (missing.length === 0) {
    return [result(PASS, `Hook script files (${referenced.size} referenced)`, null)];
  }
  return missing.map((rel) =>
    result(FAIL, 'Hook script', `Hook references '${rel}' but file does not exist`)
  );
}

async function checkKeyHookCoverage(projectRoot) {
  const settings = await readSettingsJson(projectRoot);
  if (!settings) {
    return [result(WARN, 'Key hook coverage', 'settings.json missing or invalid')];
  }
  const messages = {
    PreCompact: 'PreCompact hook missing — context may be lost during auto-compaction',
    UserPromptSubmit: 'UserPromptSubmit hook missing — correction detection disabled',
    Stop: 'Stop hook missing — learning capture disabled',
  };
  const results = [];
  for (const event of ['PreCompact', 'UserPromptSubmit', 'Stop']) {
    const arr = settings.hooks?.[event];
    if (Array.isArray(arr) && arr.length > 0) {
      results.push(result(PASS, `${event} hook`, null));
    } else {
      results.push(result(WARN, `${event} hook`, messages[event]));
    }
  }
  return results;
}

async function checkHookAsync(projectRoot) {
  const settings = await readSettingsJson(projectRoot);
  if (!settings) return [];
  const entries = extractHookCommands(settings);
  const asyncCandidateRegex = /\b(notify|notification|backup|log)\b/i;
  const warnings = [];
  for (const h of entries) {
    const isCandidate =
      h.event === 'Notification' ||
      h.event === 'SessionEnd' ||
      (h.command && asyncCandidateRegex.test(h.command));
    if (isCandidate && !h.async) {
      warnings.push(
        result(
          WARN,
          `Hook async: ${h.event}`,
          `Hook '${h.event}' should use async: true — it blocks Claude unnecessarily`
        )
      );
    }
  }
  if (warnings.length === 0) {
    return [result(PASS, 'Hook async flags', null)];
  }
  return warnings;
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

async function readAgentFrontmatters(projectRoot) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));
    const agents = [];
    for (const file of mdFiles) {
      const content = await readFile(path.join(agentsDir, file.name));
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      agents.push({ name: file.name, frontmatter: match ? match[1] : null });
    }
    return agents;
  } catch {
    return [];
  }
}

async function checkAgentDescription(projectRoot) {
  const agents = await readAgentFrontmatters(projectRoot);
  if (agents.length === 0) return [];

  const results = [];
  for (const { name, frontmatter } of agents) {
    if (!frontmatter) {
      results.push(
        result(FAIL, `agents/${name}`, 'No YAML frontmatter — agent is invisible to Claude Code')
      );
      continue;
    }

    const hasName = /^name:\s*.+/m.test(frontmatter);
    const hasDescription = /^description:\s*.+/m.test(frontmatter);

    if (!hasName) {
      results.push(result(FAIL, `agents/${name}`, 'Missing required "name" field in frontmatter'));
    } else if (!hasDescription) {
      results.push(
        result(
          FAIL,
          `agents/${name}`,
          'Missing required "description" field — agent is invisible to Claude Code\'s /agents and routing'
        )
      );
    }
  }

  if (results.length === 0) {
    results.push(
      result(PASS, `agents/ frontmatter (${agents.length} agents have required fields)`, null)
    );
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

const AGENT_OPTIONAL_FIELDS = [
  'model',
  'isolation',
  'maxTurns',
  'disallowedTools',
  'background',
  'memory',
  'skills',
  'initialPrompt',
  'criticalSystemReminder',
  'omitClaudeMd',
];

async function checkAgentCompleteness(projectRoot) {
  const agents = await readAgentFrontmatters(projectRoot);
  const withFrontmatter = agents.filter((a) => a.frontmatter);
  if (withFrontmatter.length === 0) return [];

  let totalFields = 0;
  const suggestions = [];

  for (const { name, frontmatter } of withFrontmatter) {
    let fieldCount = 0;
    for (const field of AGENT_OPTIONAL_FIELDS) {
      if (new RegExp(`^${field}:`, 'm').test(frontmatter)) fieldCount++;
    }
    totalFields += fieldCount;

    const hasDisallowed = /^disallowedTools:/m.test(frontmatter);
    const hasReminder = /^criticalSystemReminder:/m.test(frontmatter);
    if (hasDisallowed && !hasReminder) {
      suggestions.push(`${name}: read-only agent could benefit from criticalSystemReminder`);
    }
  }

  const totalPossible = withFrontmatter.length * AGENT_OPTIONAL_FIELDS.length;
  const pct = Math.round((totalFields / totalPossible) * 100);
  const results = [];

  if (pct >= 50) {
    results.push(
      result(
        PASS,
        `Agent enrichment: ${pct}% optional fields used across ${withFrontmatter.length} agents`,
        null
      )
    );
  } else {
    results.push(
      result(
        WARN,
        `Agent enrichment: ${pct}% optional fields used across ${withFrontmatter.length} agents`,
        'Run `worclaude upgrade` to add model, maxTurns, skills, and other metadata'
      )
    );
  }

  for (const s of suggestions) {
    results.push(result(WARN, s, null));
  }

  return results;
}

async function checkClaudeMdSections(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  const SECTION_THRESHOLD = 20000; // Only analyze sections if file > 20KB
  const results = [];

  try {
    const content = await readFile(claudeMdPath);
    if (content.length < SECTION_THRESHOLD) return results;

    // Split into ## sections
    const sections = [];
    const lines = content.split('\n');
    let currentHeading = '(top-level)';
    let currentLines = [];

    for (const line of lines) {
      const headingMatch = line.match(/^##\s+(.+)/);
      if (headingMatch) {
        if (currentLines.length > 0) {
          sections.push({ heading: currentHeading, size: currentLines.join('\n').length });
        }
        currentHeading = headingMatch[1];
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      sections.push({ heading: currentHeading, size: currentLines.join('\n').length });
    }

    // Sort by size, suggest extracting the top 3 sections > 2KB
    const large = sections.filter((s) => s.size > 2000).sort((a, b) => b.size - a.size);

    if (large.length > 0) {
      const top = large.slice(0, 3);
      const sectionList = top
        .map((s) => `"${s.heading}" (${(s.size / 1024).toFixed(1)}KB)`)
        .join(', ');
      results.push(
        result(
          WARN,
          `CLAUDE.md has large sections: ${sectionList}`,
          'Consider extracting to conditional skills with paths frontmatter to save context budget'
        )
      );
    }
  } catch {
    // Already covered by checkClaudeMd
  }

  return results;
}

async function checkAgentModels(projectRoot) {
  const agents = await readAgentFrontmatters(projectRoot);
  const withFrontmatter = agents.filter((a) => a.frontmatter);
  if (withFrontmatter.length === 0) return [];

  const warnings = [];
  for (const { name, frontmatter } of withFrontmatter) {
    const m = frontmatter.match(/^model:\s*["']?([^"'\n]+?)["']?\s*$/m);
    if (!m) continue;
    const model = m[1].trim();
    if (DEPRECATED_MODELS.has(model)) {
      warnings.push(
        result(
          WARN,
          `Agent model: ${name}`,
          `Agent '${name}' uses deprecated model '${model}'. Use 'opus', 'sonnet', or 'haiku' instead.`
        )
      );
    }
  }
  if (warnings.length === 0) {
    return [result(PASS, `Agent models (${withFrontmatter.length} agents scanned)`, null)];
  }
  return warnings;
}

async function checkAgentsMd(projectRoot) {
  const agentsMdPath = path.join(projectRoot, 'AGENTS.md');
  if (await fileExists(agentsMdPath)) {
    return result(PASS, 'AGENTS.md', null);
  }
  return result(
    WARN,
    'AGENTS.md',
    'AGENTS.md not found. This file enables cross-tool compatibility (Cursor, Codex, Copilot). Run worclaude upgrade to generate.'
  );
}

async function checkLearnings(projectRoot) {
  const learningsDir = path.join(projectRoot, '.claude', 'learnings');
  if (!(await fileExists(learningsDir))) {
    return [
      result(WARN, 'Learnings directory', '`.claude/learnings/` not found — run worclaude upgrade'),
    ];
  }
  const indexPath = path.join(learningsDir, 'index.json');
  if (!(await fileExists(indexPath))) {
    return [result(PASS, 'Learnings: 0 entries captured', null)];
  }
  let index;
  try {
    index = JSON.parse(await readFile(indexPath));
  } catch {
    return [
      result(FAIL, 'Learnings index', '`.claude/learnings/index.json` contains invalid JSON'),
    ];
  }
  const entries = Array.isArray(index?.learnings) ? index.learnings : [];
  const orphans = [];
  for (const entry of entries) {
    if (entry?.file && !(await fileExists(path.join(learningsDir, entry.file)))) {
      orphans.push(entry.file);
    }
  }
  if (orphans.length > 0) {
    return orphans.map((f) =>
      result(WARN, `Learnings entry: ${f}`, `Entry references missing file '${f}'`)
    );
  }
  return [result(PASS, `Learnings: ${entries.length} entries captured`, null)];
}

function isPathIgnored(projectRoot, relPath) {
  try {
    const r = spawnSync('git', ['check-ignore', '-q', relPath], { cwd: projectRoot });
    if (r.error) return null;
    // status 0 = ignored, 1 = not ignored, 128 = not a git repo
    if (r.status === 128) return null;
    return r.status === 0;
  } catch {
    return null;
  }
}

async function checkGitignore(projectRoot) {
  const checks = [
    {
      path: '.claude/sessions/',
      detail: 'Session files contain local context and should be gitignored',
    },
    {
      path: '.claude/learnings/',
      detail: 'Learnings are personal and should be gitignored',
    },
  ];
  const results = [];
  for (const c of checks) {
    const ignored = isPathIgnored(projectRoot, c.path);
    if (ignored === null) {
      return [
        result(
          WARN,
          'Gitignore check',
          'git check-ignore unavailable — install git or initialize the repo'
        ),
      ];
    }
    results.push(
      ignored
        ? result(PASS, `Gitignore: ${c.path}`, null)
        : result(WARN, `Gitignore: ${c.path}`, c.detail)
    );
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

function stripAnsi(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

export async function doctorCommand(options = {}) {
  const projectRoot = process.cwd();
  const version = await getPackageVersion();
  const jsonMode = !!options?.json;

  const allResults = [];
  const record = (category, r) => {
    const items = Array.isArray(r) ? r : r ? [r] : [];
    for (const item of items) {
      allResults.push({ category, ...item });
      if (!jsonMode) printResult(item);
    }
  };
  const section = (title) => {
    if (!jsonMode) display.barLine(display.white(title));
  };
  const spacer = () => {
    if (!jsonMode) display.newline();
  };

  if (!jsonMode) {
    display.newline();
    display.sectionHeader('WORCLAUDE DOCTOR');
    display.dim(`CLI version: v${version}`);
    display.newline();
  }

  // Core Files
  section('Core Files');
  const metaResult = await checkWorkflowMeta(projectRoot);
  record('core', metaResult);

  const meta = await readWorkflowMeta(projectRoot);

  record('core', await checkClaudeMd(projectRoot));
  record('core', await checkClaudeMdSize(projectRoot));
  record('core', await checkClaudeMdLineCount(projectRoot));
  record('core', await checkClaudeMdSections(projectRoot));
  record('core', await checkClaudeMdMemoryGuidance(projectRoot));
  record('core', await checkAgentsMd(projectRoot));
  record('core', await checkSettingsJson(projectRoot));
  record('core', await checkSessions(projectRoot));
  spacer();

  // Hooks
  section('Hooks');
  record('hooks', await checkHookEventNames(projectRoot));
  record('hooks', await checkKeyHookCoverage(projectRoot));
  record('hooks', await checkHookScriptFiles(projectRoot));
  record('hooks', await checkHookAsync(projectRoot));
  spacer();

  // Components
  section('Components');
  record('components', await checkAgents(projectRoot, meta));
  record('components', await checkAgentDescription(projectRoot));
  record('components', await checkCommands(projectRoot));
  record('components', await checkSkills(projectRoot));
  record('components', await checkSkillFormat(projectRoot));
  record('components', await checkAgentCompleteness(projectRoot));
  record('components', await checkAgentModels(projectRoot));
  spacer();

  // Documentation
  section('Documentation');
  record('docs', await checkDocSpecs(projectRoot));
  spacer();

  // Learnings
  section('Learnings');
  record('learnings', await checkLearnings(projectRoot));
  spacer();

  // Git Integration
  section('Git Integration');
  record('git', await checkGitignore(projectRoot));
  spacer();

  // Integrity
  section('Integrity');
  record('integrity', await checkHashIntegrity(projectRoot, meta));
  record('integrity', await checkPendingReviewFiles(projectRoot));
  spacer();

  // Exit code
  const fails = allResults.filter((r) => r.status === FAIL).length;
  const warns = allResults.filter((r) => r.status === WARN).length;
  process.exitCode = fails > 0 ? 2 : warns > 0 ? 1 : 0;

  if (jsonMode) {
    const installed = metaResult.status === PASS;
    const summary = { pass: 0, warn: 0, fail: 0 };
    const checks = allResults.map((r) => {
      summary[r.status] += 1;
      const out = {
        category: r.category,
        status: r.status,
        label: stripAnsi(r.label),
      };
      if (r.detail) out.detail = stripAnsi(r.detail);
      return out;
    });
    console.log(
      JSON.stringify(
        {
          version,
          path: projectRoot,
          timestamp: new Date().toISOString(),
          installed,
          summary,
          checks,
        },
        null,
        2
      )
    );
    return;
  }

  // Summary (text mode)
  if (metaResult.status === FAIL) {
    display.info('Workflow is not installed. Run `worclaude init` to set up.');
  } else {
    display.success('Doctor complete. Review any warnings above.');
  }
  display.newline();
}
