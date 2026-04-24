import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const AGENTS_WITH_FRESHNESS_PREAMBLE = [
  'templates/agents/optional/quality/bug-fixer.md',
  'templates/agents/universal/verify-app.md',
  'templates/agents/universal/test-writer.md',
];

describe('worktree freshness preamble', () => {
  for (const relPath of AGENTS_WITH_FRESHNESS_PREAMBLE) {
    describe(relPath, () => {
      let content;

      beforeAll(async () => {
        content = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf8');
      });

      it('declares worktree isolation in its front-matter', () => {
        expect(content).toMatch(/^---\n[\s\S]*?^isolation:\s*worktree\s*$/m);
      });

      it('includes the Worktree freshness preamble header before any prose section', () => {
        const frontMatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
        expect(frontMatterMatch, 'front-matter block must be present').toBeTruthy();
        const afterFrontMatter = content.slice(frontMatterMatch[0].length);
        const preambleIdx = afterFrontMatter.indexOf('## Worktree freshness preamble');
        expect(preambleIdx).toBeGreaterThanOrEqual(0);
        const firstOtherHeader = afterFrontMatter.search(/\n## (?!Worktree freshness preamble)/);
        if (firstOtherHeader !== -1) {
          expect(preambleIdx).toBeLessThan(firstOtherHeader);
        }
      });

      it('instructs the agent to detect the parent branch via git worktree list', () => {
        expect(content).toContain('git worktree list --porcelain');
        expect(content).toContain('PARENT_BRANCH');
        expect(content).toContain('git reset --hard "origin/${PARENT_BRANCH}"');
      });

      it('instructs the agent to fetch origin before comparing refs', () => {
        expect(content).toContain('git fetch origin');
      });
    });
  }
});
