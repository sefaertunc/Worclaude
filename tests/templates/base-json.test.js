import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_JSON_PATH = path.resolve(__dirname, '../../templates/settings/base.json');

async function loadBaseJson() {
  const raw = await fs.readFile(BASE_JSON_PATH, 'utf-8');
  // Strip "// --" banner lines inside permissions.allow — they are illegal
  // JSON but already handled by the scaffolder's buildSettingsJson parser
  // the same way. Here we just filter them out before JSON.parse.
  const stripped = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('"//'))
    .join('\n');
  return JSON.parse(stripped);
}

describe('templates/settings/base.json permissions.allow', () => {
  it('includes Bash(worclaude:*) so /setup can invoke the CLI without approval prompts', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('Bash(worclaude:*)');
  });

  it('includes scoped worclaude scan + setup-state entries for matcher belt-and-suspenders', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('Bash(worclaude scan:*)');
    expect(parsed.permissions.allow).toContain('Bash(worclaude setup-state:*)');
  });
});
