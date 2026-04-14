import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(
  __dirname,
  '..',
  '..',
  'templates',
  'hooks',
  'pre-compact-save.cjs'
);

let tmpDir;

function runScript(inputObj) {
  const json = JSON.stringify({ cwd: tmpDir, hook_event_name: 'PreCompact', ...inputObj });
  return execSync(`echo '${json.replace(/'/g, "'\\''")}' | node "${scriptPath}"`, {
    encoding: 'utf8',
    timeout: 5000,
  });
}

function listSnapshots() {
  const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
  if (!fs.existsSync(sessionsDir)) return [];
  return fs.readdirSync(sessionsDir).filter((f) => f.startsWith('pre-compact-'));
}

describe('pre-compact-save hook', () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pre-compact-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('writes a snapshot file under .claude/sessions/', () => {
    runScript({ session_id: 't', trigger: 'auto' });
    const files = listSnapshots();
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^pre-compact-.+\.md$/);
  });

  it('records the trigger value in the snapshot', () => {
    runScript({ session_id: 't', trigger: 'manual' });
    const files = listSnapshots();
    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'sessions', files[0]), 'utf8');
    expect(content).toContain('**Trigger:** manual');
  });

  it('defaults trigger to "unknown" when omitted', () => {
    runScript({ session_id: 't' });
    const files = listSnapshots();
    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'sessions', files[0]), 'utf8');
    expect(content).toContain('**Trigger:** unknown');
  });

  it('creates .claude/sessions/ if missing', () => {
    const sessionsDir = path.join(tmpDir, '.claude', 'sessions');
    expect(fs.existsSync(sessionsDir)).toBe(false);
    runScript({ session_id: 't', trigger: 'auto' });
    expect(fs.existsSync(sessionsDir)).toBe(true);
  });

  it('includes a branch line in the snapshot', () => {
    runScript({ session_id: 't', trigger: 'auto' });
    const files = listSnapshots();
    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'sessions', files[0]), 'utf8');
    expect(content).toMatch(/^\*\*Branch:\*\* /m);
  });

  it('handles malformed JSON without throwing', () => {
    const output = execSync(`echo 'not json' | node "${scriptPath}"`, {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(output.trim()).toBe('');
    expect(listSnapshots()).toHaveLength(0);
  });

  it('always exits with code 0', () => {
    // execSync throws on non-zero exit, so reaching here means exit 0
    execSync(`echo '{}' | node "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
    execSync(`echo 'not json' | node "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
  });
});
