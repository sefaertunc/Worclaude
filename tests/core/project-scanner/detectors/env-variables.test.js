import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/env-variables.js';

describe('env-variables detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'env-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('extracts variable names from .env.example', async () => {
    await fs.writeFile(
      path.join(dir, '.env.example'),
      '# Database\nDATABASE_URL=postgres://x\nSECRET_KEY=xxx\n'
    );
    const results = await detect(dir);
    expect(results[0].value.names).toEqual(['DATABASE_URL', 'SECRET_KEY']);
  });

  it('ignores comments and blank lines', async () => {
    await fs.writeFile(
      path.join(dir, '.env.example'),
      '\n# comment\n\nFOO=bar\n\n# another comment\nBAZ=qux\n'
    );
    const results = await detect(dir);
    expect(results[0].value.names).toEqual(['FOO', 'BAZ']);
  });

  it('strips export prefix', async () => {
    await fs.writeFile(path.join(dir, '.env.example'), 'export API_KEY=xxx\n');
    const results = await detect(dir);
    expect(results[0].value.names).toEqual(['API_KEY']);
  });

  it('infers Stripe service from dep and env prefix', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { stripe: '14.0.0' },
    });
    await fs.writeFile(
      path.join(dir, '.env.example'),
      'STRIPE_SECRET_KEY=sk_test\nDATABASE_URL=postgres://x\n'
    );
    const results = await detect(dir);
    expect(results[0].value.inferredServices).toContain('Stripe');
  });

  it('does not infer Stripe without the SDK dependency', async () => {
    await fs.writeFile(path.join(dir, '.env.example'), 'STRIPE_SECRET_KEY=sk_test\n');
    const results = await detect(dir);
    expect(results[0].value.inferredServices).toEqual([]);
  });

  it('prefers .env.example over other env files', async () => {
    await fs.writeFile(path.join(dir, '.env.example'), 'FROM_EXAMPLE=1\n');
    await fs.writeFile(path.join(dir, '.env.template'), 'FROM_TEMPLATE=1\n');
    const results = await detect(dir);
    expect(results[0].source).toBe('.env.example');
    expect(results[0].value.names).toEqual(['FROM_EXAMPLE']);
  });

  it('returns empty array when no env example file exists', async () => {
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
