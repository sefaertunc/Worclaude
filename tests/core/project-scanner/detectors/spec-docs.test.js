import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/spec-docs.js';

describe('spec-docs detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'specdocs-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('finds PRD/SPEC/REQUIREMENTS files at project root', async () => {
    await fs.writeFile(path.join(dir, 'PRD.md'), '# Product Requirements\n');
    await fs.writeFile(path.join(dir, 'SPEC.md'), '# Technical Spec\n');
    const results = await detect(dir);
    const paths = results[0].value.map((d) => d.path).sort();
    expect(paths).toEqual(['PRD.md', 'SPEC.md']);
  });

  it('reads first H1 as firstHeading', async () => {
    await fs.writeFile(path.join(dir, 'SPEC.md'), '# Technical Spec\n\nBody\n');
    const results = await detect(dir);
    expect(results[0].value[0].firstHeading).toBe('Technical Spec');
  });

  it('walks docs/ up to depth 3', async () => {
    await fs.ensureDir(path.join(dir, 'docs', 'guide'));
    await fs.writeFile(path.join(dir, 'docs', 'getting-started.md'), '# Getting Started\n');
    await fs.writeFile(path.join(dir, 'docs', 'guide', 'intro.md'), '# Intro\n');
    const results = await detect(dir);
    const paths = results[0].value.map((d) => d.path).sort();
    expect(paths).toEqual(['docs/getting-started.md', 'docs/guide/intro.md']);
  });

  it('excludes node_modules and .git', async () => {
    await fs.ensureDir(path.join(dir, 'docs'));
    await fs.ensureDir(path.join(dir, 'node_modules', 'foo', 'docs'));
    await fs.writeFile(path.join(dir, 'docs', 'real.md'), '# Real\n');
    await fs.writeFile(path.join(dir, 'node_modules', 'foo', 'docs', 'fake.md'), '# Fake\n');
    const results = await detect(dir);
    const paths = results[0].value.map((d) => d.path);
    expect(paths).toEqual(['docs/real.md']);
  });

  it('returns empty array when no docs are present', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
