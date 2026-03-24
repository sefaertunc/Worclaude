import inquirer from 'inquirer';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  AGENT_CATEGORIES,
  PROJECT_TYPE_TO_CATEGORIES,
} from '../data/agents.js';
import * as display from '../utils/display.js';

export async function promptAgentSelection(projectTypes) {
  // Show universal agents (informational)
  display.newline();
  display.info('Universal agents (always installed):');
  for (const agent of UNIVERSAL_AGENTS) {
    display.success(agent);
  }
  display.newline();

  // Derive pre-selected categories from project types
  const preSelectedCategories = new Set();
  for (const type of projectTypes) {
    const cats = PROJECT_TYPE_TO_CATEGORIES[type] || [];
    for (const cat of cats) {
      preSelectedCategories.add(cat);
    }
  }

  // Step 1: Category selection
  const categoryNames = Object.keys(AGENT_CATEGORIES);
  const { selectedCategories } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedCategories',
      message: 'Which agent categories do you need? (space to toggle)',
      choices: categoryNames.map((cat) => ({
        name: `${cat.padEnd(16)}— ${AGENT_CATEGORIES[cat].description}`,
        value: cat,
        checked: preSelectedCategories.has(cat),
      })),
    },
  ]);

  // Step 2: Fine-tune each selected category
  const selected = [];

  for (const cat of selectedCategories) {
    const agentNames = AGENT_CATEGORIES[cat].agents;
    const { selectedAgents } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedAgents',
        message: `Fine-tune ${cat} agents? (space to toggle, enter to accept defaults)`,
        choices: agentNames.map((name) => ({
          name: `${name.padEnd(24)}— ${AGENT_CATALOG[name].description}`,
          value: name,
          checked: true,
        })),
      },
    ]);
    selected.push(...selectedAgents);
  }

  // Deduplicate
  return [...new Set(selected)];
}
