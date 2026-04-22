import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { scanCommand } from '../../src/commands/scan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures/scanner');

describe('scanCommand', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = 0;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = 0;
  });

  it('scans the given --path and writes the report file', async () => {
    const tmpCopy = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-cmd-'));
    try {
      await fs.copy(path.join(FIXTURES, 'rust-cli'), tmpCopy);
      await scanCommand({ path: tmpCopy });
      const reportPath = path.join(tmpCopy, '.claude', 'cache', 'detection-report.json');
      expect(await fs.pathExists(reportPath)).toBe(true);
      const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      expect(report.schemaVersion).toBe(1);
    } finally {
      await fs.remove(tmpCopy);
    }
  });

  it('prints JSON to stdout with --json and suppresses the summary', async () => {
    const tmpCopy = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-cmd-json-'));
    try {
      await fs.copy(path.join(FIXTURES, 'rust-cli'), tmpCopy);
      await scanCommand({ path: tmpCopy, json: true });
      const allOutput = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      // The JSON output should parse cleanly.
      const parsed = JSON.parse(allOutput.trim());
      expect(parsed.schemaVersion).toBe(1);
      // Only the JSON should be emitted — no summary sections.
      expect(allOutput).not.toContain('WORCLAUDE SCAN');
    } finally {
      await fs.remove(tmpCopy);
    }
  });

  it('suppresses summary with --quiet but still writes the cache file', async () => {
    const tmpCopy = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-cmd-quiet-'));
    try {
      await fs.copy(path.join(FIXTURES, 'rust-cli'), tmpCopy);
      await scanCommand({ path: tmpCopy, quiet: true });
      const allOutput = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(allOutput).toBe('');
      const reportPath = path.join(tmpCopy, '.claude', 'cache', 'detection-report.json');
      expect(await fs.pathExists(reportPath)).toBe(true);
    } finally {
      await fs.remove(tmpCopy);
    }
  });

  it('exits with code 1 and writes to stderr when the path does not exist', async () => {
    await scanCommand({ path: '/definitely/no/such/path/anywhere' });
    expect(process.exitCode).toBe(1);
    const errOutput = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(errOutput).toMatch(/projectRoot not found/);
  });

  it('defaults to process.cwd() when no path option is given', async () => {
    const tmpCopy = await fs.mkdtemp(path.join(os.tmpdir(), 'scan-cmd-cwd-'));
    const origCwd = process.cwd();
    try {
      await fs.copy(path.join(FIXTURES, 'rust-cli'), tmpCopy);
      process.chdir(tmpCopy);
      await scanCommand({});
      const reportPath = path.join(tmpCopy, '.claude', 'cache', 'detection-report.json');
      expect(await fs.pathExists(reportPath)).toBe(true);
    } finally {
      process.chdir(origCwd);
      await fs.remove(tmpCopy);
    }
  });
});
