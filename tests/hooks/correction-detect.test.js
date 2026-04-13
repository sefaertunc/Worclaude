import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(
  __dirname,
  '..',
  '..',
  'templates',
  'hooks',
  'correction-detect.cjs'
);

function runScript(inputObj) {
  const json = JSON.stringify(inputObj);
  return execSync(`echo '${json.replace(/'/g, "'\\''")}' | node "${scriptPath}"`, {
    encoding: 'utf8',
    timeout: 5000,
  });
}

describe('correction-detect hook', () => {
  it('detects "no, that\'s wrong" correction pattern', () => {
    const output = runScript({ input: { prompt: "No, that's wrong. Use conventional commits." } });
    expect(output).toContain('Correction detected');
  });

  it('detects "you should" correction pattern', () => {
    const output = runScript({ input: { prompt: 'You should use path.join instead.' } });
    expect(output).toContain('Correction detected');
  });

  it('detects "actually" correction pattern', () => {
    const output = runScript({ input: { prompt: 'Actually, that file is in src/core/' } });
    expect(output).toContain('Correction detected');
  });

  it('detects "remember this" learn trigger', () => {
    const output = runScript({ input: { prompt: 'Remember this: always run tests first' } });
    expect(output).toContain('Learn trigger');
  });

  it('detects "[LEARN]" learn trigger', () => {
    const output = runScript({ input: { prompt: '[LEARN] Git: always use conventional commits' } });
    expect(output).toContain('Learn trigger');
  });

  it('prioritizes learn pattern over correction pattern', () => {
    const output = runScript({
      input: { prompt: "Don't do that again, learn from this" },
    });
    expect(output).toContain('Learn trigger');
  });

  it('produces no output for normal prompt', () => {
    const output = runScript({ input: { prompt: 'Implement the login feature' } });
    expect(output.trim()).toBe('');
  });

  it('produces no output for empty prompt', () => {
    const output = runScript({ input: { prompt: '' } });
    expect(output.trim()).toBe('');
  });

  it('handles missing input field gracefully', () => {
    const output = runScript({});
    expect(output.trim()).toBe('');
  });

  it('handles malformed JSON gracefully', () => {
    const output = execSync(`echo 'not json' | node "${scriptPath}"`, {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(output.trim()).toBe('');
  });

  it('always exits with code 0', () => {
    // execSync throws on non-zero exit code, so reaching here means exit 0
    execSync(`echo '{}' | node "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
  });
});
