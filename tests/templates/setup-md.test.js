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

  describe('UX1: AskUserQuestion selectable prompts', () => {
    it('declares an Interaction mode contract', () => {
      expect(setupMd).toMatch(/### Interaction mode/);
      expect(setupMd).toMatch(/`selectable`/);
      expect(setupMd).toMatch(/`multi-selectable`/);
      expect(setupMd).toMatch(/`hybrid`/);
      expect(setupMd).toMatch(/`free-text`/);
    });

    it('declares a per-question interaction table covering all 10 non-default entries', () => {
      const section = setupMd.split('### Per-question interaction table')[1].split('###')[0];
      // selectable (5 entries)
      expect(section).toMatch(/`arch\.classification`\s*\|\s*selectable/);
      expect(section).toMatch(/`conventions\.errors`\s*\|\s*selectable/);
      expect(section).toMatch(/`conventions\.logging`\s*\|\s*selectable/);
      expect(section).toMatch(/`conventions\.api_format`\s*\|\s*selectable/);
      expect(section).toMatch(/`verification\.staging`\s*\|\s*selectable/);
      // multi-selectable (2 entries)
      expect(section).toMatch(/`arch\.external_apis`\s*\|\s*multi-selectable/);
      expect(section).toMatch(/`verification\.required_checks`\s*\|\s*multi-selectable/);
      // hybrid (3 entries)
      expect(section).toMatch(/`features\.core`\s*\|\s*hybrid/);
      expect(section).toMatch(/`features\.nice_to_have`\s*\|\s*hybrid/);
      expect(section).toMatch(/`features\.non_goals`\s*\|\s*hybrid/);
    });

    it('includes a fallback paragraph for Claude Code versions without AskUserQuestion', () => {
      const section = setupMd.split('### Interaction mode')[1].split('### Per-question')[0];
      expect(section).toMatch(/Fallback/);
      expect(section).toMatch(/numbered-list/);
    });

    it('INTERVIEW ENTRY protocol routes to AskUserQuestion for selectable modes', () => {
      const section = setupMd.split('Shared ENTRY protocol for each INTERVIEW state:')[1];
      expect(section).toMatch(/`interactionMode`/);
      expect(section).toMatch(/AskUserQuestion/);
    });

    it('rule #5 whitelist permits AskUserQuestion for INTERVIEW states only', () => {
      const rule5 = setupMd.split('SCOPED TOOL WHITELIST')[1].split('NO MEMORY PRE-FILL')[0];
      expect(rule5).toMatch(/AskUserQuestion/);
      expect(rule5).toMatch(/INTERVIEW states only/);
    });
  });

  describe('UX4: CONFIRM prompt redesign — consequence + help + no truncation', () => {
    it('CONFIRM_HIGH prompt template shows the "Will be saved as" sub-line per item', () => {
      const section = setupMd.split('### State 2 — CONFIRM_HIGH')[1].split('### State 3')[0];
      expect(section).toMatch(/→ Will be saved as: <target1>/);
      expect(section).toMatch(/→ Will be saved as: <target2>/);
    });

    it('CONFIRM_HIGH prompt offers `help` keyword and response parsing handles it', () => {
      const section = setupMd.split('### State 2 — CONFIRM_HIGH')[1].split('### State 3')[0];
      // `help` is the sole trigger; `?` is reserved by Claude Code's shortcut overlay
      expect(section).toMatch(/type "help"/);
      expect(section).toMatch(/^- `help` →/m);
      expect(section).toMatch(/without advancing state/);
      expect(section).not.toMatch(/`\?`\s*\|\s*`help`/);
      expect(section).not.toMatch(/"\?" for help/);
    });

    it('CONFIRM_MEDIUM shape A includes the "Will be saved as" sub-line on option 1', () => {
      const section = setupMd.split('### State 3 — CONFIRM_MEDIUM')[1].split('###')[0];
      // Shape A: item 1 has the consequence line
      expect(section).toMatch(/1\. <renderValue\(item\)>\s*\n\s*→ Will be saved as: <target>/);
    });

    it('CONFIRM_MEDIUM response parsing handles `help` keyword (not `?`)', () => {
      const section = setupMd.split('### State 3 — CONFIRM_MEDIUM')[1].split('###')[0];
      expect(section).toMatch(/^- `help` →/m);
      expect(section).not.toMatch(/`\?`\s*\|\s*`help`/);
    });

    it('Field rendering table no longer truncates readme to 80 chars', () => {
      const section = setupMd.split('## Field rendering table')[1].split('##')[0];
      expect(section).toMatch(/readme/);
      expect(section).toMatch(/rendered verbatim/);
      expect(section).not.toMatch(/truncated to 80 chars/);
    });

    it('declares a Field-help table covering detection fields and questionIds', () => {
      expect(setupMd).toMatch(/### Field-help table/);
      const section = setupMd
        .split('### Field-help table')[1]
        .split('## Field rendering table')[0];
      // Detection fields — spot check
      expect(section).toMatch(/`packageManager`/);
      expect(section).toMatch(/`readme`/);
      expect(section).toMatch(/`testing`/);
      // QuestionIds — spot check
      expect(section).toMatch(/`story\.audience`/);
      expect(section).toMatch(/`conventions\.errors`/);
      expect(section).toMatch(/`verification\.required_checks`/);
    });

    it('Field-help table specifies the help-render format', () => {
      const section = setupMd.split('### Field-help table')[1].split('## Field rendering table')[0];
      expect(section).toMatch(/Help — <formatField/);
      expect(section).toMatch(/What it is:/);
      expect(section).toMatch(/Will be saved as:/);
      expect(section).toMatch(/Example answer:/);
    });
  });
});
