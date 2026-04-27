import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

const stdoutWrites = [];
vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
  stdoutWrites.push(typeof chunk === 'string' ? chunk : chunk.toString());
  return true;
});
vi.spyOn(console, 'log').mockImplementation(() => {});

import { observabilityCommand } from '../../src/commands/observability.js';

async function seed(tmpDir, file, entries) {
  const full = path.join(tmpDir, '.claude', 'observability', file);
  await fs.ensureDir(path.dirname(full));
  await fs.writeFile(full, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

describe('worclaude observability', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-obs-cmd-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    stdoutWrites.length = 0;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('emits markdown to stdout by default with empty-state placeholders', async () => {
    await observabilityCommand();
    const out = stdoutWrites.join('');
    expect(out).toContain('# Observability Report');
    expect(out).toContain('_No skill loads captured yet._');
    expect(out.endsWith('\n')).toBe(true);
  });

  it('emits JSON when --json is set', async () => {
    await seed(tmpDir, 'skill-loads.jsonl', [{ ts: '2026-04-27T10:00:00.000Z', skill: 'testing' }]);

    await observabilityCommand({ json: true });
    const out = stdoutWrites.join('');
    const parsed = JSON.parse(out);
    expect(parsed.skillStats[0]).toMatchObject({ key: 'testing', count: 1 });
  });

  it('writes to file when --out is set, not stdout', async () => {
    await seed(tmpDir, 'command-invocations.jsonl', [
      { ts: '2026-04-27T10:00:00.000Z', command: '/start' },
    ]);

    await observabilityCommand({ out: 'report.md' });

    expect(stdoutWrites.join('')).toBe('');
    const written = await fs.readFile(path.join(tmpDir, 'report.md'), 'utf8');
    expect(written).toContain('/start');
    expect(written).toContain('# Observability Report');
  });

  it('honors absolute --out paths', async () => {
    const outPath = path.join(tmpDir, 'subdir', 'report.md');
    await observabilityCommand({ out: outPath });
    expect(await fs.pathExists(outPath)).toBe(true);
  });

  it('combines --json and --out', async () => {
    await seed(tmpDir, 'skill-loads.jsonl', [{ ts: '2026-04-27T10:00:00.000Z', skill: 'testing' }]);
    await observabilityCommand({ json: true, out: 'r.json' });
    const written = await fs.readFile(path.join(tmpDir, 'r.json'), 'utf8');
    const parsed = JSON.parse(written);
    expect(parsed.skillStats[0].key).toBe('testing');
  });
});
