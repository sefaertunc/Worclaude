import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES_REQUIRING_BUMP_STRING = [
  'CLAUDE.md',
  'templates/commands/commit-push-pr.md',
  'templates/commands/sync.md',
  'templates/skills/universal/git-conventions.md',
  '.claude/commands/commit-push-pr.md',
  '.claude/commands/sync.md',
  '.claude/skills/git-conventions/SKILL.md',
  '.github/pull_request_template.md',
];

describe('Version bump declaration — cross-file consistency', () => {
  for (const relativePath of FILES_REQUIRING_BUMP_STRING) {
    it(`${relativePath} contains the literal "Version bump:" string`, () => {
      const absolutePath = resolve(process.cwd(), relativePath);
      const contents = readFileSync(absolutePath, 'utf8');
      expect(contents).toContain('Version bump:');
    });
  }
});
