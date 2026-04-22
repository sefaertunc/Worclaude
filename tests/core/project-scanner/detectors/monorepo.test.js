import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/monorepo.js';

describe('monorepo detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'monorepo-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects pnpm workspace', async () => {
    await fs.writeFile(path.join(dir, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
    await fs.ensureDir(path.join(dir, 'packages', 'app'));
    await fs.ensureDir(path.join(dir, 'packages', 'ui'));
    const results = await detect(dir);
    expect(results[0].value.tool).toBe('pnpm');
    expect(results[0].value.isMonorepo).toBe(true);
    expect(results[0].value.packagePaths.sort()).toEqual(['packages/app', 'packages/ui']);
  });

  it('detects npm/yarn workspaces from package.json', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      name: 'root',
      workspaces: ['apps/*', 'packages/*'],
    });
    await fs.ensureDir(path.join(dir, 'apps', 'web'));
    await fs.ensureDir(path.join(dir, 'packages', 'core'));
    const results = await detect(dir);
    expect(results[0].value.tool).toBe('npm-or-yarn');
    expect(results[0].value.packagePaths).toEqual(
      expect.arrayContaining(['apps/web', 'packages/core'])
    );
  });

  it('detects nx', async () => {
    await fs.writeFile(path.join(dir, 'nx.json'), '{}');
    const results = await detect(dir);
    expect(results[0].value.tool).toBe('nx');
  });

  it('detects turbo', async () => {
    await fs.writeFile(path.join(dir, 'turbo.json'), '{}');
    const results = await detect(dir);
    expect(results[0].value.tool).toBe('turbo');
  });

  it('returns empty array for non-monorepo projects', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), { name: 'single' });
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
