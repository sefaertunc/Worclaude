import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setupStateCommand } from '../../src/commands/setup-state.js';
import { saveSetupState, getStateFilePath, SCHEMA_VERSION } from '../../src/core/setup-state.js';
import { makeValidSetupState } from '../fixtures/setup-state-fixture.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = path.resolve(__dirname, '../../src/index.js');

function saveInProcess(tmpRoot, inputJson) {
  return setupStateCommand('save', {
    path: tmpRoot,
    stdin: true,
    inputStream: Readable.from([inputJson]),
  });
}

describe('setupStateCommand', () => {
  let logSpy;
  let errorSpy;
  let tmpRoot;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = 0;
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-state-cmd-'));
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = 0;
    await fs.remove(tmpRoot);
  });

  describe('show', () => {
    it('prints "no state" and exits 0 when file absent', async () => {
      await setupStateCommand('show', { path: tmpRoot });
      expect(process.exitCode).toBe(0);
      const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output.trim()).toBe('no state');
    });

    it('prints valid JSON matching the state on disk', async () => {
      const state = makeValidSetupState({ currentState: 'INTERVIEW_ARCH' });
      await saveSetupState(tmpRoot, state);
      await setupStateCommand('show', { path: tmpRoot });
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      const parsed = JSON.parse(output);
      expect(parsed.currentState).toBe('INTERVIEW_ARCH');
      expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    });

    it('exits 1 with a descriptive stderr when state file is corrupt', async () => {
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, '{ broken', 'utf-8');
      await setupStateCommand('show', { path: tmpRoot });
      expect(process.exitCode).toBe(1);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/Corrupt setup-state.json/);
    });
  });

  describe('save --stdin', () => {
    it('reads valid JSON from the input stream, writes it, and exits 0', async () => {
      const state = makeValidSetupState();
      await saveInProcess(tmpRoot, JSON.stringify(state));
      expect(process.exitCode).toBe(0);
      const filePath = getStateFilePath(tmpRoot);
      expect(await fs.pathExists(filePath)).toBe(true);
      const onDisk = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      expect(onDisk.currentState).toBe('CONFIRM_HIGH');
    });

    it('preserves startedAt from existing file on update', async () => {
      const originalStartedAt = '2026-04-01T12:00:00.000Z';
      await saveSetupState(tmpRoot, makeValidSetupState({ startedAt: originalStartedAt }));

      await saveInProcess(
        tmpRoot,
        JSON.stringify(
          makeValidSetupState({ startedAt: '2099-01-01T00:00:00.000Z', currentState: 'WRITE' })
        )
      );
      expect(process.exitCode).toBe(0);
      const onDisk = JSON.parse(await fs.readFile(getStateFilePath(tmpRoot), 'utf-8'));
      expect(onDisk.startedAt).toBe(originalStartedAt);
      expect(onDisk.currentState).toBe('WRITE');
    });

    it('refreshes updatedAt automatically', async () => {
      const stale = new Date('2000-01-01T00:00:00.000Z').toISOString();
      await saveInProcess(tmpRoot, JSON.stringify(makeValidSetupState({ updatedAt: stale })));
      expect(process.exitCode).toBe(0);
      const onDisk = JSON.parse(await fs.readFile(getStateFilePath(tmpRoot), 'utf-8'));
      expect(onDisk.updatedAt).not.toBe(stale);
      expect(Date.parse(onDisk.updatedAt)).toBeGreaterThan(Date.parse(stale));
    });

    it('exits 1 on malformed JSON', async () => {
      await saveInProcess(tmpRoot, '{ not valid json');
      expect(process.exitCode).toBe(1);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/invalid JSON/);
    });

    it('exits 1 on schema-invalid state (unknown currentState)', async () => {
      await saveInProcess(tmpRoot, JSON.stringify(makeValidSetupState({ currentState: 'HACKED' })));
      expect(process.exitCode).toBe(1);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/Unknown currentState/);
    });

    it('exits 1 on schema-invalid state (unknown interviewAnswers key)', async () => {
      await saveInProcess(
        tmpRoot,
        JSON.stringify(makeValidSetupState({ interviewAnswers: { 'bogus.key': 'x' } }))
      );
      expect(process.exitCode).toBe(1);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/unknown key/);
    });

    it('creates .claude/cache/ if absent', async () => {
      await saveInProcess(tmpRoot, JSON.stringify(makeValidSetupState()));
      expect(process.exitCode).toBe(0);
      expect(await fs.pathExists(path.join(tmpRoot, '.claude', 'cache'))).toBe(true);
    });

    it('exits 2 when invoked without --stdin', async () => {
      await setupStateCommand('save', { path: tmpRoot });
      expect(process.exitCode).toBe(2);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/save requires --stdin/);
    });

    // One end-to-end spawn test keeps the real CLI entry point and stdin
    // piping in coverage; the rest use the in-process inputStream seam.
    it('works end-to-end via the real CLI binary with piped stdin', () => {
      const result = spawnSync(
        'node',
        [CLI_ENTRY, 'setup-state', 'save', '--stdin', '--path', tmpRoot],
        { input: JSON.stringify(makeValidSetupState()), encoding: 'utf-8', timeout: 10000 }
      );
      expect(result.status).toBe(0);
      expect(fs.pathExistsSync(getStateFilePath(tmpRoot))).toBe(true);
    });
  });

  describe('save --from-file', () => {
    it('reads valid JSON from a file path, writes it, and exits 0', async () => {
      const state = makeValidSetupState({ currentState: 'INTERVIEW_FEATURES' });
      const inputPath = path.join(tmpRoot, 'input.json');
      await fs.writeFile(inputPath, JSON.stringify(state));

      await setupStateCommand('save', { path: tmpRoot, fromFile: inputPath });

      expect(process.exitCode).toBe(0);
      const onDisk = JSON.parse(await fs.readFile(getStateFilePath(tmpRoot), 'utf-8'));
      expect(onDisk.currentState).toBe('INTERVIEW_FEATURES');
    });

    it('exits 1 with path in error when the file does not exist', async () => {
      await setupStateCommand('save', {
        path: tmpRoot,
        fromFile: path.join(tmpRoot, 'does-not-exist.json'),
      });
      expect(process.exitCode).toBe(1);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/Error reading/);
      expect(errOutput).toMatch(/does-not-exist\.json/);
    });

    it('exits 1 with file name in JSON-parse error', async () => {
      const inputPath = path.join(tmpRoot, 'malformed.json');
      await fs.writeFile(inputPath, '{ not valid json');

      await setupStateCommand('save', { path: tmpRoot, fromFile: inputPath });

      expect(process.exitCode).toBe(1);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/invalid JSON on/);
      expect(errOutput).toMatch(/malformed\.json/);
    });

    it('rejects --stdin and --from-file together with exit 2', async () => {
      const inputPath = path.join(tmpRoot, 'input.json');
      await fs.writeFile(inputPath, '{}');

      await setupStateCommand('save', {
        path: tmpRoot,
        stdin: true,
        fromFile: inputPath,
        inputStream: Readable.from(['{}']),
      });

      expect(process.exitCode).toBe(2);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/mutually exclusive/);
    });

    it('end-to-end via the real CLI binary with --from-file', () => {
      const inputPath = path.join(tmpRoot, 'input.json');
      fs.writeFileSync(inputPath, JSON.stringify(makeValidSetupState()));
      const result = spawnSync(
        'node',
        [CLI_ENTRY, 'setup-state', 'save', '--from-file', inputPath, '--path', tmpRoot],
        { encoding: 'utf-8', timeout: 10000 }
      );
      expect(result.status).toBe(0);
      expect(fs.pathExistsSync(getStateFilePath(tmpRoot))).toBe(true);
    });
  });

  describe('reset', () => {
    it('deletes the state file and exits 0', async () => {
      await saveSetupState(tmpRoot, makeValidSetupState());
      const filePath = getStateFilePath(tmpRoot);
      expect(await fs.pathExists(filePath)).toBe(true);
      await setupStateCommand('reset', { path: tmpRoot });
      expect(process.exitCode).toBe(0);
      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('is idempotent (second run exits 0 without error)', async () => {
      await setupStateCommand('reset', { path: tmpRoot });
      expect(process.exitCode).toBe(0);
      await setupStateCommand('reset', { path: tmpRoot });
      expect(process.exitCode).toBe(0);
    });
  });

  describe('resume-info', () => {
    it('prints pre-formatted summary with minutes unit for fresh state', async () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await saveSetupState(
        tmpRoot,
        makeValidSetupState({ currentState: 'INTERVIEW_ARCH', updatedAt: recent })
      );
      await setupStateCommand('resume-info', { path: tmpRoot });
      expect(process.exitCode).toBe(0);
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      expect(output).toMatch(/^state: INTERVIEW_ARCH, age: \d+ minutes?, staleness: fresh$/);
    });

    // These tests bypass saveSetupState (which refreshes updatedAt) by writing
    // the state file directly, so we can assert against a known aged timestamp.
    it('uses hour unit when age is >= 90 minutes', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const state = makeValidSetupState({ updatedAt: threeHoursAgo });
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(state), 'utf-8');
      await setupStateCommand('resume-info', { path: tmpRoot });
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      expect(output).toMatch(/age: \d+ hours?/);
    });

    it('uses day unit when age >= 48 hours', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const state = makeValidSetupState({ updatedAt: threeDaysAgo });
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(state), 'utf-8');
      await setupStateCommand('resume-info', { path: tmpRoot });
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      expect(output).toMatch(/age: \d+ days?, staleness: stale/);
    });

    it('flags stale for state >= 24 hours old', async () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const state = makeValidSetupState({ updatedAt: twoDaysAgo });
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(state), 'utf-8');
      await setupStateCommand('resume-info', { path: tmpRoot });
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      expect(output).toMatch(/staleness: stale/);
    });

    it('prints "no state" and exits 0 when file absent', async () => {
      await setupStateCommand('resume-info', { path: tmpRoot });
      expect(process.exitCode).toBe(0);
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      expect(output).toBe('no state');
    });
  });

  describe('invalid args', () => {
    it('exits 2 on unknown subcommand', async () => {
      await setupStateCommand('nonsense', { path: tmpRoot });
      expect(process.exitCode).toBe(2);
      const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(errOutput).toMatch(/unknown subcommand/);
    });

    it('CLI rejects unknown subcommand with non-zero exit', () => {
      const result = spawnSync('node', [CLI_ENTRY, 'setup-state', 'bogus'], { encoding: 'utf-8' });
      expect(result.status).not.toBe(0);
    });
  });

  describe('--path flag', () => {
    it('is respected by show', async () => {
      await saveSetupState(tmpRoot, makeValidSetupState({ currentState: 'WRITE' }));
      await setupStateCommand('show', { path: tmpRoot });
      const output = logSpy.mock.calls
        .map((c) => c.join(' '))
        .join('\n')
        .trim();
      expect(JSON.parse(output).currentState).toBe('WRITE');
    });

    it('is respected by reset', async () => {
      await saveSetupState(tmpRoot, makeValidSetupState());
      await setupStateCommand('reset', { path: tmpRoot });
      expect(await fs.pathExists(getStateFilePath(tmpRoot))).toBe(false);
    });
  });
});
