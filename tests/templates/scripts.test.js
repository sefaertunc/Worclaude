import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, '../../templates/scripts');
const COMMANDS_DIR = path.resolve(__dirname, '../../templates/commands');

async function listScripts() {
  if (!(await fs.pathExists(SCRIPTS_DIR))) return [];
  return (await fs.readdir(SCRIPTS_DIR)).filter((f) => f.endsWith('.sh'));
}

async function readScript(name) {
  return fs.readFile(path.join(SCRIPTS_DIR, name), 'utf-8');
}

describe('templates/scripts/*.sh portability and consistency', () => {
  it('every shipped script starts with a shebang', async () => {
    const scripts = await listScripts();
    expect(scripts.length).toBeGreaterThan(0);
    for (const name of scripts) {
      const content = await readScript(name);
      expect(content.startsWith('#!')).toBe(true);
    }
  });

  it('every shipped script declares set -e or set -eu for fail-fast behavior', async () => {
    for (const name of await listScripts()) {
      const content = await readScript(name);
      expect(content).toMatch(/^set -e/m);
    }
  });

  it('no script uses grep -P or -oP (Perl regex; not available on macOS BSD grep)', async () => {
    for (const name of await listScripts()) {
      const content = await readScript(name);
      expect(content).not.toMatch(/grep\s+(?:-\w*P|-\w*oP)/);
    }
  });

  it('no script uses [[ ]] (bash-only; prefer POSIX [ ])', async () => {
    for (const name of await listScripts()) {
      const content = await readScript(name);
      const hasBashOnlyTest = /\[\[\s|\s\]\]/.test(content);
      expect(hasBashOnlyTest).toBe(false);
    }
  });

  it('every helper invocation in templates/commands/*.md maps to a real script file', async () => {
    const commandFiles = (await fs.readdir(COMMANDS_DIR)).filter((f) => f.endsWith('.md'));
    const referencedScripts = new Set();
    for (const file of commandFiles) {
      const content = await fs.readFile(path.join(COMMANDS_DIR, file), 'utf-8');
      const matches = content.matchAll(/bash\s+\.claude\/scripts\/([\w-]+\.sh)/g);
      for (const m of matches) referencedScripts.add(m[1]);
    }
    const shipped = new Set(await listScripts());
    for (const name of referencedScripts) {
      expect(shipped.has(name), `command markdown invokes ${name} but it is not shipped`).toBe(
        true
      );
    }
  });

  it('templates/commands/*.md no longer contains the env-var-prefix anti-pattern', async () => {
    const commandFiles = (await fs.readdir(COMMANDS_DIR)).filter((f) => f.endsWith('.md'));
    for (const file of commandFiles) {
      const content = await fs.readFile(path.join(COMMANDS_DIR, file), 'utf-8');
      const inBashBlocks = extractBashBlocks(content);
      for (const block of inBashBlocks) {
        const offending = block.match(/^\s*[A-Z_][A-Z_0-9]*=\$\(/m);
        expect(
          offending,
          `bash block in ${file} contains an X=$(...) assignment that prompts. Move it into a helper script.\n${block}`
        ).toBeNull();
      }
    }
  });
});

function extractBashBlocks(markdown) {
  const blocks = [];
  const re = /```bash\n([\s\S]*?)```/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}
