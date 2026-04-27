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
  display.sectionHeader('UNIVERSAL AGENTS');
  for (const agent of UNIVERSAL_AGENTS) {
    display.barLine(`${display.green('✓')} ${display.renderAgentWithBadges(agent)}`);
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
        name: `${cat} — ${AGENT_CATEGORIES[cat].description}`,
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
          name: `${name} — ${AGENT_CATALOG[name].description}`,
          value: name,
          checked: true,
        })),
      },
    ]);
    selected.push(...selectedAgents);
  }

  // Step 3: Offer unselected categories
  const unselectedCategories = categoryNames.filter((cat) => !selectedCategories.includes(cat));

  let additionalCategories = [];
  if (unselectedCategories.length > 0) {
    ({ additionalCategories } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'additionalCategories',
        message: "Any other agent categories you'd like to add? (space to toggle, enter to skip)",
        choices: unselectedCategories.map((cat) => ({
          name: `${cat} — ${AGENT_CATEGORIES[cat].description}`,
          value: cat,
        })),
      },
    ]));

    for (const cat of additionalCategories) {
      const agentNames = AGENT_CATEGORIES[cat].agents;
      const { selectedAgents } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedAgents',
          message: `Fine-tune ${cat} agents? (space to toggle, enter to accept defaults)`,
          choices: agentNames.map((name) => ({
            name: `${name} — ${AGENT_CATALOG[name].description}`,
            value: name,
            checked: true,
          })),
        },
      ]);
      selected.push(...selectedAgents);
    }
  }

  // Deduplicate
  const dedupedSelectedAgents = [...new Set(selected)];

  return {
    selectedAgents: dedupedSelectedAgents,
    selectedCategories,
    additionalCategories,
    preSelectedCategories: [...preSelectedCategories],
  };
}
