import inquirer from 'inquirer';
import { TECH_STACKS } from '../data/agents.js';

export async function promptTechStack(_projectTypes) {
  const { languages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'languages',
      message:
        'Primary language(s) / runtime: (space to toggle, enter to confirm)\n  ℹ This sets tool permissions and formatters. Update anytime via settings.json.',
      choices: TECH_STACKS,
      validate(answer) {
        if (answer.length === 0) {
          return 'Please select at least one language or "Other / None".';
        }
        return true;
      },
    },
  ]);

  const { useDocker } = await inquirer.prompt([
    {
      type: 'select',
      name: 'useDocker',
      message: 'Do you use Docker currently?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      suffix: '\n  ℹ If you add Docker later, run `worclaude upgrade`.',
    },
  ]);

  return { languages, useDocker };
}
