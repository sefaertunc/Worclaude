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
      const content = `# ${agent} agent`;
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
      await fs.writeFile(path.join(claudeDir, 'skills', `${skill}.md`), content);
      fileHashes[`skills/${skill}.md`] = hashContent(content);
    }
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
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      '# CLAUDE.md\n\nProject instructions.\n\n## Tech Stack\n\nNode.js\n\n## Commands\n\nnpm test\n\n## Rules\n\nFollow conventions.\n'
    );
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
});
