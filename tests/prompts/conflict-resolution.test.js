import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { promptHookConflict } from '../../src/prompts/conflict-resolution.js';

const existingHook = {
  matcher: 'Write|Edit',
  hooks: [{ type: 'command', command: 'old-command' }],
};
const workflowHook = {
  matcher: 'Write|Edit',
  hooks: [{ type: 'command', command: 'new-command' }],
};

describe('promptHookConflict', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prompts the user interactively by default', async () => {
    inquirer.prompt.mockResolvedValue({ resolution: 'replace' });

    const result = await promptHookConflict('PostToolUse', existingHook, workflowHook);

    expect(result).toBe('replace');
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
  });

  it('returns "keep" without prompting when options.yes is true', async () => {
    const result = await promptHookConflict('PostToolUse', existingHook, workflowHook, {
      yes: true,
    });

    expect(result).toBe('keep');
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it('prompts normally when options.yes is explicitly false', async () => {
    inquirer.prompt.mockResolvedValue({ resolution: 'chain' });

    const result = await promptHookConflict('PostToolUse', existingHook, workflowHook, {
      yes: false,
    });

    expect(result).toBe('chain');
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
  });
});
