import inquirer from 'inquirer';
import * as display from '../utils/display.js';

export async function promptHookConflict(hookCategory, existingHook, workflowHook) {
  display.newline();
  display.warn(`Hook conflict: ${hookCategory} matcher "${existingHook.matcher}"`);
  display.dim(`  Existing: ${existingHook.hooks[0].command}`);
  display.dim(`  Workflow: ${workflowHook.hooks[0].command}`);

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
