import { describe, it, vi, beforeEach } from 'vitest';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(() => Promise.resolve({})),
    Separator: class Separator {
      constructor(line) {
        this.type = 'separator';
        this.line = line || '──────────────';
      }
    },
  },
}));

vi.spyOn(console, 'log').mockImplementation(() => {});

import inquirer from 'inquirer';
import { promptHookConflict } from '../../src/prompts/conflict-resolution.js';
import { promptTechStack } from '../../src/prompts/tech-stack.js';
import { promptProjectType } from '../../src/prompts/project-type.js';
import { promptClaudeMdMerge, interactiveSectionMerge } from '../../src/prompts/claude-md-merge.js';
import { promptAgentSelection } from '../../src/prompts/agent-selection.js';
import { expectAllValidPromptTypes } from '../utils/prompt-types.js';

describe('inquirer v13 prompt-type regression', () => {
  beforeEach(() => {
    inquirer.prompt.mockReset();
  });

  it('conflict-resolution prompts use a v13 built-in type', async () => {
    inquirer.prompt.mockResolvedValueOnce({ resolution: 'keep' });
    await promptHookConflict(
      'PostToolUse',
      { matcher: 'A', hooks: [{ type: 'command', command: 'old' }] },
      { matcher: 'A', hooks: [{ type: 'command', command: 'new' }] }
    );
    expectAllValidPromptTypes(inquirer, 'conflict-resolution');
  });

  it('tech-stack prompts use a v13 built-in type', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ languages: ['node'] })
      .mockResolvedValueOnce({ useDocker: false });
    await promptTechStack(['CLI tool']);
    expectAllValidPromptTypes(inquirer, 'tech-stack');
  });

  it('project-type prompts use a v13 built-in type', async () => {
    inquirer.prompt.mockResolvedValueOnce({ projectTypes: ['CLI tool'] });
    await promptProjectType();
    expectAllValidPromptTypes(inquirer, 'project-type');
  });

  it('claude-md-merge top-level prompt uses a v13 built-in type', async () => {
    inquirer.prompt.mockResolvedValueOnce({ choice: 'keep' });
    await promptClaudeMdMerge('# existing\n', ['Key Files']);
    expectAllValidPromptTypes(inquirer, 'claude-md-merge top-level');
  });

  it('claude-md-merge interactive section prompt uses a v13 built-in type', async () => {
    inquirer.prompt.mockResolvedValue({ addSection: false });
    await interactiveSectionMerge('# existing\n', '# new\n## Key Files\nbody\n', ['Key Files']);
    expectAllValidPromptTypes(inquirer, 'claude-md-merge sections');
  });

  it('agent-selection prompts use a v13 built-in type', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ selectedCategories: ['Quality'] })
      .mockResolvedValueOnce({ selectedAgents: ['bug-fixer'] })
      .mockResolvedValueOnce({ additionalCategories: [] });
    await promptAgentSelection(['CLI tool']);
    expectAllValidPromptTypes(inquirer, 'agent-selection');
  });
});
