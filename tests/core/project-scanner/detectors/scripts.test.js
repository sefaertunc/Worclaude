import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/scripts.js';

describe('scripts detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scripts-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('identifies standard dev/test/build/lint scripts', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      scripts: {
        dev: 'next dev',
        test: 'vitest run',
        build: 'next build',
        lint: 'eslint .',
      },
    });
    const results = await detect(dir);
    const { value } = results[0];
    expect(value.dev).toEqual({ key: 'dev', command: 'next dev' });
    expect(value.test).toEqual({ key: 'test', command: 'vitest run' });
    expect(value.build).toEqual({ key: 'build', command: 'next build' });
    expect(value.lint).toEqual({ key: 'lint', command: 'eslint .' });
  });

  it('falls back to start and serve for dev', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), { scripts: { start: 'node .' } });
    const results = await detect(dir);
    expect(results[0].value.dev.key).toBe('start');
  });

  it('finds first test:* when no plain test script', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      scripts: { 'test:unit': 'vitest', 'test:e2e': 'playwright' },
    });
    const results = await detect(dir);
    expect(results[0].value.test.key).toBe('test:unit');
  });

  it('caps allScripts at 50 entries and flags truncation', async () => {
    const scripts = {};
    for (let i = 0; i < 60; i++) scripts[`task${i}`] = `echo ${i}`;
    await fs.writeJson(path.join(dir, 'package.json'), { scripts });
    const results = await detect(dir);
    expect(Object.keys(results[0].value.allScripts)).toHaveLength(50);
    expect(results[0].value.truncated).toBe(true);
  });

  it('reads Makefile targets', async () => {
    await fs.writeFile(path.join(dir, 'package.json'), '{}');
    await fs.writeFile(path.join(dir, 'Makefile'), 'build:\n\techo build\ntest:\n\techo test\n');
    const results = await detect(dir);
    expect(results[0].value.makefileTargets).toEqual(expect.arrayContaining(['build', 'test']));
  });

  it('ignores make variable assignments when reading Makefile', async () => {
    await fs.writeFile(path.join(dir, 'package.json'), '{}');
    await fs.writeFile(path.join(dir, 'Makefile'), 'CC := gcc\nbuild:\n\techo build\n');
    const results = await detect(dir);
    expect(results[0].value.makefileTargets).toEqual(['build']);
  });

  it('reads Taskfile.yml tasks', async () => {
    await fs.writeFile(path.join(dir, 'package.json'), '{}');
    await fs.writeFile(
      path.join(dir, 'Taskfile.yml'),
      `version: '3'\ntasks:\n  build:\n    cmds: [echo build]\n  test:\n    cmds: [echo test]\n`
    );
    const results = await detect(dir);
    expect(results[0].value.taskfileTasks).toEqual(expect.arrayContaining(['build', 'test']));
  });

  it('returns empty array when no manifest or task runner is present', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
