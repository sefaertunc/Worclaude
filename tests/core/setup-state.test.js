import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  loadSetupState,
  saveSetupState,
  clearSetupState,
  isSetupStateStale,
  getStateFilePath,
  SCHEMA_VERSION,
} from '../../src/core/setup-state.js';
import { makeValidSetupState } from '../fixtures/setup-state-fixture.js';

function makeValidState(overrides = {}) {
  return makeValidSetupState({
    currentState: 'INTERVIEW_ARCH',
    highConfirmedAccepted: ['packageManager', 'language'],
    highConfirmedRejected: ['orm'],
    mediumResolved: { readme: 'A description' },
    interviewAnswers: {
      'story.audience': 'Developers',
      'arch.unchecked.orm': 'Prisma',
    },
    ...overrides,
  });
}

describe('setup-state module', () => {
  let tmpRoot;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-state-'));
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  describe('loadSetupState', () => {
    it('returns null when file absent', async () => {
      expect(await loadSetupState(tmpRoot)).toBeNull();
    });

    it('parses a valid state file correctly', async () => {
      const state = makeValidState();
      await saveSetupState(tmpRoot, state);
      const loaded = await loadSetupState(tmpRoot);
      expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.currentState).toBe('INTERVIEW_ARCH');
      expect(loaded.highConfirmedAccepted).toEqual(['packageManager', 'language']);
    });

    it('throws on corrupt JSON', async () => {
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, '{ not valid json', 'utf-8');
      await expect(loadSetupState(tmpRoot)).rejects.toThrow(/Corrupt setup-state.json/);
    });

    it('throws on unsupported schemaVersion', async () => {
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      const bogus = { ...makeValidState(), schemaVersion: 99 };
      await fs.writeFile(filePath, JSON.stringify(bogus), 'utf-8');
      await expect(loadSetupState(tmpRoot)).rejects.toThrow(/Unsupported schemaVersion: 99/);
    });

    it('throws on unknown currentState value', async () => {
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      const bogus = { ...makeValidState(), currentState: 'HACKED' };
      await fs.writeFile(filePath, JSON.stringify(bogus), 'utf-8');
      await expect(loadSetupState(tmpRoot)).rejects.toThrow(/Unknown currentState: HACKED/);
    });

    it('throws on interviewAnswers key outside the enumeration', async () => {
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      const bogus = {
        ...makeValidState(),
        interviewAnswers: { 'bogus.key': 'oops' },
      };
      await fs.writeFile(filePath, JSON.stringify(bogus), 'utf-8');
      await expect(loadSetupState(tmpRoot)).rejects.toThrow(/unknown key: bogus.key/);
    });

    it('throws on mis-routed unchecked prefix', async () => {
      // language routes to arch.unchecked, so workflow.unchecked.language is invalid
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      const bogus = {
        ...makeValidState(),
        interviewAnswers: { 'workflow.unchecked.language': 'TypeScript' },
      };
      await fs.writeFile(filePath, JSON.stringify(bogus), 'utf-8');
      await expect(loadSetupState(tmpRoot)).rejects.toThrow(/unknown key/);
    });

    it('throws on unchecked prefix with unknown field name', async () => {
      const filePath = getStateFilePath(tmpRoot);
      await fs.ensureDir(path.dirname(filePath));
      const bogus = {
        ...makeValidState(),
        interviewAnswers: { 'arch.unchecked.fakefield': 'value' },
      };
      await fs.writeFile(filePath, JSON.stringify(bogus), 'utf-8');
      await expect(loadSetupState(tmpRoot)).rejects.toThrow(/unknown key/);
    });
  });

  describe('saveSetupState', () => {
    it('creates .claude/cache/ if absent', async () => {
      await saveSetupState(tmpRoot, makeValidState());
      const cacheDir = path.join(tmpRoot, '.claude', 'cache');
      expect(await fs.pathExists(cacheDir)).toBe(true);
      expect(await fs.pathExists(getStateFilePath(tmpRoot))).toBe(true);
    });

    it('updates updatedAt automatically', async () => {
      const before = new Date('2026-01-01T00:00:00.000Z').toISOString();
      await saveSetupState(tmpRoot, makeValidState({ updatedAt: before }));
      const loaded = await loadSetupState(tmpRoot);
      expect(loaded.updatedAt).not.toBe(before);
      expect(Date.parse(loaded.updatedAt)).toBeGreaterThan(Date.parse(before));
    });

    it('preserves startedAt from an existing state file on re-save', async () => {
      const originalStartedAt = '2026-04-01T12:00:00.000Z';
      await saveSetupState(tmpRoot, makeValidState({ startedAt: originalStartedAt }));

      await saveSetupState(
        tmpRoot,
        makeValidState({ startedAt: '2099-01-01T00:00:00.000Z', currentState: 'WRITE' })
      );

      const loaded = await loadSetupState(tmpRoot);
      expect(loaded.startedAt).toBe(originalStartedAt);
      expect(loaded.currentState).toBe('WRITE');
    });

    it('uses input startedAt when no prior file exists', async () => {
      const freshStartedAt = '2026-04-20T08:00:00.000Z';
      await saveSetupState(tmpRoot, makeValidState({ startedAt: freshStartedAt }));
      const loaded = await loadSetupState(tmpRoot);
      expect(loaded.startedAt).toBe(freshStartedAt);
    });

    it('rejects invalid state objects (missing required fields)', async () => {
      const incomplete = { schemaVersion: SCHEMA_VERSION };
      await expect(saveSetupState(tmpRoot, incomplete)).rejects.toThrow();
    });

    it('rejects unknown currentState', async () => {
      await expect(
        saveSetupState(tmpRoot, makeValidState({ currentState: 'NOT_A_STATE' }))
      ).rejects.toThrow(/Unknown currentState/);
    });

    it('rejects non-string answer values', async () => {
      await expect(
        saveSetupState(tmpRoot, makeValidState({ interviewAnswers: { 'story.audience': 42 } }))
      ).rejects.toThrow();
    });

    it('rejects object values in mediumResolved with an actionable error', async () => {
      const stateWithObject = makeValidState({
        mediumResolved: {
          readme: { projectDescription: 'x', fullPath: 'README.md' },
        },
      });
      await expect(saveSetupState(tmpRoot, stateWithObject)).rejects.toThrow(
        /state\.mediumResolved\.readme must be a string .*got object.*CONFIRM_MEDIUM Storage rule/
      );
    });

    it('accepts <state>.unchecked.<field> keys per the routing table', async () => {
      const state = makeValidState({
        interviewAnswers: {
          'story.unchecked.readme': 'My description',
          'story.unchecked.specDocs': 'See docs/',
          'arch.unchecked.language': 'TypeScript',
          'arch.unchecked.frameworks': 'Next.js + React',
          'arch.unchecked.deployment': 'Vercel',
          'workflow.unchecked.scripts': 'pnpm dev',
          'workflow.unchecked.ci': 'GitHub Actions',
          'verification.unchecked.testing': 'Vitest',
        },
      });
      await expect(saveSetupState(tmpRoot, state)).resolves.toBeTruthy();
    });

    it('writes JSON with trailing newline', async () => {
      await saveSetupState(tmpRoot, makeValidState());
      const raw = await fs.readFile(getStateFilePath(tmpRoot), 'utf-8');
      expect(raw.endsWith('\n')).toBe(true);
    });
  });

  describe('clearSetupState', () => {
    it('deletes the file', async () => {
      await saveSetupState(tmpRoot, makeValidState());
      const filePath = getStateFilePath(tmpRoot);
      expect(await fs.pathExists(filePath)).toBe(true);
      await clearSetupState(tmpRoot);
      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('is a no-op when file absent', async () => {
      await expect(clearSetupState(tmpRoot)).resolves.toBeUndefined();
    });
  });

  describe('isSetupStateStale', () => {
    it('returns true for state older than 24h', () => {
      const state = makeValidState({
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });
      expect(isSetupStateStale(state)).toBe(true);
    });

    it('returns false for recent state', () => {
      const state = makeValidState({
        updatedAt: new Date(Date.now() - 60 * 1000).toISOString(),
      });
      expect(isSetupStateStale(state)).toBe(false);
    });

    it('respects custom staleHours argument', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(isSetupStateStale({ updatedAt: twoHoursAgo }, 1)).toBe(true);
      expect(isSetupStateStale({ updatedAt: twoHoursAgo }, 3)).toBe(false);
    });

    it('throws on missing updatedAt', () => {
      expect(() => isSetupStateStale({})).toThrow();
    });

    it('throws on invalid updatedAt', () => {
      expect(() => isSetupStateStale({ updatedAt: 'not a date' })).toThrow(/Invalid updatedAt/);
    });
  });
});
