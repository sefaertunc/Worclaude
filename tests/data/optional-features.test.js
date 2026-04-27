import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import {
  OPTIONAL_FEATURES,
  getOptionalFeature,
  availableOptionalFeatures,
} from '../../src/data/optional-features.js';

describe('optional-features registry', () => {
  it('exports plugin-json and gtd-memory entries', () => {
    const ids = OPTIONAL_FEATURES.map((f) => f.id);
    expect(ids).toContain('plugin-json');
    expect(ids).toContain('gtd-memory');
  });

  it('every entry has the required shape', () => {
    for (const feature of OPTIONAL_FEATURES) {
      expect(typeof feature.id).toBe('string');
      expect(typeof feature.label).toBe('string');
      expect(typeof feature.extrasLabel).toBe('string');
      expect(typeof feature.successPath).toBe('string');
      expect(typeof feature.detect).toBe('function');
      expect(typeof feature.scaffold).toBe('function');
    }
  });

  it('getOptionalFeature returns the matching entry or null', () => {
    expect(getOptionalFeature('plugin-json')?.id).toBe('plugin-json');
    expect(getOptionalFeature('does-not-exist')).toBeNull();
  });
});

describe('availableOptionalFeatures', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-opt-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns all features when nothing is detected and nothing is opted out', async () => {
    const result = await availableOptionalFeatures(tmpDir, { optedOutFeatures: [] });
    expect(result.map((f) => f.id)).toEqual(['plugin-json', 'gtd-memory']);
  });

  it('skips features detected on disk', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude-plugin'));
    await fs.writeFile(path.join(tmpDir, '.claude-plugin', 'plugin.json'), '{}');

    const result = await availableOptionalFeatures(tmpDir, { optedOutFeatures: [] });
    expect(result.map((f) => f.id)).toEqual(['gtd-memory']);
  });

  it('skips features in optedOutFeatures', async () => {
    const result = await availableOptionalFeatures(tmpDir, {
      optedOutFeatures: ['plugin-json'],
    });
    expect(result.map((f) => f.id)).toEqual(['gtd-memory']);
  });

  it('returns empty when every feature is detected or opted out', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs', 'memory'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'memory', 'decisions.md'), '# decisions');
    const result = await availableOptionalFeatures(tmpDir, {
      optedOutFeatures: ['plugin-json'],
    });
    expect(result).toEqual([]);
  });

  it('treats missing meta as no opt-outs', async () => {
    const result = await availableOptionalFeatures(tmpDir, null);
    expect(result.map((f) => f.id)).toEqual(['plugin-json', 'gtd-memory']);
  });
});
