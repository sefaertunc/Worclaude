import inquirer from 'inquirer';
import { TECH_STACKS } from '../data/agents.js';
import * as display from '../utils/display.js';

export async function promptTechStack(_projectTypes) {
  const { languages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'languages',
      message: 'Primary language(s) / runtime: (space to toggle, enter to confirm)',
      choices: TECH_STACKS,
      validate(answer) {
        if (answer.length === 0) {
          return 'Please select at least one language or "Other / None".';
        }
        return true;
      },
    },
  ]);

  display.newline();
  display.info('This determines which tool permissions and formatters');
  display.dim('are added. You can update later by editing');
  display.dim('.claude/settings.json or running `claude-workflow upgrade`.');
  display.newline();

  const { useDocker } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Do you use Docker in this project currently?',
      default: false,
    },
  ]);

  display.info('If you add Docker later, run `claude-workflow upgrade`');
  display.dim('to add Docker permissions and tools.');

  return { languages, useDocker };
}
