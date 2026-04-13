import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '..', '..', 'templates', 'hooks', 'learn-capture.cjs');

const LEARN_REGEX =
  /\[LEARN\]\s*([\w][\w\s-]*?)\s*:\s*(.+?)(?:\r?\nMistake:\s*(.+?))?(?:\r?\nCorrection:\s*(.+?))?(?=\r?\n\[LEARN\]|\r?\n\r?\n|$)/gim;

function runScript(inputObj) {
  const json = JSON.stringify(inputObj);
  return execSync(`echo '${json.replace(/'/g, "'\\''")}' | node "${scriptPath}"`, {
    encoding: 'utf8',
    timeout: 5000,
  });
}

function writeJsonl(filePath, lines) {
  fs.writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join('\n'));
}

function makeAssistantMsg(text) {
  return {
    type: 'assistant',
    message: {
      content: [{ type: 'text', text }],
    },
  };
}

describe('learn-capture hook', () => {
  describe('[LEARN] regex', () => {
    it('matches a simple [LEARN] block with mistake and correction', () => {
      const input =
        '[LEARN] Git: Always use conventional commits\nMistake: Used "fixed bug"\nCorrection: Use "fix(auth): resolve token refresh"';
      LEARN_REGEX.lastIndex = 0;
      const match = LEARN_REGEX.exec(input);
      expect(match).not.toBeNull();
      expect(match[1]).toBe('Git');
      expect(match[2]).toContain('conventional commits');
      expect(match[3]).toContain('fixed bug');
      expect(match[4]).toContain('fix(auth)');
    });

    it('matches [LEARN] block without mistake/correction', () => {
      const input = '[LEARN] Testing: Always run tests before committing';
      LEARN_REGEX.lastIndex = 0;
      const match = LEARN_REGEX.exec(input);
      expect(match).not.toBeNull();
      expect(match[1]).toBe('Testing');
      expect(match[2]).toContain('tests before committing');
    });

    it('handles CRLF line endings', () => {
      const input =
        '[LEARN] Build: Use npm ci in CI\r\nMistake: Used npm install\r\nCorrection: Use npm ci';
      LEARN_REGEX.lastIndex = 0;
      const match = LEARN_REGEX.exec(input);
      expect(match).not.toBeNull();
      expect(match[1]).toBe('Build');
      expect(match[3]).toContain('npm install');
    });

    it('matches multiple [LEARN] blocks', () => {
      const input = '[LEARN] A: rule one\n\n[LEARN] B: rule two';
      LEARN_REGEX.lastIndex = 0;
      const matches = [];
      let m;
      while ((m = LEARN_REGEX.exec(input)) !== null) matches.push(m);
      expect(matches).toHaveLength(2);
      expect(matches[0][1]).toBe('A');
      expect(matches[1][1]).toBe('B');
    });
  });

  describe('hook execution', () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'learn-capture-'));
      await fs.ensureDir(path.join(tmpDir, '.claude'));
    });

    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('creates learning file and index when [LEARN] block is found', () => {
      const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
      writeJsonl(transcriptPath, [
        { type: 'user', message: { content: 'do something' } },
        makeAssistantMsg(
          'Here you go.\n\n[LEARN] Testing: Always run tests\nMistake: Skipped tests\nCorrection: Run npm test'
        ),
      ]);

      runScript({ cwd: tmpDir, transcript_path: transcriptPath });

      const learningFile = path.join(tmpDir, '.claude', 'learnings', 'testing.md');
      expect(fs.existsSync(learningFile)).toBe(true);
      const content = fs.readFileSync(learningFile, 'utf8');
      expect(content).toContain('category: Testing');
      expect(content).toContain('**Rule:** Always run tests');
      expect(content).toContain('**Mistake:** Skipped tests');
      expect(content).toContain('**Correction:** Run npm test');

      const indexFile = path.join(tmpDir, '.claude', 'learnings', 'index.json');
      expect(fs.existsSync(indexFile)).toBe(true);
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      expect(index.learnings).toHaveLength(1);
      expect(index.learnings[0].category).toBe('Testing');
      expect(index.learnings[0].file).toBe('testing.md');
    });

    it('does not create learning files for normal assistant messages', () => {
      const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
      writeJsonl(transcriptPath, [makeAssistantMsg('Just a regular message, nothing to learn.')]);

      runScript({ cwd: tmpDir, transcript_path: transcriptPath });

      const learningsDir = path.join(tmpDir, '.claude', 'learnings');
      expect(fs.existsSync(path.join(learningsDir, 'index.json'))).toBe(false);
    });

    it('handles missing transcript file gracefully', () => {
      runScript({ cwd: tmpDir, transcript_path: path.join(tmpDir, 'nonexistent.jsonl') });
      // Should exit 0 with no error
    });

    it('handles missing transcript_path gracefully', () => {
      runScript({ cwd: tmpDir });
    });

    it('always exits with code 0', () => {
      // If execSync returns, exit was 0
      runScript({ cwd: tmpDir });
    });

    it('respects stop_hook_active flag (stale check)', () => {
      const flagPath = path.join(tmpDir, '.claude', '.stop-hook-active');
      fs.writeFileSync(flagPath, String(Date.now()));

      const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
      writeJsonl(transcriptPath, [
        makeAssistantMsg('[LEARN] Blocked: This should not be captured'),
      ]);

      runScript({ cwd: tmpDir, transcript_path: transcriptPath });

      const learningsDir = path.join(tmpDir, '.claude', 'learnings');
      expect(fs.existsSync(path.join(learningsDir, 'blocked.md'))).toBe(false);
    });

    it('ignores stale stop_hook_active flag (>30s old)', () => {
      const flagPath = path.join(tmpDir, '.claude', '.stop-hook-active');
      fs.writeFileSync(flagPath, String(Date.now() - 60000));
      // Make mtime old
      const oldTime = new Date(Date.now() - 60000);
      fs.utimesSync(flagPath, oldTime, oldTime);

      const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
      writeJsonl(transcriptPath, [makeAssistantMsg('[LEARN] Stale: This should be captured')]);

      runScript({ cwd: tmpDir, transcript_path: transcriptPath });

      expect(fs.existsSync(path.join(tmpDir, '.claude', 'learnings', 'stale.md'))).toBe(true);
    });
  });
});
