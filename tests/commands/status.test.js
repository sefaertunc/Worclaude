import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent } from '../../src/utils/hash.js';

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});

import { statusCommand } from '../../src/commands/status.js';

describe('status command', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-status-cmd-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('shows not installed when no workflow-meta.json', async () => {
    await statusCommand();
    // Should have shown "not installed" message (via console.log mock)
    expect(console.log).toHaveBeenCalled();
  });

  it('displays full status report with valid workflow', async () => {
    // Create a minimal workflow installation
    const skillContent = '# Testing skill';
    const skillHash = hashContent(skillContent);

    const meta = {
      version: '1.0.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: ['CLI tool'],
      techStack: ['node'],
      universalAgents: ['plan-reviewer', 'test-writer'],
      optionalAgents: ['bug-fixer'],
      useDocker: false,
      fileHashes: {
        'skills/testing.md': skillHash,
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'testing.md'), skillContent);
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(npm test)', '// dev tools', 'Bash(git:*)'] },
        hooks: {
          PostToolUse: [
            { matcher: 'Write|Edit', hooks: [{ type: 'command', command: 'echo test' }] },
          ],
        },
      })
    );

    await statusCommand();

    // Check console was called with relevant info
    const allOutput = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('1.0.0');
  });

  it('detects customized files', async () => {
    const originalContent = '# Original';
    const originalHash = hashContent(originalContent);

    const meta = {
      version: '1.0.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: [],
      techStack: [],
      universalAgents: [],
      optionalAgents: [],
      fileHashes: {
        'skills/testing.md': originalHash,
      },
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    // Write modified content (different from stored hash)
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'testing.md'), '# Modified');

    await statusCommand();

    const allOutput = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('skills/testing.md');
  });

  it('detects workflow-ref.md files as pending review', async () => {
    const meta = {
      version: '1.0.0',
      installedAt: '2026-03-24T12:00:00.000Z',
      lastUpdated: '2026-03-24T12:00:00.000Z',
      projectTypes: [],
      techStack: [],
      universalAgents: [],
      optionalAgents: [],
      fileHashes: {},
    };

    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills'));
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'workflow-meta.json'),
      JSON.stringify(meta, null, 2)
    );
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'testing.workflow-ref.md'), '# Ref');

    await statusCommand();

    const allOutput = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(allOutput).toContain('workflow-ref.md');
  });
});
