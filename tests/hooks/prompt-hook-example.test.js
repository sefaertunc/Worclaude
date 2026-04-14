import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'templates',
  'hooks',
  'examples',
  'prompt-hook-commit-validator.json'
);

describe('prompt-hook-commit-validator.json', () => {
  it('file exists', async () => {
    expect(await fs.pathExists(EXAMPLE_PATH)).toBe(true);
  });

  it('is valid JSON', async () => {
    const content = await fs.readFile(EXAMPLE_PATH, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('has PreToolUse with Bash matcher', async () => {
    const parsed = JSON.parse(await fs.readFile(EXAMPLE_PATH, 'utf-8'));
    expect(parsed.PreToolUse).toBeInstanceOf(Array);
    expect(parsed.PreToolUse[0].matcher).toBe('Bash');
  });

  it('hook object has type=prompt, model, prompt, and timeout', async () => {
    const parsed = JSON.parse(await fs.readFile(EXAMPLE_PATH, 'utf-8'));
    const hook = parsed.PreToolUse[0].hooks[0];
    expect(hook.type).toBe('prompt');
    expect(hook.model).toBe('haiku');
    expect(typeof hook.prompt).toBe('string');
    expect(hook.timeout).toBe(30);
  });

  it('prompt contains $ARGUMENTS placeholder', async () => {
    const parsed = JSON.parse(await fs.readFile(EXAMPLE_PATH, 'utf-8'));
    const hook = parsed.PreToolUse[0].hooks[0];
    expect(hook.prompt).toContain('$ARGUMENTS');
  });

  it('prompt does NOT contain $TOOL_INPUT (legacy, wrong variable)', async () => {
    const parsed = JSON.parse(await fs.readFile(EXAMPLE_PATH, 'utf-8'));
    const hook = parsed.PreToolUse[0].hooks[0];
    expect(hook.prompt).not.toContain('$TOOL_INPUT');
  });

  it('prompt instructs model to respond with ok/reason JSON', async () => {
    const parsed = JSON.parse(await fs.readFile(EXAMPLE_PATH, 'utf-8'));
    const hook = parsed.PreToolUse[0].hooks[0];
    expect(hook.prompt).toContain('"ok": true');
    expect(hook.prompt).toContain('"ok": false');
  });
});
