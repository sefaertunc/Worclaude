import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETUP_MD_PATH = path.resolve(__dirname, '../../templates/commands/setup.md');

let setupMd;

beforeAll(async () => {
  setupMd = await fs.readFile(SETUP_MD_PATH, 'utf-8');
});

describe('templates/commands/setup.md — contract tests', () => {
  describe('fix S-14: schemaVersion + storage rule', () => {
    it('SCAN state spells out schemaVersion: 1 in a worked JSON example', () => {
      const scanSection = setupMd.split('### State 1 — SCAN')[1].split('### State 2')[0];
      expect(scanSection).toMatch(/"schemaVersion":\s*1/);
    });

    it('SCAN state uses --from-file (not --stdin) in the persist step', () => {
      const scanSection = setupMd.split('### State 1 — SCAN')[1].split('### State 2')[0];
      expect(scanSection).toMatch(/--from-file/);
    });

    it('CONFIRM_MEDIUM has an explicit "Storage rule" that forbids raw object values', () => {
      const mediumSection = setupMd.split('### State 3 — CONFIRM_MEDIUM')[1].split('###')[0];
      expect(mediumSection).toMatch(/Storage rule/);
      expect(mediumSection).toMatch(/MUST be a string/);
      expect(mediumSection).toMatch(/NEVER store the raw `item\.value` object/);
    });
  });

  describe('fix S-17: Detection-skip matrix', () => {
    it('declares a Detection-skip matrix section', () => {
      expect(setupMd).toMatch(/### Detection-skip matrix/);
    });

    it('lists the four conditionally-skipped questionIds', () => {
      const matrix = setupMd
        .split('### Detection-skip matrix')[1]
        .split('## Field rendering table')[0];
      expect(matrix).toMatch(/`story\.problem`/);
      expect(matrix).toMatch(/`arch\.classification`/);
      expect(matrix).toMatch(/`arch\.external_apis`/);
      expect(matrix).toMatch(/`workflow\.new_dev_steps`/);
    });

    it('INTERVIEW ENTRY protocol references the matrix before the already-answered skip check', () => {
      const section = setupMd.split('Shared ENTRY protocol for each INTERVIEW state:')[1];
      expect(section).toMatch(/Apply the \*\*Detection-skip matrix\*\*/);
      expect(section).toMatch(/auto-filled from/);
    });
  });

  describe('fix S-25: --from-file + worclaude permissions', () => {
    it('rule #5 whitelist uses --from-file with staging draft path', () => {
      expect(setupMd).toMatch(/--from-file \.claude\/cache\/setup-state\.draft\.json/);
    });

    it('rule #5 permits Write on the staging draft path', () => {
      const rule5 = setupMd.split('SCOPED TOOL WHITELIST')[1].split('NO MEMORY PRE-FILL')[0];
      expect(rule5).toMatch(/Write.*setup-state\.draft\.json/);
    });

    it('every setup-state save reference uses --from-file (not --stdin)', () => {
      const saveMatches = setupMd.match(/worclaude setup-state save[^`]*/g) || [];
      expect(saveMatches.length).toBeGreaterThan(0);
      for (const occurrence of saveMatches) {
        expect(occurrence).toMatch(/--from-file/);
        expect(occurrence).not.toMatch(/--stdin/);
      }
    });
  });

  describe('fix S-23: reply classification / anti-drift', () => {
    it('INTERVIEW ENTRY protocol defines explicit reply classification with OFF-TOPIC', () => {
      const section = setupMd.split('Shared ENTRY protocol for each INTERVIEW state:')[1];
      expect(section).toMatch(/Reply classification/);
      expect(section).toMatch(/OFF-TOPIC/);
      expect(section).toMatch(/MUST NOT record/);
      expect(section).toMatch(/MUST NOT advance/);
    });

    it('classification directs ambiguous replies to OFF-TOPIC not "accept as answer"', () => {
      const section = setupMd.split('Reply classification')[1].split('`skip` on a question')[0];
      expect(section).toMatch(/[Pp]refer off-topic when uncertain/);
    });
  });
});
