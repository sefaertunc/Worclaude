import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent } from '../../src/utils/hash.js';
import {
  UNIVERSAL_AGENTS,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
} from '../../src/data/agents.js';

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});

import { doctorCommand } from '../../src/commands/doctor.js';

const ALL_SKILLS = [...UNIVERSAL_SKILLS, ...TEMPLATE_SKILLS, 'agent-routing'];

async function scaffoldProject(tmpDir, opts = {}) {
  const claudeDir = path.join(tmpDir, '.claude');
  const fileHashes = {};

  if (!opts.skipMeta) {
    await fs.ensureDir(claudeDir);
  }

  // Agents
  if (!opts.skipAgents) {
    await fs.ensureDir(path.join(claudeDir, 'agents'));
    for (const agent of UNIVERSAL_AGENTS) {
      let content;
      if (opts.agentsNoFrontmatter) {
        content = `# ${agent} agent`;
      } else if (opts.agentsNoDescription) {
        content = `---\nname: ${agent}\n---\n\n# ${agent} agent`;
      } else {
        content = `---\nname: ${agent}\ndescription: ${agent} agent\n---\n\n# ${agent} agent`;
      }
      await fs.writeFile(path.join(claudeDir, 'agents', `${agent}.md`), content);
      fileHashes[`agents/${agent}.md`] = hashContent(content);
    }
  }

  // Commands
  if (!opts.skipCommands) {
    await fs.ensureDir(path.join(claudeDir, 'commands'));
    for (const cmd of COMMAND_FILES) {
      const content = `# ${cmd} command`;
      await fs.writeFile(path.join(claudeDir, 'commands', `${cmd}.md`), content);
      fileHashes[`commands/${cmd}.md`] = hashContent(content);
    }
  }

  // Skills
  if (!opts.skipSkills) {
    await fs.ensureDir(path.join(claudeDir, 'skills'));
    for (const skill of ALL_SKILLS) {
      const content = `# ${skill} skill`;
      const skillDir = path.join(claudeDir, 'skills', skill);
      await fs.ensureDir(skillDir);
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), content);
      fileHashes[`skills/${skill}/SKILL.md`] = hashContent(content);
    }
  }

  // Flat skill files (triggers checkSkillFormat FAIL)
  if (opts.flatSkillFiles) {
    await fs.ensureDir(path.join(claudeDir, 'skills'));
    await fs.writeFile(path.join(claudeDir, 'skills', 'stray-skill.md'), '# stray skill');
  }

  // Sessions directory
  if (!opts.skipSessions) {
    await fs.ensureDir(path.join(claudeDir, 'sessions'));
  }

  // Settings
  if (opts.invalidSettings) {
    await fs.ensureDir(claudeDir);
    await fs.writeFile(path.join(claudeDir, 'settings.json'), '{bad json');
  } else if (!opts.skipSettings) {
    await fs.ensureDir(claudeDir);
    const hooks = {
      PostCompact: [{ matcher: '', hooks: [{ type: 'command', command: 'echo compact' }] }],
      SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'echo start' }] }],
    };
    if (!opts.skipPhase2Hooks) {
      hooks.PreCompact = [
        { matcher: '', hooks: [{ type: 'command', command: 'echo precompact' }] },
      ];
      hooks.UserPromptSubmit = [
        { matcher: '', hooks: [{ type: 'command', command: 'echo prompt' }] },
      ];
      hooks.Stop = [{ matcher: '', hooks: [{ type: 'command', command: 'echo stop' }] }];
    }
    if (opts.extraHooks) {
      Object.assign(hooks, opts.extraHooks);
    }
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(npm test)', 'Bash(git:*)'] },
        hooks,
      })
    );
  }

  // AGENTS.md at project root
  if (!opts.skipAgentsMd) {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS.md\n\nCross-tool agent config.\n');
  }

  // Learnings directory
  if (!opts.skipLearnings) {
    const learningsDir = path.join(claudeDir, 'learnings');
    await fs.ensureDir(learningsDir);
    await fs.writeFile(path.join(learningsDir, '.gitkeep'), '');
    if (opts.learningsIndex) {
      await fs.writeFile(
        path.join(learningsDir, 'index.json'),
        typeof opts.learningsIndex === 'string'
          ? opts.learningsIndex
          : JSON.stringify(opts.learningsIndex)
      );
    }
  }

  // workflow-meta.json
  if (!opts.skipMeta) {
    const meta = {
      version: '1.0.0',
      installedAt: '2026-04-01T12:00:00.000Z',
      lastUpdated: '2026-04-01T12:00:00.000Z',
      projectTypes: ['CLI tool'],
      techStack: ['node'],
      universalAgents: UNIVERSAL_AGENTS,
      optionalAgents: [],
      useDocker: false,
      fileHashes,
    };
    await fs.writeFile(path.join(claudeDir, 'workflow-meta.json'), JSON.stringify(meta, null, 2));
  }

  // CLAUDE.md
  if (!opts.skipClaudeMd) {
    let claudeMdContent;
    if (opts.claudeMdContent) {
      claudeMdContent = opts.claudeMdContent;
    } else if (opts.claudeMdLines) {
      claudeMdContent =
        '# CLAUDE.md\n\n' + Array.from({ length: opts.claudeMdLines }, () => 'line').join('\n');
    } else if (opts.claudeMdSize) {
      claudeMdContent = `# CLAUDE.md\n\n${'x'.repeat(opts.claudeMdSize)}`;
    } else {
      claudeMdContent =
        '# CLAUDE.md\n\nProject instructions.\n\n## Tech Stack\n\nNode.js\n\n## Commands\n\nnpm test\n\n## Memory Architecture\n\nCorrections via /learn.\n\n## Rules\n\nFollow conventions.\n';
    }
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), claudeMdContent);
  }

  // docs/spec
  if (!opts.skipDocs) {
    await fs.ensureDir(path.join(tmpDir, 'docs', 'spec'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'PROGRESS.md'), '# Progress');
    await fs.writeFile(path.join(tmpDir, 'docs', 'spec', 'SPEC.md'), '# Spec');
  }
}

function getOutput() {
  return console.log.mock.calls.map((c) => c.join(' ')).join('\n');
}

describe('doctor command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-doctor-cmd-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    process.exitCode = 0;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it('reports not installed when no workflow-meta.json', async () => {
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('not installed');
  });

  it('passes all checks for a properly scaffolded project', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('Doctor complete');
    expect(output).not.toContain('Missing');
  });

  it('detects missing universal agents', async () => {
    await scaffoldProject(tmpDir, { skipAgents: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('Missing universal agent');
  });

  it('detects missing commands', async () => {
    await scaffoldProject(tmpDir, { skipCommands: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('Missing command');
  });

  it('detects invalid settings.json', async () => {
    await scaffoldProject(tmpDir, { invalidSettings: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('invalid JSON');
  });

  it('detects missing sessions directory', async () => {
    await scaffoldProject(tmpDir, { skipSessions: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('sessions');
  });

  // CLAUDE.md size checks
  it('passes CLAUDE.md size check for small files', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('CLAUDE.md size');
    expect(output).toContain('limit');
  });

  it('warns when CLAUDE.md approaches size limit', async () => {
    await scaffoldProject(tmpDir, { claudeMdSize: 31000 });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('CLAUDE.md size');
    expect(output).toContain('Approaching limit');
  });

  it('fails when CLAUDE.md exceeds size limit', async () => {
    await scaffoldProject(tmpDir, { claudeMdSize: 39000 });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('CLAUDE.md size');
    expect(output).toContain('Exceeds recommended limit');
  });

  // Skill format checks
  it('passes skill format check for directory-format skills', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('skills/ format');
    expect(output).not.toContain('flat .md file');
  });

  it('detects flat skill files', async () => {
    await scaffoldProject(tmpDir, { flatSkillFiles: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('flat .md file');
  });

  // Agent description checks
  it('passes agent description check when all have frontmatter', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('agents/ frontmatter');
  });

  it('detects agents missing description field', async () => {
    await scaffoldProject(tmpDir, { agentsNoDescription: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('Missing required "description" field');
  });

  it('detects agents without frontmatter', async () => {
    await scaffoldProject(tmpDir, { agentsNoFrontmatter: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('No YAML frontmatter');
  });

  // CLAUDE.md line count (Task 1)
  it('fails CLAUDE.md line count when over 200 lines', async () => {
    await scaffoldProject(tmpDir, { claudeMdLines: 201 });
    await doctorCommand();
    const output = getOutput();
    expect(output).toMatch(/CLAUDE\.md is \d+ lines\. Recommended max: 200/);
  });

  it('passes CLAUDE.md line count for short files', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('CLAUDE.md line count:');
    expect(output).not.toContain('Recommended max: 200');
  });

  // CLAUDE.md memory guidance (Task 2)
  it('warns when CLAUDE.md lacks memory architecture guidance', async () => {
    await scaffoldProject(tmpDir, { claudeMdContent: '# CLAUDE.md\n\nJust rules, no guidance.\n' });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('no memory architecture guidance');
  });

  // Hook event name validation (Task 3)
  it('fails on unknown hook event names', async () => {
    await scaffoldProject(tmpDir, {
      extraHooks: {
        BogusEvent: [{ matcher: '', hooks: [{ type: 'command', command: 'echo bogus' }] }],
      },
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain("Unknown hook event 'BogusEvent'");
  });

  it('passes hook event names for default scaffold', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('Hook event names');
    expect(output).not.toContain('Unknown hook event');
  });

  // Hook script files (Task 4)
  it('fails when a hook references a missing script file', async () => {
    await scaffoldProject(tmpDir, {
      extraHooks: {
        PreToolUse: [
          {
            matcher: '',
            hooks: [{ type: 'command', command: 'node .claude/hooks/missing.cjs' }],
          },
        ],
      },
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain(".claude/hooks/missing.cjs' but file does not exist");
  });

  // Key hook coverage (Task 5)
  it('warns when PreCompact/UserPromptSubmit/Stop hooks are missing', async () => {
    await scaffoldProject(tmpDir, { skipPhase2Hooks: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('PreCompact hook missing');
    expect(output).toContain('UserPromptSubmit hook missing');
    expect(output).toContain('Stop hook missing');
  });

  // Hook async (Task 6)
  it('warns when Notification hook lacks async: true', async () => {
    await scaffoldProject(tmpDir, {
      extraHooks: {
        Notification: [
          { matcher: '', hooks: [{ type: 'command', command: 'echo notify' }] }, // no async
        ],
      },
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('should use async: true');
  });

  // Agent deprecated models (Task 7)
  it('warns on agents using deprecated model names', async () => {
    await scaffoldProject(tmpDir);
    // Overwrite one agent file with a deprecated model
    const agentPath = path.join(tmpDir, '.claude', 'agents', `${UNIVERSAL_AGENTS[0]}.md`);
    await fs.writeFile(
      agentPath,
      `---\nname: ${UNIVERSAL_AGENTS[0]}\ndescription: test\nmodel: opus-4.1\n---\n\n# body`
    );
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain("deprecated model 'opus-4.1'");
  });

  // AGENTS.md (Task 8)
  it('warns when AGENTS.md is missing', async () => {
    await scaffoldProject(tmpDir, { skipAgentsMd: true });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('AGENTS.md not found');
  });

  // Learnings (Task 9)
  it('fails when learnings index.json is invalid JSON', async () => {
    await scaffoldProject(tmpDir, { learningsIndex: '{' });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('learnings/index.json` contains invalid JSON');
  });

  it('passes learnings check for a healthy directory', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('Learnings: 0 entries captured');
  });

  // Gitignore (Task 10) — tmpdir is not a git repo, so spawn returns status 128
  it('emits gitignore WARN when not in a git repo', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('git check-ignore unavailable');
  });

  // JSON output (Task 12)
  it('emits valid JSON with --json flag', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand({ json: true });
    // console.log is spied — last call is the JSON payload
    const calls = console.log.mock.calls;
    const jsonCall = calls[calls.length - 1][0];
    const parsed = JSON.parse(jsonCall);
    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('path');
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('installed');
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('checks');
    expect(parsed.summary.pass + parsed.summary.warn + parsed.summary.fail).toBe(
      parsed.checks.length
    );
    expect(parsed.installed).toBe(true);
  });

  // Pre-Phase-2 scaffold backward-compat (additive policy)
  it('pre-Phase-2 scaffold produces WARN exit code (1), never FAIL (2)', async () => {
    await scaffoldProject(tmpDir, {
      skipPhase2Hooks: true,
      skipAgentsMd: true,
      skipLearnings: true,
    });
    await doctorCommand();
    // Exit code 1 means WARN-only; 2 means at least one FAIL.
    // Additive policy requires the three Phase 2 missing artifacts to produce WARN, not FAIL.
    expect(process.exitCode).toBe(1);
  });
});
