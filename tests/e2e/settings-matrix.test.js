import { describe, it, expect } from 'vitest';
import { buildSettingsJson } from '../../src/core/merger.js';
import { PROJECT_TYPES, TECH_STACKS, CATEGORY_RECOMMENDATIONS } from '../../src/data/agents.js';

/**
 * Template output validation matrix.
 * Tests all project type × tech stack combinations to verify:
 * - Settings merge produces valid JSON
 * - Permissions array is non-empty
 * - Hooks object is present
 * - Agent category recommendations exist for every project type
 */

const STACK_VALUES = TECH_STACKS.map((s) => s.value);

describe('Settings validation matrix', () => {
  describe('single-stack settings', () => {
    for (const stack of STACK_VALUES) {
      it(`produces valid settings for ${stack}`, async () => {
        const { settingsStr, settingsObject } = await buildSettingsJson([stack], false);

        // Valid JSON
        expect(() => JSON.parse(settingsStr)).not.toThrow();

        // Has permissions
        expect(settingsObject.permissions?.allow).toBeDefined();
        expect(settingsObject.permissions.allow.length).toBeGreaterThan(0);

        // Has hooks — 8 event types (PostToolUse, PostCompact, SessionStart,
        // PreCompact, Stop, UserPromptSubmit, Notification, SessionEnd)
        expect(settingsObject.hooks).toBeDefined();
        expect(Object.keys(settingsObject.hooks).length).toBe(8);
      });

      it(`produces valid settings for ${stack} + docker`, async () => {
        const { settingsStr, settingsObject } = await buildSettingsJson([stack], true);

        expect(() => JSON.parse(settingsStr)).not.toThrow();
        expect(settingsObject.permissions?.allow).toBeDefined();
        expect(settingsObject.permissions.allow.length).toBeGreaterThan(0);
      });
    }
  });

  describe('multi-stack settings', () => {
    const multiStackCombos = [
      ['python', 'node'],
      ['java', 'kotlin'],
      ['node', 'go', 'rust'],
      ['python', 'node', 'java'],
    ];

    for (const combo of multiStackCombos) {
      it(`merges [${combo.join(', ')}] without error`, async () => {
        const { settingsStr, settingsObject } = await buildSettingsJson(combo, false);

        expect(() => JSON.parse(settingsStr)).not.toThrow();
        expect(settingsObject.permissions?.allow).toBeDefined();

        // Multi-stack should have more permissions than base alone
        const baseResult = await buildSettingsJson(['other'], false);
        if (combo.every((c) => c !== 'other')) {
          expect(settingsObject.permissions.allow.length).toBeGreaterThan(
            baseResult.settingsObject.permissions.allow.length
          );
        }
      });
    }
  });

  describe('project type agent recommendations', () => {
    for (const projectType of PROJECT_TYPES) {
      it(`has agent recommendations for "${projectType}"`, () => {
        expect(CATEGORY_RECOMMENDATIONS[projectType]).toBeDefined();
        expect(CATEGORY_RECOMMENDATIONS[projectType].length).toBeGreaterThan(0);
      });
    }
  });

  describe('"Other / None" edge case', () => {
    it('handles "other" stack gracefully (base-only permissions)', async () => {
      const { settingsStr, settingsObject } = await buildSettingsJson(['other'], false);

      expect(() => JSON.parse(settingsStr)).not.toThrow();
      expect(settingsObject.permissions?.allow).toBeDefined();
      expect(settingsObject.permissions.allow.length).toBeGreaterThan(0);
    });

    it('handles "other" + docker', async () => {
      const { settingsStr, settingsObject } = await buildSettingsJson(['other'], true);

      expect(() => JSON.parse(settingsStr)).not.toThrow();
      expect(settingsObject.permissions?.allow).toBeDefined();
    });
  });

  describe('permission deduplication', () => {
    it('does not produce duplicate permissions in multi-stack merge', async () => {
      const { settingsObject } = await buildSettingsJson(['python', 'node'], false);
      const perms = settingsObject.permissions.allow;
      const unique = [...new Set(perms)];
      expect(perms.length).toBe(unique.length);
    });
  });
});
