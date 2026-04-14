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

  it('notification hook has standard+strict profile gate (Notification event)', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const notification = settingsObject.hooks.Notification;
    expect(notification).toHaveLength(1);
    expect(notification[0].hooks[0].command).toMatch(
      /^p=\$\{WORCLAUDE_HOOK_PROFILE:-standard\}; case "\$p" in minimal\) exit 0;; esac;/
    );
    expect(notification[0].hooks[0].async).toBe(true);
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

  it('PostToolUse has exactly 2 entries', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    expect(settingsObject.hooks.PostToolUse).toHaveLength(2);
  });

  it('PreCompact hook exists with no profile gate and async', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const preCompact = settingsObject.hooks.PreCompact;
    expect(preCompact).toHaveLength(1);
    expect(preCompact[0].hooks[0].command).not.toContain('WORCLAUDE_HOOK_PROFILE');
    expect(preCompact[0].hooks[0].async).toBe(true);
  });

  it('Stop hook has standard+strict profile gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const stop = settingsObject.hooks.Stop;
    expect(stop).toHaveLength(1);
    expect(stop[0].hooks[0].command).toContain('WORCLAUDE_HOOK_PROFILE');
  });

  it('UserPromptSubmit hooks have standard+strict profile gate', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const ups = settingsObject.hooks.UserPromptSubmit;
    expect(ups).toHaveLength(2);
    expect(ups[0].hooks[0].command).toContain('WORCLAUDE_HOOK_PROFILE');
    expect(ups[0].hooks[0].command).toContain('correction-detect');
    expect(ups[1].hooks[0].command).toContain('WORCLAUDE_HOOK_PROFILE');
    expect(ups[1].hooks[0].command).toContain('skill-hint');
  });

  it('SessionEnd hook has standard+strict profile gate and async', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    const sessionEnd = settingsObject.hooks.SessionEnd;
    expect(sessionEnd).toHaveLength(1);
    expect(sessionEnd[0].hooks[0].command).toContain('WORCLAUDE_HOOK_PROFILE');
    expect(sessionEnd[0].hooks[0].async).toBe(true);
  });

  it('settings have 8 hook event types', async () => {
    const { settingsObject } = await buildSettingsJson(['node'], false);
    expect(Object.keys(settingsObject.hooks).length).toBe(8);
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
