import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import detect from '../../../../src/core/project-scanner/detectors/external-apis.js';

describe('external-apis detector', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ext-api-detector-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('detects Stripe', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { stripe: '14.0.0' },
    });
    const results = await detect(dir);
    expect(results[0].value).toContain('Stripe');
  });

  it('detects scoped SDK groups (e.g. @aws-sdk/*)', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: { '@aws-sdk/client-s3': '3.0.0', '@aws-sdk/client-dynamodb': '3.0.0' },
    });
    const results = await detect(dir);
    expect(results[0].value).toContain('AWS');
  });

  it('detects multiple providers and deduplicates', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), {
      dependencies: {
        stripe: '14.0.0',
        twilio: '5.0.0',
        'posthog-js': '1.0.0',
        'posthog-node': '4.0.0',
      },
    });
    const results = await detect(dir);
    expect(results[0].value).toEqual(expect.arrayContaining(['Stripe', 'Twilio', 'PostHog']));
    const posthogCount = results[0].value.filter((s) => s === 'PostHog').length;
    expect(posthogCount).toBe(1);
  });

  it('returns empty array when no SDKs are present', async () => {
    await fs.writeJson(path.join(dir, 'package.json'), { dependencies: { lodash: '4.0.0' } });
    const results = await detect(dir);
    expect(results).toEqual([]);
  });
});
