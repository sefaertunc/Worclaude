import inquirer from 'inquirer';
import * as display from '../utils/display.js';

export async function promptHookConflict(hookCategory, existingHook, workflowHook, options = {}) {
  display.newline();
  display.warn(`Hook conflict: ${hookCategory} matcher "${existingHook.matcher}"`);
  display.dim(`  Existing: ${existingHook.hooks[0].command}`);
  display.dim(`  Workflow: ${workflowHook.hooks[0].command}`);

  // Non-interactive: preserve the user's existing hook. Safer than "replace"
  // during scripted upgrades — never silently clobbers customizations.
  if (options.yes) {
    display.dim('  --yes: kept existing hook (non-interactive default).');
    return 'keep';
  }

  const { resolution } = await inquirer.prompt([
    {
      type: 'list',
      name: 'resolution',
      message: 'How would you like to resolve this?',
      choices: [
        { name: 'Keep existing hook', value: 'keep' },
        { name: 'Replace with workflow hook', value: 'replace' },
        { name: 'Chain both (existing && workflow)', value: 'chain' },
      ],
    },
  ]);

  return resolution;
}
