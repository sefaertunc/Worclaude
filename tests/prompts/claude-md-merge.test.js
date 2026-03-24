import { describe, it, expect } from 'vitest';
import {
  detectMissingSections,
  generateWorkflowSuggestions,
} from '../../src/prompts/claude-md-merge.js';

describe('claude-md-merge', () => {
  describe('detectMissingSections', () => {
    it('returns all sections as missing for empty content', () => {
      const missing = detectMissingSections('# My Project\n\nSome description.');
      expect(missing).toContain('Key Files');
      expect(missing).toContain('Session Protocol');
      expect(missing).toContain('Critical Rules');
      expect(missing).toContain('Skills pointer');
      expect(missing).toContain('Gotchas section');
    });

    it('detects Key Files when PROGRESS.md is mentioned', () => {
      const content = '# Project\n\nSee PROGRESS.md for status.';
      const missing = detectMissingSections(content);
      expect(missing).not.toContain('Key Files');
    });

    it('detects Session Protocol section', () => {
      const content = '## Session Protocol\n**Start:** Read files.\n**End:** Update.';
      const missing = detectMissingSections(content);
      expect(missing).not.toContain('Session Protocol');
    });

    it('detects Session Protocol via Start/End patterns', () => {
      const content = '**Start:** Do this.\n**During:** Do that.\n**End:** Wrap up.';
      const missing = detectMissingSections(content);
      expect(missing).not.toContain('Session Protocol');
    });

    it('detects Critical Rules section', () => {
      const content = '## Critical Rules\n1. Do not guess.';
      const missing = detectMissingSections(content);
      expect(missing).not.toContain('Critical Rules');
    });

    it('detects Skills pointer via .claude/skills/', () => {
      const content = 'See `.claude/skills/` for guidance.';
      const missing = detectMissingSections(content);
      expect(missing).not.toContain('Skills pointer');
    });

    it('detects Gotchas section', () => {
      const content = '## Gotchas\n[Grows during development]';
      const missing = detectMissingSections(content);
      expect(missing).not.toContain('Gotchas section');
    });

    it('returns empty array when all sections present', () => {
      const content = [
        '## Key Files',
        '- PROGRESS.md',
        '## Session Protocol',
        '**Start:** Read. **End:** Update.',
        '## Critical Rules',
        '1. Test.',
        '## Skills (read on demand)',
        'See `.claude/skills/`',
        '## Gotchas',
        '[Grows]',
      ].join('\n');
      const missing = detectMissingSections(content);
      expect(missing).toEqual([]);
    });
  });

  describe('generateWorkflowSuggestions', () => {
    it('includes header and missing sections', () => {
      const existing = '# My Project\n\nDescription only.';
      const rendered = [
        '# CLAUDE.md',
        '',
        '## Key Files',
        '- PROGRESS.md',
        '',
        '## Session Protocol',
        '**Start:** Read PROGRESS.md.',
        '',
        '## Critical Rules',
        '1. Test before moving on.',
        '',
        '## Skills (read on demand, not upfront)',
        'See `.claude/skills/`',
        '',
        '## Gotchas',
        '[Grows during development]',
      ].join('\n');

      const suggestions = generateWorkflowSuggestions(existing, rendered);
      expect(suggestions).toContain('Claude Workflow — Suggested');
      expect(suggestions).toContain('Suggested: Key Files');
      expect(suggestions).toContain('Suggested: Session Protocol');
      expect(suggestions).toContain('Suggested: Critical Rules');
    });

    it('does not include sections that already exist', () => {
      const existing = '## Gotchas\n[stuff]\n## Critical Rules\n1. Do not guess.';
      const rendered = [
        '## Key Files',
        '- PROGRESS.md',
        '',
        '## Gotchas',
        '[Grows]',
        '',
        '## Critical Rules',
        '1. Test.',
      ].join('\n');

      const suggestions = generateWorkflowSuggestions(existing, rendered);
      expect(suggestions).not.toContain('Suggested: Gotchas');
      expect(suggestions).not.toContain('Suggested: Critical Rules');
      expect(suggestions).toContain('Suggested: Key Files');
    });

    it('says no suggestions needed when all sections present', () => {
      const content = [
        'PROGRESS.md',
        '## Session Protocol',
        '**Start:** x **End:** y',
        '## Critical Rules',
        '.claude/skills/',
        '## Gotchas',
      ].join('\n');
      const suggestions = generateWorkflowSuggestions(content, '');
      expect(suggestions).toContain('already has all recommended sections');
    });
  });
});
