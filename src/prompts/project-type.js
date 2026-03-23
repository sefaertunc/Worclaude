import inquirer from 'inquirer';
import { PROJECT_TYPES, CATEGORY_RECOMMENDATIONS } from '../data/agents.js';
import * as display from '../utils/display.js';

export async function promptProjectType() {
  const { projectTypes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'projectTypes',
      message: 'What type of project is this? (space to toggle, enter to confirm)',
      choices: PROJECT_TYPES.map((t) => ({ name: t, value: t })),
      validate(answer) {
        if (answer.length === 0) {
          return 'Please select at least one project type.';
        }
        return true;
      },
    },
  ]);

  // Check for overlapping agent recommendations
  if (projectTypes.length > 1) {
    const agentSets = projectTypes.map((t) => new Set(CATEGORY_RECOMMENDATIONS[t] || []));
    const allAgents = new Set();
    const overlapping = new Set();

    for (const agentSet of agentSets) {
      for (const agent of agentSet) {
        if (allAgents.has(agent)) {
          overlapping.add(agent);
        }
        allAgents.add(agent);
      }
    }

    if (overlapping.size > 0) {
      display.info(
        `Some agents are recommended by multiple project types: ${[...overlapping].join(', ')}`
      );
      display.dim('They will only be installed once.');
    }
  }

  return projectTypes;
}
