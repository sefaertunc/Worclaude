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

  it('includes shell builtins so [ -n "$X" ] tests in helper scripts do not prompt', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('Bash(test:*)');
    expect(parsed.permissions.allow).toContain('Bash([:*)');
  });

  it('includes Bash(bash:*) so .claude/scripts/*.sh helpers run without approval', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('Bash(bash:*)');
  });

  it('includes WebFetch domains for the four reference sources every Claude Code session uses', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('WebFetch(domain:docs.anthropic.com)');
    expect(parsed.permissions.allow).toContain('WebFetch(domain:docs.claude.com)');
    expect(parsed.permissions.allow).toContain('WebFetch(domain:github.com)');
    expect(parsed.permissions.allow).toContain('WebFetch(domain:api.github.com)');
  });

  it('includes WebSearch so the built-in search tool runs without approval', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('WebSearch');
  });

  it('includes Skill() rules for the built-in workflow skills the templates reference', async () => {
    const parsed = await loadBaseJson();
    expect(parsed.permissions.allow).toContain('Skill(update-config)');
    expect(parsed.permissions.allow).toContain('Skill(fewer-permission-prompts)');
  });
});
