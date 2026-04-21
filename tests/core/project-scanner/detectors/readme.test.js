import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/readme.js';

describe('readme detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'readme-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('extracts description paragraph after H1', async () => {
    await fs.writeFile(
      path.join(dir, 'README.md'),
      '# My Project\n\nA tiny tool that does a thing with other things.\n\n## Installation\n\nRun `npm install`.\n'
    );
    const results = await detect(dir);
    expect(results[0].value.projectDescription).toBe(
      'A tiny tool that does a thing with other things.'
    );
    expect(results[0].value.setupInstructions).toContain('npm install');
    expect(results[0].confidence).toBe('medium');
  });

  it('strips leading badges before extracting description', async () => {
    await fs.writeFile(
      path.join(dir, 'README.md'),
      '# Proj\n\n![badge](https://img.shields.io/npm/v/x)\n\nThe actual description of the project goes here.\n'
    );
    const results = await detect(dir);
    expect(results[0].value.projectDescription).toBe(
      'The actual description of the project goes here.'
    );
  });

  it('strips HTML comments', async () => {
    await fs.writeFile(
      path.join(dir, 'README.md'),
      '# P\n\n<!-- comment -->\n\nDescription line here goes beyond twenty chars.\n'
    );
    const results = await detect(dir);
    expect(results[0].value.projectDescription).toBe(
      'Description line here goes beyond twenty chars.'
    );
  });

  it('returns null description when below 20 chars', async () => {
    await fs.writeFile(path.join(dir, 'README.md'), '# P\n\nShort.\n');
    const results = await detect(dir);
    expect(results[0].value.projectDescription).toBeNull();
  });

  it('matches "Getting Started" heading for setup extraction', async () => {
    await fs.writeFile(
      path.join(dir, 'README.md'),
      '# Proj\n\nDescription that is long enough here.\n\n## Getting Started\n\nClone the repo.\n\n## More\n'
    );
    const results = await detect(dir);
    expect(results[0].value.setupInstructions).toBe('Clone the repo.');
  });

  it('caps setup instructions at 2000 chars', async () => {
    const long = 'x'.repeat(3000);
    await fs.writeFile(
      path.join(dir, 'README.md'),
      `# Proj\n\nDescription ok here yes please xxxxxxxxxxxxxxx\n\n## Setup\n\n${long}\n`
    );
    const results = await detect(dir);
    expect(results[0].value.setupInstructions.length).toBeLessThanOrEqual(2000);
  });

  it('returns empty array when no README is present', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
