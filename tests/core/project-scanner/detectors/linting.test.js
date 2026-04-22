import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/linting.js';

describe('linting detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lint-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects ESLint and Prettier from config files', async () => {
    await fs.writeFile(path.join(dir, 'eslint.config.js'), 'export default []\n');
    await fs.writeFile(path.join(dir, '.prettierrc'), '{}');
    const results = await detect(dir);
    expect(results).toHaveLength(1);
    expect(results[0].value).toEqual(expect.arrayContaining(['ESLint', 'Prettier']));
  });

  it('detects Biome from biome.json', async () => {
    await fs.writeFile(path.join(dir, 'biome.json'), '{}');
    const results = await detect(dir);
    expect(results[0].value).toContain('Biome');
  });

  it('detects Ruff from ruff.toml', async () => {
    await fs.writeFile(path.join(dir, 'ruff.toml'), 'line-length = 100\n');
    const results = await detect(dir);
    expect(results[0].value).toContain('Ruff');
  });

  it('detects Ruff from [tool.ruff] in pyproject.toml', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[project]\nname="x"\n[tool.ruff]\nline-length=100\n`
    );
    const results = await detect(dir);
    expect(results[0].value).toContain('Ruff');
  });

  it('returns empty array when no lint configs are present', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
