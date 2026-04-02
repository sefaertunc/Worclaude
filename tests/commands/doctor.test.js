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
    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(npm test)', 'Bash(git:*)'] },
        hooks: {
          PostCompact: [{ matcher: '', hooks: [{ type: 'command', command: 'echo compact' }] }],
          SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'echo start' }] }],
        },
      })
    );
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
    const claudeMdContent = opts.claudeMdSize
      ? `# CLAUDE.md\n\n${'x'.repeat(opts.claudeMdSize)}`
      : '# CLAUDE.md\n\nProject instructions.\n\n## Tech Stack\n\nNode.js\n\n## Commands\n\nnpm test\n\n## Rules\n\nFollow conventions.\n';
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
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
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
});
