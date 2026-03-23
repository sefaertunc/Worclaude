import inquirer from 'inquirer';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  CATEGORY_RECOMMENDATIONS,
} from '../data/agents.js';
import * as display from '../utils/display.js';

export async function promptAgentSelection(projectTypes) {
  // Show universal agents (informational)
  display.newline();
  display.info('Universal agents (always installed):');
  for (const agent of UNIVERSAL_AGENTS) {
    display.success(`${agent}`);
  }
  display.newline();

  // Compute recommended agents from project types
  const recommendedSet = new Set();
  for (const type of projectTypes) {
    const agents = CATEGORY_RECOMMENDATIONS[type] || [];
    for (const agent of agents) {
      recommendedSet.add(agent);
    }
  }
  const recommended = [...recommendedSet];

  // Compute remaining agents (all optional minus recommended)
  const allOptional = Object.keys(AGENT_CATALOG);
  const remaining = allOptional.filter((a) => !recommendedSet.has(a));

  let selected = [];

  // Prompt for recommended agents (pre-checked)
  if (recommended.length > 0) {
    const { selectedRecommended } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedRecommended',
        message: `Recommended agents for your project type (space to toggle):`,
        choices: recommended.map((name) => ({
          name: `${name} — ${AGENT_CATALOG[name].description}`,
          value: name,
          checked: true,
        })),
      },
    ]);
    selected.push(...selectedRecommended);
  }

  // Prompt for remaining agents (unchecked)
  if (remaining.length > 0) {
    const { selectedAdditional } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedAdditional',
        message: 'Additional agents (optional):',
        choices: remaining.map((name) => ({
          name: `${name} — ${AGENT_CATALOG[name].description}`,
          value: name,
          checked: false,
        })),
      },
    ]);
    selected.push(...selectedAdditional);
  }

  return selected;
}
