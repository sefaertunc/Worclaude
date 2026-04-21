import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/package-manager.js';

async function makeTmpDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'pm-detector-'));
}

describe('package-manager detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects pnpm when pnpm-lock.yaml is present', async () => {
    await fs.writeFile(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    const results = await detect(dir);
    expect(results).toEqual([
      {
        field: 'packageManager',
        value: 'pnpm',
        confidence: 'high',
        source: 'pnpm-lock.yaml',
        candidates: null,
      },
    ]);
  });

  it('detects npm when only package-lock.json is present', async () => {
    await fs.writeFile(path.join(dir, 'package-lock.json'), '{}');
    const results = await detect(dir);
    expect(results).toHaveLength(1);
    expect(results[0].value).toBe('npm');
    expect(results[0].confidence).toBe('high');
  });

  it('returns medium confidence with candidates when multiple JS lockfiles are present', async () => {
    await fs.writeFile(path.join(dir, 'yarn.lock'), '');
    await fs.writeFile(path.join(dir, 'package-lock.json'), '{}');
    const results = await detect(dir);
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe('medium');
    expect(results[0].candidates).toEqual(expect.arrayContaining(['yarn', 'npm']));
  });

  it('returns separate results for different language groups', async () => {
    await fs.writeFile(path.join(dir, 'pnpm-lock.yaml'), '');
    await fs.writeFile(path.join(dir, 'poetry.lock'), '');
    const results = await detect(dir);
    expect(results).toHaveLength(2);
    const managers = results.map((r) => r.value).sort();
    expect(managers).toEqual(['pnpm', 'poetry']);
  });

  it('returns empty array on project with no lockfiles', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });

  it('detects cargo from Cargo.lock', async () => {
    await fs.writeFile(path.join(dir, 'Cargo.lock'), '');
    const results = await detect(dir);
    expect(results[0].value).toBe('cargo');
  });
});
