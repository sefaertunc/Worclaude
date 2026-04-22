import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/language.js';

describe('language detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lang-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects TypeScript from tsconfig.json', async () => {
    await fs.writeJson(path.join(dir, 'tsconfig.json'), { compilerOptions: {} });
    const results = await detect(dir);
    expect(results.find((r) => r.value === 'TypeScript')).toBeDefined();
  });

  it('detects JavaScript from jsconfig.json', async () => {
    await fs.writeJson(path.join(dir, 'jsconfig.json'), {});
    const results = await detect(dir);
    expect(results.find((r) => r.value === 'JavaScript')).toBeDefined();
  });

  it('detects Python from pyproject.toml', async () => {
    await fs.writeFile(path.join(dir, 'pyproject.toml'), '[project]\nname="x"\n');
    const results = await detect(dir);
    expect(results.find((r) => r.value === 'Python')).toBeDefined();
  });

  it('detects Rust from Cargo.toml', async () => {
    await fs.writeFile(path.join(dir, 'Cargo.toml'), '[package]\nname="x"\n');
    const results = await detect(dir);
    expect(results.find((r) => r.value === 'Rust')).toBeDefined();
  });

  it('detects Go from go.mod', async () => {
    await fs.writeFile(path.join(dir, 'go.mod'), 'module example\n');
    const results = await detect(dir);
    expect(results.find((r) => r.value === 'Go')).toBeDefined();
  });

  it('detects Ruby from Gemfile', async () => {
    await fs.writeFile(path.join(dir, 'Gemfile'), "source 'https://rubygems.org'\n");
    const results = await detect(dir);
    expect(results.find((r) => r.value === 'Ruby')).toBeDefined();
  });

  it('detects multi-language projects', async () => {
    await fs.writeJson(path.join(dir, 'tsconfig.json'), {});
    await fs.writeFile(path.join(dir, 'pyproject.toml'), '[project]\nname="x"\n');
    const results = await detect(dir);
    const values = results.map((r) => r.value).sort();
    expect(values).toEqual(['Python', 'TypeScript']);
  });

  it('returns empty array on project with no language markers', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
