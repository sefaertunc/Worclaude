import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/ci.js';

describe('ci detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ci-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects GitHub Actions and lists workflow files', async () => {
    const wf = path.join(dir, '.github', 'workflows');
    await fs.ensureDir(wf);
    await fs.writeFile(path.join(wf, 'ci.yml'), 'name: CI\n');
    await fs.writeFile(path.join(wf, 'release.yml'), 'name: Release\n');
    const results = await detect(dir);
    expect(results).toHaveLength(1);
    expect(results[0].value.provider).toBe('GitHub Actions');
    expect(results[0].value.workflows).toEqual(['ci.yml', 'release.yml']);
  });

  it('ignores non-yaml files in workflows directory', async () => {
    const wf = path.join(dir, '.github', 'workflows');
    await fs.ensureDir(wf);
    await fs.writeFile(path.join(wf, 'ci.yml'), 'name: CI\n');
    await fs.writeFile(path.join(wf, 'README.md'), '# workflows\n');
    const results = await detect(dir);
    expect(results[0].value.workflows).toEqual(['ci.yml']);
  });

  it('detects GitLab CI', async () => {
    await fs.writeFile(path.join(dir, '.gitlab-ci.yml'), 'test: {}\n');
    const results = await detect(dir);
    expect(results[0].value.provider).toBe('GitLab CI');
  });

  it('detects CircleCI', async () => {
    await fs.ensureDir(path.join(dir, '.circleci'));
    await fs.writeFile(path.join(dir, '.circleci', 'config.yml'), 'version: 2.1\n');
    const results = await detect(dir);
    expect(results[0].value.provider).toBe('CircleCI');
  });

  it('returns empty array when no CI is configured', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
