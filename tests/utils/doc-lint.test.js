import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  parseClaudeMdTestCountClaims,
  countTestCalls,
  countActualTestSuite,
  findReferencesMarkers,
  findMissingNpmScripts,
  lintRepo,
} from '../../src/utils/doc-lint.js';

describe('doc-lint', () => {
  describe('parseClaudeMdTestCountClaims', () => {
    it('finds a single test-count claim with the canonical format', () => {
      const claims = parseClaudeMdTestCountClaims('- **Testing:** Vitest (804 tests, 58 files)');
      expect(claims).toHaveLength(1);
      expect(claims[0]).toMatchObject({
        lineNumber: 1,
        claimedTests: 804,
        claimedFiles: 58,
      });
    });

    it('finds claims across multiple lines', () => {
      const content = [
        'Header',
        '- Vitest (804 tests, 58 files)',
        'Mid line',
        'npm test    # Run tests (804 tests, 58 files)',
      ].join('\n');
      const claims = parseClaudeMdTestCountClaims(content);
      expect(claims).toHaveLength(2);
      expect(claims[0].lineNumber).toBe(2);
      expect(claims[1].lineNumber).toBe(4);
    });

    it('matches singular variants ("1 test, 1 file")', () => {
      const claims = parseClaudeMdTestCountClaims('Vitest (1 test, 1 file)');
      expect(claims).toHaveLength(1);
      expect(claims[0]).toMatchObject({ claimedTests: 1, claimedFiles: 1 });
    });

    it('matches the "test files" variant', () => {
      const claims = parseClaudeMdTestCountClaims('Vitest (10 tests, 3 test files)');
      expect(claims).toHaveLength(1);
      expect(claims[0]).toMatchObject({ claimedTests: 10, claimedFiles: 3 });
    });

    it('returns an empty array when no claim is present', () => {
      expect(parseClaudeMdTestCountClaims('Nothing here')).toEqual([]);
    });

    it('returns an empty array for non-string or empty input', () => {
      expect(parseClaudeMdTestCountClaims(null)).toEqual([]);
      expect(parseClaudeMdTestCountClaims(undefined)).toEqual([]);
      expect(parseClaudeMdTestCountClaims('')).toEqual([]);
    });

    it('handles CRLF line endings without splitting incorrectly', () => {
      const content = 'Header\r\n- Vitest (5 tests, 2 files)\r\nFooter';
      const claims = parseClaudeMdTestCountClaims(content);
      expect(claims).toHaveLength(1);
      expect(claims[0].lineNumber).toBe(2);
    });
  });

  describe('countTestCalls', () => {
    it('counts top-level it() and test() invocations', () => {
      const content = [
        "it('a', () => {});",
        "test('b', () => {});",
        "  it('indented', () => {});",
      ].join('\n');
      expect(countTestCalls(content)).toBe(3);
    });

    it('counts it.each(...) and test.each(...) invocations', () => {
      const content = "it.each([1])('a', () => {});\ntest.each([1])('b', () => {});";
      expect(countTestCalls(content)).toBe(2);
    });

    it('counts indented it() inside describe() blocks but never describe() itself', () => {
      const content = [
        "describe('group', () => {",
        "  it('a', () => {});",
        "  it('b', () => {});",
        '});',
      ].join('\n');
      expect(countTestCalls(content)).toBe(2);
    });

    it('returns 0 for empty or non-string input', () => {
      expect(countTestCalls('')).toBe(0);
      expect(countTestCalls(null)).toBe(0);
      expect(countTestCalls(undefined)).toBe(0);
    });
  });

  describe('countActualTestSuite', () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-doc-lint-'));
    });

    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('returns zeros when tests/ does not exist', async () => {
      const counts = await countActualTestSuite(tmpDir);
      expect(counts).toEqual({ tests: 0, files: 0 });
    });

    it('counts test files and test cases recursively', async () => {
      await fs.ensureDir(path.join(tmpDir, 'tests', 'nested'));
      await fs.writeFile(
        path.join(tmpDir, 'tests', 'a.test.js'),
        "it('one', () => {});\nit('two', () => {});"
      );
      await fs.writeFile(
        path.join(tmpDir, 'tests', 'nested', 'b.test.js'),
        "test('alone', () => {});"
      );
      const counts = await countActualTestSuite(tmpDir);
      expect(counts).toEqual({ tests: 3, files: 2 });
    });

    it('skips non-test files in tests/', async () => {
      await fs.ensureDir(path.join(tmpDir, 'tests'));
      await fs.writeFile(path.join(tmpDir, 'tests', 'helper.js'), "it('not a test', () => {});");
      const counts = await countActualTestSuite(tmpDir);
      expect(counts).toEqual({ tests: 0, files: 0 });
    });
  });

  describe('findReferencesMarkers', () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-marker-'));
    });

    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('returns empty when no markers exist', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), '# Title\nNo markers.');
      expect(await findReferencesMarkers(tmpDir)).toEqual([]);
    });

    it('finds a marker and captures its source identifier', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '# Project\n\n## Tech Stack\n\n<!-- references package.json -->\n\n- Vitest (5 tests, 2 files)\n'
      );
      const markers = await findReferencesMarkers(tmpDir);
      expect(markers).toHaveLength(1);
      expect(markers[0]).toMatchObject({
        file: 'CLAUDE.md',
        source: 'package.json',
      });
      expect(markers[0].sectionContent).toContain('Vitest (5 tests, 2 files)');
    });

    it('discovers markers across multiple .md files recursively', async () => {
      await fs.ensureDir(path.join(tmpDir, 'docs'));
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '## A\n<!-- references package.json -->\nbody'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs', 'guide.md'),
        '## B\n<!-- references SPEC.md -->\nbody'
      );
      const markers = await findReferencesMarkers(tmpDir);
      expect(markers.map((m) => m.source).sort()).toEqual(['SPEC.md', 'package.json']);
    });

    it('skips node_modules, .git, dist, and other build dirs', async () => {
      for (const dir of ['node_modules', '.git', 'dist', 'coverage']) {
        await fs.ensureDir(path.join(tmpDir, dir));
        await fs.writeFile(path.join(tmpDir, dir, 'leak.md'), '<!-- references package.json -->\n');
      }
      await fs.writeFile(path.join(tmpDir, 'real.md'), '<!-- references package.json -->\nbody');
      const markers = await findReferencesMarkers(tmpDir);
      expect(markers).toHaveLength(1);
      expect(markers[0].file).toBe('real.md');
    });

    it('section content stops at the next ## heading', async () => {
      const content = [
        '# Title',
        '## A',
        '<!-- references package.json -->',
        'inside-A',
        '## B',
        'inside-B',
      ].join('\n');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), content);
      const markers = await findReferencesMarkers(tmpDir);
      expect(markers[0].sectionContent).toContain('inside-A');
      expect(markers[0].sectionContent).not.toContain('inside-B');
    });

    it('captures multiple markers in the same file', async () => {
      const content = [
        '## Tech Stack',
        '<!-- references package.json -->',
        '- Vitest (5 tests, 2 files)',
        '## Commands',
        '<!-- references package.json -->',
        '`npm run lint`',
      ].join('\n');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), content);
      const markers = await findReferencesMarkers(tmpDir);
      expect(markers).toHaveLength(2);
    });
  });

  describe('findMissingNpmScripts', () => {
    it('returns empty when section references no npm run scripts', () => {
      expect(findMissingNpmScripts('Just prose, no scripts.', { test: 'vitest' })).toEqual([]);
    });

    it('flags scripts referenced via `npm run X` that are absent from package.json', () => {
      const section = '`npm run lint`\n`npm run format`\n';
      const missing = findMissingNpmScripts(section, { lint: 'eslint .' });
      expect(missing).toEqual(['format']);
    });

    it('does not flag bare `npm test` (lifecycle script, not run-X form)', () => {
      const section = '`npm test`\n`npm run lint`\n';
      const missing = findMissingNpmScripts(section, { test: 'vitest', lint: 'eslint .' });
      expect(missing).toEqual([]);
    });

    it('deduplicates repeated references to the same missing script', () => {
      const section = '`npm run docs:dev`\n`npm run docs:dev`\n';
      const missing = findMissingNpmScripts(section, {});
      expect(missing).toEqual(['docs:dev']);
    });

    it('handles missing or empty scripts object', () => {
      expect(findMissingNpmScripts('`npm run lint`', null)).toEqual(['lint']);
      expect(findMissingNpmScripts('`npm run lint`', {})).toEqual(['lint']);
    });
  });

  describe('lintRepo', () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-lint-repo-'));
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ scripts: { test: 'vitest', lint: 'eslint .' } })
      );
    });

    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('returns hasDrift=false with markerCount=0 on a clean repo with no markers', async () => {
      await fs.writeFile(path.join(tmpDir, 'README.md'), '# Project');
      const result = await lintRepo(tmpDir);
      expect(result).toMatchObject({ hasDrift: false, markerCount: 0, findings: [] });
    });

    it('reports test-count drift when a marked section claims wrong file count', async () => {
      await fs.ensureDir(path.join(tmpDir, 'tests'));
      await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '## Tech Stack\n<!-- references package.json -->\n- Vitest (10 tests, 5 files)\n'
      );
      const result = await lintRepo(tmpDir);
      expect(result.hasDrift).toBe(true);
      expect(result.markerCount).toBe(1);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]).toMatchObject({
        file: 'CLAUDE.md',
        kind: 'test-count-drift',
        claimed: { tests: 10, files: 5 },
      });
      expect(result.findings[0].actual.files).toBe(1);
    });

    it('does not flag a section without claims even when marker is present', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '## Tech Stack\n<!-- references package.json -->\n- Just prose.\n'
      );
      const result = await lintRepo(tmpDir);
      expect(result.hasDrift).toBe(false);
      expect(result.markerCount).toBe(1);
    });

    it('reports missing-npm-script drift', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '## Verification\n<!-- references package.json -->\nRun `npm run does-not-exist`.\n'
      );
      const result = await lintRepo(tmpDir);
      expect(result.hasDrift).toBe(true);
      expect(result.findings[0]).toMatchObject({
        kind: 'missing-npm-script',
        scriptName: 'does-not-exist',
      });
    });

    it('skips markers whose source is not package.json', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '## A\n<!-- references SPEC.md -->\nVitest (10 tests, 5 files)\n'
      );
      const result = await lintRepo(tmpDir);
      expect(result.markerCount).toBe(1);
      expect(result.hasDrift).toBe(false);
    });

    it('reports multiple findings across multiple files', async () => {
      await fs.ensureDir(path.join(tmpDir, 'tests'));
      await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        '## Tech\n<!-- references package.json -->\n- Vitest (5 tests, 9 files)\n'
      );
      await fs.writeFile(
        path.join(tmpDir, 'AGENTS.md'),
        '## Verification\n<!-- references package.json -->\n`npm run nope`\n'
      );
      const result = await lintRepo(tmpDir);
      expect(result.findings.length).toBeGreaterThanOrEqual(2);
      const kinds = new Set(result.findings.map((f) => f.kind));
      expect(kinds).toEqual(new Set(['test-count-drift', 'missing-npm-script']));
    });
  });
});
