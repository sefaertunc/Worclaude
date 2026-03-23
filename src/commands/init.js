import path from 'node:path';
import os from 'node:os';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  readTemplate,
  substituteVariables,
  scaffoldFile,
  mergeSettings,
} from '../core/scaffolder.js';
import { createWorkflowMeta, getPackageVersion, writeWorkflowMeta } from '../core/config.js';
import { dirExists, writeFile, listFilesRecursive } from '../utils/file.js';
import { hashFile } from '../utils/hash.js';
import * as display from '../utils/display.js';
import { promptProjectType } from '../prompts/project-type.js';
import { promptTechStack } from '../prompts/tech-stack.js';
import { promptAgentSelection } from '../prompts/agent-selection.js';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
  NOTIFICATION_COMMANDS,
} from '../data/agents.js';

export async function initCommand() {
  const projectRoot = process.cwd();
  const claudeDir = path.join(projectRoot, '.claude');

  // Step 1: Check for existing setup
  if (await dirExists(claudeDir)) {
    display.warn('Existing .claude/ directory detected.');
    display.info('Scenario B/C handling coming in Phase 3.');
    return;
  }

  // Step 2: Welcome
  const version = await getPackageVersion();
  display.header(`Claude Workflow v${version}`);
  display.newline();

  // Step 3: Interactive prompts
  const { projectName, description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(projectRoot),
    },
    {
      type: 'input',
      name: 'description',
      message: 'One-line description:',
    },
  ]);

  const projectTypes = await promptProjectType();
  const { language, useDocker } = await promptTechStack(projectTypes);
  const selectedAgents = await promptAgentSelection(projectTypes);

  // Step 4: Build settings.json
  const baseSettings = JSON.parse(await readTemplate('settings/base.json'));
  let formatter = 'echo "No formatter configured"';
  const settingsToMerge = [];

  if (language !== 'other') {
    const stackRaw = await readTemplate(`settings/${language}.json`);
    const stackSettings = JSON.parse(stackRaw);
    formatter = stackSettings.formatter || formatter;
    delete stackSettings.formatter;
    settingsToMerge.push(stackSettings);
  }

  if (useDocker) {
    const dockerRaw = await readTemplate('settings/docker.json');
    const dockerSettings = JSON.parse(dockerRaw);
    delete dockerSettings.formatter;
    settingsToMerge.push(dockerSettings);
  }

  const mergedSettings = mergeSettings(baseSettings, ...settingsToMerge);

  // Determine notification command based on OS
  const platform = os.platform();
  const notification =
    NOTIFICATION_COMMANDS[platform] || NOTIFICATION_COMMANDS.linux;

  // Substitute hook placeholders
  const settingsStr = substituteVariables(JSON.stringify(mergedSettings, null, 2), {
    formatter_command: formatter,
    notification_command: notification,
  });

  // Step 5: Build template variables
  const techStackLines = [language !== 'other' ? `- ${language.charAt(0).toUpperCase() + language.slice(1)}` : '- Not specified'];
  if (useDocker) techStackLines.push('- Docker');
  const techStackText = techStackLines.join('\n');

  const commandsText = [
    '```bash',
    '# Add your project-specific commands here',
    '# Example:',
    '#   npm start          # Start dev server',
    '#   npm test           # Run tests',
    '#   npm run build      # Build for production',
    '```',
  ].join('\n');

  const skillsLines = TEMPLATE_SKILLS.map(
    (s) => `- ${s}.md — Fill in with your project specifics`
  );
  const skillsText = skillsLines.join('\n');

  const variables = {
    project_name: projectName,
    description: description || 'A project scaffolded with Claude Workflow',
    tech_stack_filled_during_init: techStackText,
    commands_filled_during_init: commandsText,
    project_specific_skills: skillsText,
    timestamp: new Date().toISOString(),
  };

  // Step 6: Scaffold files
  const spinner = ora('Creating workflow structure...').start();

  try {
    // CLAUDE.md
    await scaffoldFile('claude-md.md', 'CLAUDE.md', variables, projectRoot);
    spinner.text = 'Created CLAUDE.md';

    // .claude/settings.json
    await writeFile(path.join(projectRoot, '.claude', 'settings.json'), settingsStr);
    spinner.text = 'Created .claude/settings.json';

    // Universal agents
    for (const agent of UNIVERSAL_AGENTS) {
      await scaffoldFile(
        `agents/universal/${agent}.md`,
        path.join('.claude', 'agents', `${agent}.md`),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${UNIVERSAL_AGENTS.length} universal agents`;

    // Selected optional agents
    for (const agent of selectedAgents) {
      const category = AGENT_CATALOG[agent].category;
      await scaffoldFile(
        `agents/optional/${category}/${agent}.md`,
        path.join('.claude', 'agents', `${agent}.md`),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${selectedAgents.length} optional agents`;

    // Commands
    for (const cmd of COMMAND_FILES) {
      await scaffoldFile(
        `commands/${cmd}.md`,
        path.join('.claude', 'commands', `${cmd}.md`),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${COMMAND_FILES.length} commands`;

    // Universal skills
    for (const skill of UNIVERSAL_SKILLS) {
      await scaffoldFile(
        `skills/universal/${skill}.md`,
        path.join('.claude', 'skills', `${skill}.md`),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${UNIVERSAL_SKILLS.length} universal skills`;

    // Template skills
    for (const skill of TEMPLATE_SKILLS) {
      await scaffoldFile(
        `skills/templates/${skill}.md`,
        path.join('.claude', 'skills', `${skill}.md`),
        variables,
        projectRoot
      );
    }
    spinner.text = `Created ${TEMPLATE_SKILLS.length} template skills`;

    // .mcp.json
    await scaffoldFile('mcp-json.json', '.mcp.json', {}, projectRoot);
    spinner.text = 'Created .mcp.json';

    // docs/spec/
    await scaffoldFile('progress-md.md', path.join('docs', 'spec', 'PROGRESS.md'), variables, projectRoot);
    await scaffoldFile('spec-md.md', path.join('docs', 'spec', 'SPEC.md'), variables, projectRoot);
    spinner.text = 'Created docs/spec/';

    // Compute file hashes for all .claude/ files
    const fileHashes = {};
    const claudeFiles = await listFilesRecursive(path.join(projectRoot, '.claude'));
    for (const filePath of claudeFiles) {
      const relativePath = path.relative(path.join(projectRoot, '.claude'), filePath);
      if (relativePath !== 'workflow-meta.json' && relativePath !== 'settings.json') {
        fileHashes[relativePath] = await hashFile(filePath);
      }
    }

    // workflow-meta.json
    const meta = createWorkflowMeta({
      version,
      projectTypes,
      techStack: language,
      universalAgents: UNIVERSAL_AGENTS,
      optionalAgents: selectedAgents,
      fileHashes,
    });
    await writeWorkflowMeta(projectRoot, meta);
    spinner.text = 'Created .claude/workflow-meta.json';

    spinner.succeed('Workflow installed successfully!');
  } catch (err) {
    spinner.fail('Failed to create workflow structure');
    display.error(err.message);
    process.exit(1);
  }

  // Step 7: Success message
  display.newline();
  display.success('CLAUDE.md');
  display.success('.claude/settings.json');
  display.success('.claude/workflow-meta.json');
  display.success(`.claude/agents/ (${UNIVERSAL_AGENTS.length} universal + ${selectedAgents.length} optional)`);
  display.success(`.claude/commands/ (${COMMAND_FILES.length})`);
  display.success(`.claude/skills/ (${UNIVERSAL_SKILLS.length} universal + ${TEMPLATE_SKILLS.length} templates)`);
  display.success('.mcp.json');
  display.success('docs/spec/PROGRESS.md');
  display.success('docs/spec/SPEC.md');
  display.newline();
  display.info('Next steps:');
  display.dim('1. Review and customize CLAUDE.md for your project');
  display.dim('2. Fill in your Tech Stack and Commands sections');
  display.dim('3. Fill in project-specific skill templates in .claude/skills/');
  display.dim('4. Write your SPEC.md with project requirements');
  display.dim('5. Start a Claude Code session');
  display.newline();
}
