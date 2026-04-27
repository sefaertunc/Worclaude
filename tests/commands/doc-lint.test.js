import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

import { docLintCommand } from '../../src/commands/doc-lint.js';

describe('worclaude doc-lint', () => {
  let tmpDir;
  let originalCwd;
  let originalExitCode;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-doc-lint-cmd-'));
    originalCwd = process.cwd();
    originalExitCode = process.exitCode;
    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('reports clean when no markers exist', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{"scripts": {}}');
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# Project');

    await docLintCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('clean');
    expect(process.exitCode).toBe(originalExitCode);
  });

  it('reports drift findings without changing exit code by default', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest' } })
    );
    await fs.ensureDir(path.join(tmpDir, 'tests'));
    await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      '## Tech Stack\n<!-- references package.json -->\n- Vitest (10 tests, 5 files)\n'
    );

    await docLintCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Drift');
    expect(output).toMatch(/CLAUDE\.md/);
    expect(output).toMatch(/claims 5 test files \(actual 1\)/);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it('exits non-zero on drift when --strict is passed', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest' } })
    );
    await fs.ensureDir(path.join(tmpDir, 'tests'));
    await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      '## Tech\n<!-- references package.json -->\n- Vitest (5 tests, 9 files)\n'
    );

    await docLintCommand({ strict: true });

    expect(process.exitCode).toBe(1);
  });

  it('does not set exit code when --strict and no drift', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest' } })
    );
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Just a heading');

    await docLintCommand({ strict: true });

    expect(process.exitCode).toBe(originalExitCode);
  });

  it('reports missing npm script in section text', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest' } })
    );
    await fs.writeFile(
      path.join(tmpDir, 'CLAUDE.md'),
      '## Verification\n<!-- references package.json -->\n`npm run unknown-script`\n'
    );

    await docLintCommand();

    const output = console.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toMatch(/unknown-script/);
  });
});
