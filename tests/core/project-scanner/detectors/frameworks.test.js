import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/frameworks.js';

describe('frameworks detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'frameworks-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects Next.js and React from package.json', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { next: '14.2.3', react: '18.2.0' },
    });
    const results = await detect(dir);
    expect(results).toHaveLength(1);
    const names = results[0].value.map((v) => v.name);
    expect(names).toEqual(expect.arrayContaining(['Next.js', 'React']));
    const next = results[0].value.find((v) => v.name === 'Next.js');
    expect(next.version).toBe('14.2.3');
  });

  it('detects FastAPI from [project.dependencies] (PEP 621)', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[project]\nname="x"\ndependencies=["fastapi>=0.110"]\n`
    );
    const results = await detect(dir);
    expect(results[0].value.map((v) => v.name)).toContain('FastAPI');
  });

  it('detects FastAPI from [tool.poetry.dependencies]', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[tool.poetry]\nname="x"\nversion="0.1.0"\n[tool.poetry.dependencies]\npython="^3.11"\nfastapi="^0.110"\n`
    );
    const results = await detect(dir);
    expect(results[0].value.map((v) => v.name)).toContain('FastAPI');
  });

  it('detects from [dependency-groups] (PEP 735)', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[project]\nname="x"\ndependencies=[]\n[dependency-groups]\nweb=["fastapi"]\n`
    );
    const results = await detect(dir);
    expect(results[0].value.map((v) => v.name)).toContain('FastAPI');
  });

  it('detects from [tool.poetry.group.<name>.dependencies]', async () => {
    await fs.writeFile(
      path.join(dir, 'pyproject.toml'),
      `[tool.poetry]\nname="x"\nversion="0.1.0"\n[tool.poetry.dependencies]\npython="^3.11"\n[tool.poetry.group.web.dependencies]\nfastapi="^0.110"\n`
    );
    const results = await detect(dir);
    expect(results[0].value.map((v) => v.name)).toContain('FastAPI');
  });

  it('returns empty array when no known framework is present', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), { dependencies: { lodash: '4.0.0' } });
    const results = await detect(dir);
    expect(results).toEqual([]);
  });

  it('returns empty array when no manifest is present', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
