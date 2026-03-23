import inquirer from 'inquirer';
import { TECH_STACKS } from '../data/agents.js';

export async function promptTechStack(_projectTypes) {
  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Primary backend language / runtime:',
      choices: TECH_STACKS,
    },
  ]);

  const { useDocker } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Do you use Docker?',
      default: false,
    },
  ]);

  return { language, useDocker };
}
