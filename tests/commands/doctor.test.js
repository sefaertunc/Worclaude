import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
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
    const agentsMdContent = '# AGENTS.md\n\nCross-tool agent config.\n';
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), agentsMdContent);
    fileHashes['root/AGENTS.md'] = hashContent(agentsMdContent);
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

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout || '').trim();
}

async function setupGitRepoWithOriginHead(
  tmpDir,
  { originHeadTarget, currentBranch, aheadOfOrigin = 0 }
) {
  git(tmpDir, ['init', '-q', '--initial-branch=main']);
  git(tmpDir, ['config', 'user.email', 'doctor-test@example.com']);
  git(tmpDir, ['config', 'user.name', 'doctor-test']);
  git(tmpDir, ['commit', '--allow-empty', '-q', '-m', 'initial']);
  const initialSha = git(tmpDir, ['rev-parse', 'HEAD']);

  git(tmpDir, ['update-ref', `refs/remotes/origin/${originHeadTarget}`, initialSha]);
  git(tmpDir, [
    'symbolic-ref',
    'refs/remotes/origin/HEAD',
    `refs/remotes/origin/${originHeadTarget}`,
  ]);

  if (currentBranch !== 'main') {
    git(tmpDir, ['checkout', '-q', '-b', currentBranch]);
  }
  if (currentBranch !== originHeadTarget) {
    git(tmpDir, ['update-ref', `refs/remotes/origin/${currentBranch}`, initialSha]);
  }

  for (let i = 0; i < aheadOfOrigin; i += 1) {
    git(tmpDir, ['commit', '--allow-empty', '-q', '-m', `ahead-${i}`]);
  }
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

  it('resolves root/ prefixed fileHashes entries to the project root, not .claude/', async () => {
    // Regression: checkHashIntegrity used to resolve every fileHashes entry
    // under .claude/, so root/AGENTS.md was looked up at .claude/root/AGENTS.md
    // and flagged as missing on every install.
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).not.toMatch(/File integrity: \d+\/\d+ files missing/);
    expect(output).toMatch(/File integrity: all \d+ files present/);
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
    expect(output).toContain('lacks memory-architecture guidance');
    expect(output).toContain('.claude/workflow-ref/CLAUDE.md');
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

  it('passes hook event names for Claude Code 2.1.114 additions', async () => {
    await scaffoldProject(tmpDir, {
      extraHooks: {
        TaskCompleted: [{ matcher: '', hooks: [{ type: 'command', command: 'echo done' }] }],
      },
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).not.toContain("Unknown hook event 'TaskCompleted'");
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

  // Key hook coverage — empty-array regression (Step-0 Fix 1)
  it('warns when Stop hook key is present but the array is empty', async () => {
    await scaffoldProject(tmpDir, {
      skipPhase2Hooks: true,
      extraHooks: { Stop: [] },
    });
    await doctorCommand();
    const output = getOutput();
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

  // SessionStart blocks by design — must not be flagged async even if the
  // command contains tokens like `console.log` that trip the async regex.
  it('does NOT flag SessionStart as needing async even when command contains "log"', async () => {
    await scaffoldProject(tmpDir, {
      extraHooks: {
        SessionStart: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node -e "console.log(\'session loaded\')"',
              },
            ],
          },
        ],
      },
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).not.toContain('Hook async: SessionStart');
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

  it('warns on agents using claude-sonnet-4 (retires 2026-06-15)', async () => {
    await scaffoldProject(tmpDir);
    const agentPath = path.join(tmpDir, '.claude', 'agents', `${UNIVERSAL_AGENTS[0]}.md`);
    await fs.writeFile(
      agentPath,
      `---\nname: ${UNIVERSAL_AGENTS[0]}\ndescription: test\nmodel: claude-sonnet-4\n---\n\n# body`
    );
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain("deprecated model 'claude-sonnet-4'");
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

  it('warns about ghost learnings files (on disk but not indexed)', async () => {
    await scaffoldProject(tmpDir, {
      learningsIndex: { learnings: [] },
    });
    const learningsDir = path.join(tmpDir, '.claude', 'learnings');
    await fs.writeFile(
      path.join(learningsDir, 'forgotten-rule.md'),
      '---\ncategory: forgotten\n---\n\n**Rule:** untracked'
    );

    await doctorCommand();

    const output = getOutput();
    expect(output).toContain('Learnings ghost file: forgotten-rule.md');
    expect(output).toContain('not referenced by index.json');
  });

  it('reports orphans AND ghosts together when both are present', async () => {
    await scaffoldProject(tmpDir, {
      learningsIndex: {
        learnings: [{ file: 'orphan.md', category: 'orphan', created: '2026-01-01' }],
      },
    });
    const learningsDir = path.join(tmpDir, '.claude', 'learnings');
    await fs.writeFile(path.join(learningsDir, 'ghost.md'), '# ghost');

    await doctorCommand();

    const output = getOutput();
    expect(output).toContain("Entry references missing file 'orphan.md'");
    expect(output).toContain('Learnings ghost file: ghost.md');
  });

  // Gitignore (Task 10) — tmpdir is not a git repo, so spawn returns status 128
  it('emits gitignore WARN when not in a git repo', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('git check-ignore unavailable');
  });

  // origin/HEAD base-branch check
  it('skips origin/HEAD check when not in a git repo', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('origin/HEAD check skipped');
    expect(output).not.toContain('ahead of origin/');
  });

  it('passes origin/HEAD when current branch matches the origin/HEAD target', async () => {
    await scaffoldProject(tmpDir);
    await setupGitRepoWithOriginHead(tmpDir, {
      originHeadTarget: 'main',
      currentBranch: 'main',
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain('matches current branch');
    expect(output).not.toContain('ahead of origin/');
  });

  it('passes origin/HEAD when current branch is not ahead of the target', async () => {
    await scaffoldProject(tmpDir);
    await setupGitRepoWithOriginHead(tmpDir, {
      originHeadTarget: 'main',
      currentBranch: 'develop',
      aheadOfOrigin: 0,
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain("current 'develop' not ahead");
    expect(output).not.toContain('ahead of origin/');
  });

  it('warns with set-head suggestion when current branch is ahead of origin/HEAD target', async () => {
    await scaffoldProject(tmpDir);
    await setupGitRepoWithOriginHead(tmpDir, {
      originHeadTarget: 'main',
      currentBranch: 'develop',
      aheadOfOrigin: 2,
    });
    await doctorCommand();
    const output = getOutput();
    expect(output).toContain("Current branch 'develop' is 2 commit(s) ahead of origin/main");
    expect(output).toContain('git remote set-head origin develop');
    expect(output).toContain('reversible');
  });

  // JSON output (Task 12)
  it('emits valid JSON with --json flag', async () => {
    await scaffoldProject(tmpDir);
    await doctorCommand({ json: true });
    // console.log is spied — in JSON mode exactly one call should fire (the payload).
    // Anything else means section headers / printResult lines leaked.
    const calls = console.log.mock.calls;
    expect(calls.length).toBe(1);
    const parsed = JSON.parse(calls[0][0]);
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

  // JSON output — negative path (Step-0 Fix 4)
  it('emits valid JSON for a missing-install project', async () => {
    // no scaffoldProject call — tmpDir is empty
    await doctorCommand({ json: true });
    const calls = console.log.mock.calls;
    expect(calls.length).toBe(1);
    const parsed = JSON.parse(calls[0][0]);
    expect(parsed.installed).toBe(false);
    expect(parsed.summary.fail).toBeGreaterThanOrEqual(1);
  });

  // Exit codes (Task 13, Step-0 Fix 2)
  it('FAIL cases produce exit code 2', async () => {
    await scaffoldProject(tmpDir, { skipAgents: true });
    await doctorCommand();
    expect(process.exitCode).toBe(2);
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
