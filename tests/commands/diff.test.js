import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent } from '../../src/utils/hash.js';
import { readTemplate } from '../../src/core/scaffolder.js';

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});

import { diffCommand } from '../../src/commands/diff.js';

describe('diff command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-diff-cmd-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('shows not installed when no workflow-meta.json', async () => {
    await diffCommand();
    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('not installed');
  });

  it('shows modified files', async () => {
    const original = '# Original';
    const hash = hashContent(original);

    const meta = {
      version: '1.0.0',
      fileHashes: { 'skills/custom-file.md': hash },
      optionalAgents: [],
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'custom-file.md'), '# Modified');

    await diffCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Modified');
    expect(output).toContain('custom-file.md');
  });

  it('shows deleted files', async () => {
    const meta = {
      version: '1.0.0',
      fileHashes: { 'agents/deleted-agent.md': 'somehash' },
      optionalAgents: [],
    };

    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );

    await diffCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Deleted');
    expect(output).toContain('deleted-agent.md');
  });

  it('shows user-added files', async () => {
    const meta = {
      version: '1.0.0',
      fileHashes: {},
      optionalAgents: [],
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'my-custom.md'), '# Custom');

    await diffCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Extra');
    expect(output).toContain('my-custom.md');
  });

  it('shows outdated files when template changed', async () => {
    // Store a fake old hash that differs from current template
    const fakeOldContent = 'old template content v0.9';
    const storedHash = hashContent(fakeOldContent);

    const meta = {
      version: '0.9.0',
      fileHashes: { 'agents/plan-reviewer.md': storedHash },
      optionalAgents: [],
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'agents'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    // Write same old content on disk (user didn't modify)
    await fs.writeFile(path.join(tmpDir, '.claude', 'agents', 'plan-reviewer.md'), fakeOldContent);

    await diffCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Outdated');
    expect(output).toContain('plan-reviewer.md');
  });

  it('shows unchanged count', async () => {
    // Install a file matching the current template exactly
    const templateContent = await readTemplate('commands/start.md');
    const hash = hashContent(templateContent);

    const meta = {
      version: '1.0.0',
      fileHashes: { 'commands/start.md': hash },
      optionalAgents: [],
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'commands'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(path.join(tmpDir, '.claude', 'commands', 'start.md'), templateContent);

    await diffCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Unchanged');
  });
});
