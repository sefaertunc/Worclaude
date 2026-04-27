import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  parseClaudeMdTestCountClaims,
  countTestCalls,
  countActualTestSuite,
  detectClaudeMdTestCountDrift,
} from '../../src/utils/drift-detect.js';

describe('drift-detect', () => {
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
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-drift-detect-'));
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

  describe('detectClaudeMdTestCountDrift', () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-drift-detect-'));
    });

    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('returns hasDrift=false with reason no-claude-md when CLAUDE.md is missing', async () => {
      const drift = await detectClaudeMdTestCountDrift(tmpDir);
      expect(drift.hasDrift).toBe(false);
      expect(drift.reason).toBe('no-claude-md');
    });

    it('returns hasDrift=false with reason no-claims when CLAUDE.md has no claim', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Project\nNothing here');
      const drift = await detectClaudeMdTestCountDrift(tmpDir);
      expect(drift.hasDrift).toBe(false);
      expect(drift.reason).toBe('no-claims');
    });

    it('flags drift when CLAUDE.md claims a different number of test files', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '- Vitest (10 tests, 5 files)');
      await fs.ensureDir(path.join(tmpDir, 'tests'));
      await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
      const drift = await detectClaudeMdTestCountDrift(tmpDir);
      expect(drift.hasDrift).toBe(true);
      expect(drift.reason).toBe('mismatch');
      expect(drift.actual.files).toBe(1);
      expect(drift.mismatches).toHaveLength(1);
      expect(drift.mismatches[0]).toMatchObject({ claimedTests: 10, claimedFiles: 5 });
    });

    it('does not flag drift when only the test count differs (file count drives the trigger)', async () => {
      // Regex-based test counting is approximate (it doesn't expand .each, etc.),
      // so the canonical /sync count and the doctor count diverge for the same
      // file set. File count is glob-exact and is the only trigger.
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '- Vitest (999 tests, 1 file)');
      await fs.ensureDir(path.join(tmpDir, 'tests'));
      await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
      const drift = await detectClaudeMdTestCountDrift(tmpDir);
      expect(drift.hasDrift).toBe(false);
      expect(drift.reason).toBe('match');
    });

    it('returns hasDrift=false with reason match when file count equals actual', async () => {
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '- Vitest (1 test, 1 file)');
      await fs.ensureDir(path.join(tmpDir, 'tests'));
      await fs.writeFile(path.join(tmpDir, 'tests', 'a.test.js'), "it('one', () => {});");
      const drift = await detectClaudeMdTestCountDrift(tmpDir);
      expect(drift.hasDrift).toBe(false);
      expect(drift.reason).toBe('match');
    });
  });
});
