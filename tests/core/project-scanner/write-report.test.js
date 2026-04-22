import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { writeDetectionReport } from '../../../src/core/project-scanner/index.js';

function makeReport(overrides = {}) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-04-21T00:00:00.000Z',
    projectRoot: '/irrelevant',
    results: [],
    errors: [],
    ...overrides,
  };
}

describe('writeDetectionReport', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'write-report-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('writes the report to .claude/cache/detection-report.json', async () => {
    const written = await writeDetectionReport(makeReport(), dir);
    expect(written).toBe(path.join(dir, '.claude', 'cache', 'detection-report.json'));
    const raw = await fs.readFile(written, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.results).toEqual([]);
  });

  it('creates .claude/cache/ if absent', async () => {
    const cacheDir = path.join(dir, '.claude', 'cache');
    expect(await fs.pathExists(cacheDir)).toBe(false);
    await writeDetectionReport(makeReport(), dir);
    expect(await fs.pathExists(cacheDir)).toBe(true);
  });

  it('overwrites an existing report without prompt', async () => {
    await writeDetectionReport(makeReport({ generatedAt: 'first' }), dir);
    await writeDetectionReport(makeReport({ generatedAt: 'second' }), dir);
    const raw = await fs.readFile(
      path.join(dir, '.claude', 'cache', 'detection-report.json'),
      'utf-8'
    );
    expect(JSON.parse(raw).generatedAt).toBe('second');
  });

  it('returns the absolute path of the written file', async () => {
    const written = await writeDetectionReport(makeReport(), dir);
    expect(path.isAbsolute(written)).toBe(true);
  });

  it('rejects a report with the wrong schemaVersion', async () => {
    await expect(writeDetectionReport(makeReport({ schemaVersion: 99 }), dir)).rejects.toThrow(
      /schemaVersion/
    );
  });

  it('rejects a non-object report', async () => {
    await expect(writeDetectionReport(null, dir)).rejects.toThrow();
    await expect(writeDetectionReport('not a report', dir)).rejects.toThrow();
  });

  it('rejects a report missing results or errors', async () => {
    await expect(writeDetectionReport({ schemaVersion: 1, results: [] }, dir)).rejects.toThrow(
      /results and errors/
    );
  });
});
