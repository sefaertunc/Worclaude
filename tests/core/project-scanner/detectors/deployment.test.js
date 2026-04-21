import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/deployment.js';

describe('deployment detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'deploy-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects Vercel from vercel.json', async () => {
    await fs.writeFile(path.join(dir, 'vercel.json'), '{}');
    const results = await detect(dir);
    expect(results[0].value).toBe('Vercel');
  });

  it('detects multiple deployment targets', async () => {
    await fs.writeFile(path.join(dir, 'Dockerfile'), 'FROM node\n');
    await fs.writeFile(path.join(dir, 'fly.toml'), 'app = "x"\n');
    const results = await detect(dir);
    const values = results.map((r) => r.value).sort();
    expect(values).toEqual(['Docker', 'Fly.io']);
  });

  it('detects Cloudflare Workers from wrangler.toml', async () => {
    await fs.writeFile(path.join(dir, 'wrangler.toml'), 'name = "x"\n');
    const results = await detect(dir);
    expect(results[0].value).toBe('Cloudflare Workers');
  });

  it('returns empty array with no deployment markers', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
