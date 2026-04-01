import { describe, it, expect, vi } from 'vitest';

// Mock prompts (required by merger.js imports)
vi.mock('../../src/prompts/conflict-resolution.js', () => ({
  promptHookConflict: vi.fn().mockResolvedValue('keep'),
}));

vi.mock('../../src/prompts/claude-md-merge.js', () => ({
  promptClaudeMdMerge: vi.fn().mockResolvedValue('keep'),
  generateWorkflowSuggestions: vi.fn().mockReturnValue(''),
  detectMissingSections: vi.fn().mockReturnValue([]),
  interactiveSectionMerge: vi.fn(),
}));

vi.spyOn(console, 'log').mockImplementation(() => {});

import { buildSettingsJson } from '../../src/core/merger.js';

describe('hook profiles', () => {
  it('formatter hook has standard+strict profile gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const postToolUse = settingsObject.hooks.PostToolUse;
    const formatterHook = postToolUse.find(
      (h) => h.matcher === 'Write|Edit' && h.hooks[0].command.includes('prettier')
    );
    expect(formatterHook).toBeDefined();
    expect(formatterHook.hooks[0].command).toMatch(
      /^p=\$\{WORCLAUDE_HOOK_PROFILE:-standard\}; case "\$p" in minimal\) exit 0;; esac;/
    );
  });

  it('notification hook has standard+strict profile gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const postToolUse = settingsObject.hooks.PostToolUse;
    const notificationHook = postToolUse.find((h) => h.matcher === 'Stop');
    expect(notificationHook).toBeDefined();
    expect(notificationHook.hooks[0].command).toMatch(
      /^p=\$\{WORCLAUDE_HOOK_PROFILE:-standard\}; case "\$p" in minimal\) exit 0;; esac;/
    );
  });

  it('SessionStart hook does NOT have profile gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const sessionStart = settingsObject.hooks.SessionStart;
    expect(sessionStart).toHaveLength(1);
    expect(sessionStart[0].hooks[0].command).not.toContain('WORCLAUDE_HOOK_PROFILE');
  });

  it('PostCompact hook does NOT have profile gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const postCompact = settingsObject.hooks.PostCompact;
    expect(postCompact).toHaveLength(1);
    expect(postCompact[0].hooks[0].command).not.toContain('WORCLAUDE_HOOK_PROFILE');
  });

  it('strict-only typecheck hook exists with strict gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const postToolUse = settingsObject.hooks.PostToolUse;
    const typecheckHook = postToolUse.find(
      (h) => h.matcher === 'Write|Edit' && h.hooks[0].command.includes('tsc --noEmit')
    );
    expect(typecheckHook).toBeDefined();
    expect(typecheckHook.hooks[0].command).toMatch(
      /^p=\$\{WORCLAUDE_HOOK_PROFILE:-standard\}; case "\$p" in strict\) ;; \*\) exit 0;; esac;/
    );
  });

  it('PostToolUse has exactly 3 entries', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    expect(settingsObject.hooks.PostToolUse).toHaveLength(3);
  });

  it('profile gate survives multi-language formatter chaining', async () => {
    const { settingsObject } = await buildSettingsJson(['python', 'node'], false);
    const formatterHook = settingsObject.hooks.PostToolUse.find(
      (h) => h.matcher === 'Write|Edit' && h.hooks[0].command.includes('prettier')
    );
    expect(formatterHook.hooks[0].command).toContain('WORCLAUDE_HOOK_PROFILE');
    expect(formatterHook.hooks[0].command).toContain('ruff format');
    expect(formatterHook.hooks[0].command).toContain('prettier');
  });
});
