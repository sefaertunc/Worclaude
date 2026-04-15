import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '..', '..', 'templates', 'hooks', 'skill-hint.cjs');

let tmpDir;

async function setupSkills(skillNames) {
  for (const name of skillNames) {
    await fs.ensureDir(path.join(tmpDir, '.claude', 'skills', name));
  }
}

function runScript(inputObj) {
  const json = JSON.stringify({ cwd: tmpDir, ...inputObj });
  return execSync(`echo '${json.replace(/'/g, "'\\''")}' | node "${scriptPath}"`, {
    encoding: 'utf8',
    timeout: 5000,
  });
}

describe('skill-hint hook', () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-hint-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('hints at testing skill when prompt mentions testing', async () => {
    await setupSkills(['testing', 'security-checklist']);
    const output = runScript({ input: { prompt: 'write testing code for login' } });
    expect(output).toContain('[Skill hint]');
    expect(output).toContain('testing/SKILL.md');
  });

  it('hints at security-checklist when prompt mentions security', async () => {
    await setupSkills(['testing', 'security-checklist']);
    const output = runScript({ input: { prompt: 'audit for security issues' } });
    expect(output).toContain('security-checklist/SKILL.md');
  });

  it('hints at context-management when prompt mentions context or management', async () => {
    await setupSkills(['context-management', 'testing']);
    const output = runScript({ input: { prompt: 'help with context management strategy' } });
    expect(output).toContain('context-management/SKILL.md');
  });

  it('returns first match alphabetically when multiple skills match', async () => {
    await setupSkills(['verification', 'security-checklist', 'testing']);
    // prompt has tokens matching both 'security' (security-checklist) and 'testing'
    const output = runScript({
      input: { prompt: 'testing approach for security review' },
    });
    expect(output).toContain('security-checklist/SKILL.md');
    expect(output).not.toContain('testing/SKILL.md');
  });

  it('emits nothing for unrelated prompts', async () => {
    await setupSkills(['testing', 'security-checklist']);
    const output = runScript({ input: { prompt: 'weather forecast sunny' } });
    expect(output.trim()).toBe('');
  });

  it('emits nothing when .claude/skills/ is missing', async () => {
    // Do not create the skills directory
    const output = runScript({ input: { prompt: 'write testing code' } });
    expect(output.trim()).toBe('');
  });

  it('emits nothing for empty prompt', async () => {
    await setupSkills(['testing']);
    const output = runScript({ input: { prompt: '' } });
    expect(output.trim()).toBe('');
  });

  it('emits nothing for missing input field', async () => {
    await setupSkills(['testing']);
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

  it('always exits with code 0', async () => {
    await setupSkills(['testing']);
    // execSync throws on non-zero exit, so reaching here means exit 0
    execSync(`echo '{}' | node "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
    execSync(`echo 'not json' | node "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
  });

  it('ignores non-directory entries in .claude/skills/', async () => {
    await setupSkills(['testing']);
    // Add a stray file that should not be treated as a skill
    await fs.writeFile(path.join(tmpDir, '.claude', 'skills', 'README.md'), 'not a skill');
    const output = runScript({ input: { prompt: 'write testing code' } });
    expect(output).toContain('testing/SKILL.md');
    expect(output).not.toContain('README');
  });

  it('filters stopwords from prompt tokenization', async () => {
    // 'the' is a stopword, 'with' is a stopword. Make sure they don't create false matches
    // against hypothetical skills named 'the-skill' or 'with-skill'.
    await setupSkills(['the-skill', 'with-skill']);
    const output = runScript({ input: { prompt: 'working with the thing' } });
    expect(output.trim()).toBe('');
  });
});
