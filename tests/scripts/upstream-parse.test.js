import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  runParse,
  buildRawBody,
  extractAssistantText,
  MAX_RAW_BYTES,
} from '../../scripts/upstream-parse.mjs';

const FIXTURES = path.resolve(new URL('../fixtures/upstream', import.meta.url).pathname);

async function readOutputs(outputPath) {
  const raw = await fs.readFile(outputPath, 'utf8');
  const pairs = {};
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    pairs[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return pairs;
}

describe('upstream-parse', () => {
  let tmpDir;
  let outputPath;
  let logSpy;
  let errSpy;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'upstream-parse-'));
    outputPath = path.join(tmpDir, 'gh-output');
    await fs.ensureFile(outputPath);
    process.env.RUNNER_TEMP = tmpDir;
    process.env.GITHUB_OUTPUT = outputPath;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    delete process.env.RUNNER_TEMP;
    delete process.env.GITHUB_OUTPUT;
    await fs.remove(tmpDir);
  });

  describe('happy paths', () => {
    it('extracts title and body from a valid JSON-array transcript', async () => {
      await runParse(path.join(FIXTURES, 'exec-issue.json'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('false');
      expect(out.parse_error).toBe('');
      expect(out.title).toBe('upstream: 2 new items to review (2026-04-18)');
      expect(out.body_path).toBeTruthy();
      const body = await fs.readFile(out.body_path, 'utf8');
      expect(body.startsWith('## Summary')).toBe(true);
      expect(body).toContain('## Worth Action');
    });

    it('emits skip=true for a SKIP_ISSUE transcript', async () => {
      await runParse(path.join(FIXTURES, 'exec-skip.json'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('true');
      expect(out.parse_error).toBe('');
      expect(out.title).toBe('');
      expect(out.body_path).toBe('');
      expect(out.raw_path).toBe('');
    });

    it('falls back to raw content when the file is not valid JSON (plaintext)', async () => {
      await runParse(path.join(FIXTURES, 'exec-plaintext.md'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('false');
      expect(out.parse_error).toBe('');
      expect(out.title).toBe('upstream: 1 new item to review (2026-04-18)');
    });

    it('ignores hook events and finds the assistant text after them', async () => {
      // Real workflow runs execute worclaude's dogfooded SessionStart hook,
      // which emits `system:hook_response` events carrying a large `output`
      // string (CLAUDE.md + PROGRESS.md dumps). That payload can contain the
      // literal token SKIP_ISSUE in prose. The extractor must only look at
      // assistant events, not hook outputs.
      await runParse(path.join(FIXTURES, 'exec-with-hooks.json'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('true');
      expect(out.parse_error).toBe('');
    });

    it('ignores tool_use blocks and prefers the last turn with real text', async () => {
      // Multi-turn fixture: turn 1 mixes text with a `Read` tool_use, turn 2
      // is tool_use-only, turn 3 is the final SKIP_ISSUE. The extractor must
      // return "SKIP_ISSUE" — not "I'll read the input files first.", and
      // tool_use turns must not clobber the preceding text turn.
      await runParse(path.join(FIXTURES, 'exec-with-tool-use.json'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('true');
      expect(out.parse_error).toBe('');
    });
  });

  describe('error paths', () => {
    it('reports parse_error and writes raw file when no contract line exists', async () => {
      await runParse(path.join(FIXTURES, 'exec-malformed.json'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('false');
      expect(out.parse_error).toBe(
        'no contract line (SKIP_ISSUE or "# Title: ") found in response'
      );
      expect(out.raw_path).toBeTruthy();

      // The raw file must carry Claude's assistant text — not the full JSON
      // transcript. This prevents the >65KB fallback failure seen on
      // 2026-04-20 (issue #91).
      const raw = await fs.readFile(out.raw_path, 'utf8');
      expect(raw).toContain('Parse error:');
      expect(raw).toContain("I've analyzed the new items and here are my thoughts");
      expect(raw).not.toContain('"type": "system"');
      expect(raw).not.toContain('"subtype": "init"');
    });

    it('reports parse_error when execution file is missing', async () => {
      await runParse(path.join(tmpDir, 'does-not-exist.json'));
      const out = await readOutputs(outputPath);
      expect(out.skip).toBe('false');
      expect(out.parse_error).toMatch(/^execution file unreadable:/);
      expect(out.raw_path).toBeTruthy();
    });

    it('reports missing # Body marker when title is present but body is not', async () => {
      const fixturePath = path.join(tmpDir, 'exec-no-body.json');
      await fs.writeFile(
        fixturePath,
        JSON.stringify([
          {
            type: 'assistant',
            message: {
              role: 'assistant',
              content: [
                { type: 'text', text: '# Title: a real title\njust prose, no body marker' },
              ],
            },
          },
        ])
      );
      await runParse(fixturePath);
      const out = await readOutputs(outputPath);
      expect(out.parse_error).toBe('"# Body" marker missing after title');
    });
  });

  describe('raw-body fallback (prevents >65KB gh issue create failures)', () => {
    it('writes just the assistant text, not the full transcript', () => {
      const assistantText = 'Claude said something off-contract.';
      const transcript = JSON.stringify(
        [
          { type: 'system', subtype: 'init' },
          {
            type: 'user',
            message: { role: 'user', content: [{ type: 'text', text: '...' }] },
          },
          {
            type: 'assistant',
            message: {
              role: 'assistant',
              content: [{ type: 'text', text: assistantText }],
            },
          },
        ],
        null,
        2
      );
      const body = buildRawBody(assistantText, transcript, 'some reason');
      expect(body).toContain('Parse error: some reason');
      expect(body).toContain(assistantText);
      expect(body).not.toContain('"type": "system"');
      expect(body).not.toContain('"type": "user"');
    });

    it('falls back to the transcript when assistant text is empty', () => {
      const transcript = 'raw log with no parseable assistant block';
      const body = buildRawBody('', transcript, 'reason');
      expect(body).toContain(transcript);
    });

    it('truncates oversize content to stay under MAX_RAW_BYTES with a marker', () => {
      const huge = 'x'.repeat(MAX_RAW_BYTES * 2);
      const body = buildRawBody(huge, '', 'reason');
      expect(Buffer.byteLength(body, 'utf8')).toBeLessThanOrEqual(MAX_RAW_BYTES);
      expect(body.endsWith('[truncated]')).toBe(true);
    });

    it('does not truncate content that fits within the budget', () => {
      const small = 'y'.repeat(1000);
      const body = buildRawBody(small, '', 'reason');
      expect(body.endsWith('[truncated]')).toBe(false);
      expect(body).toContain(small);
    });

    it('the malformed-transcript run produces a raw file that fits the budget', async () => {
      await runParse(path.join(FIXTURES, 'exec-malformed.json'));
      const out = await readOutputs(outputPath);
      const stat = await fs.stat(out.raw_path);
      expect(stat.size).toBeLessThanOrEqual(MAX_RAW_BYTES);
    });
  });

  describe('extractAssistantText', () => {
    it('returns null when the content is not valid JSON', () => {
      expect(extractAssistantText('not json at all')).toBeNull();
    });

    it('returns null when the JSON root is not an array', () => {
      expect(
        extractAssistantText(
          JSON.stringify({
            type: 'assistant',
            message: { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
          })
        )
      ).toBeNull();
    });

    it('returns null when the array contains no assistant events', () => {
      const raw = JSON.stringify([
        { type: 'system', subtype: 'init' },
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'hi' }] },
        },
      ]);
      expect(extractAssistantText(raw)).toBeNull();
    });

    it('joins multiple text blocks from the last assistant turn', () => {
      const raw = JSON.stringify([
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'first' },
              { type: 'text', text: 'second' },
            ],
          },
        },
      ]);
      expect(extractAssistantText(raw)).toBe('first\nsecond');
    });

    it('prefers the last non-empty assistant turn', () => {
      const raw = JSON.stringify([
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'first turn' }],
          },
        },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'final turn' }],
          },
        },
      ]);
      expect(extractAssistantText(raw)).toBe('final turn');
    });

    it('skips tool_use-only turns so a prior text turn survives', () => {
      // Claude often reads input files via a tool_use, producing an
      // assistant turn with no text. That turn must not clobber an
      // earlier text-carrying turn when no later text turn exists.
      const raw = JSON.stringify([
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'the real response' }],
          },
        },
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: '/x' } }],
          },
        },
      ]);
      expect(extractAssistantText(raw)).toBe('the real response');
    });

    it('extracts only text blocks when content mixes text and tool_use', () => {
      const raw = JSON.stringify([
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'narration before the call' },
              { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: '/x' } },
            ],
          },
        },
      ]);
      expect(extractAssistantText(raw)).toBe('narration before the call');
    });
  });
});
