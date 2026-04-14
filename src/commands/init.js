import path from 'node:path';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  scaffoldFile,
  updateGitignore,
  scaffoldHooks,
  scaffoldPluginJson,
  scaffoldMemoryDocs,
} from '../core/scaffolder.js';
import {
  computeFileHashes,
  createWorkflowMeta,
  getPackageVersion,
  readWorkflowMeta,
  writeWorkflowMeta,
} from '../core/config.js';
import { fileExists, writeFile } from '../utils/file.js';
import * as display from '../utils/display.js';
import { promptProjectType } from '../prompts/project-type.js';
import { promptTechStack } from '../prompts/tech-stack.js';
import { promptAgentSelection } from '../prompts/agent-selection.js';
import { detectScenario, scanExistingSetup } from '../core/detector.js';
import { createBackup } from '../core/backup.js';
import { performMerge, buildSettingsJson } from '../core/merger.js';
import {
  UNIVERSAL_AGENTS,
  AGENT_CATALOG,
  COMMAND_FILES,
  UNIVERSAL_SKILLS,
  TEMPLATE_SKILLS,
  TECH_STACKS,
  CONFIRMATION_STEPS,
  SPEC_MD_TEMPLATE_MAP,
} from '../data/agents.js';
import { buildAgentRoutingSkill } from '../generators/agent-routing.js';

// --- Helper functions ---

const LANGUAGE_COMMANDS = {
  python: {
    heading: 'Python',
    commands: [
      'python -m pytest                # Run tests',
      'ruff check .                    # Lint',
      'ruff format .                   # Format',
    ],
  },
  node: {
    heading: 'Node.js / TypeScript',
    commands: [
      'npm test                        # Run tests',
      'npx eslint .                    # Lint',
      'npx prettier --write .          # Format',
    ],
  },
  java: {
    heading: 'Java',
    commands: [
      'mvn test                        # Run tests',
      'mvn checkstyle:check            # Lint',
      'mvn spotless:apply              # Format',
    ],
  },
  csharp: {
    heading: 'C# / .NET',
    commands: [
      'dotnet test                     # Run tests',
      'dotnet format --verify-no-changes # Lint',
      'dotnet format                   # Format',
    ],
  },
  cpp: {
    heading: 'C / C++',
    commands: [
      'cmake --build build && ctest    # Build & test',
      'clang-tidy src/*.cpp            # Lint',
      'clang-format -i src/*.[ch]pp    # Format',
    ],
  },
  go: {
    heading: 'Go',
    commands: [
      'go test ./...                   # Run tests',
      'golangci-lint run               # Lint',
      'gofmt -w .                      # Format',
    ],
  },
  php: {
    heading: 'PHP',
    commands: [
      'vendor/bin/phpunit              # Run tests',
      'vendor/bin/phpstan analyse      # Lint',
      'vendor/bin/php-cs-fixer fix .   # Format',
    ],
  },
  ruby: {
    heading: 'Ruby',
    commands: [
      'bundle exec rspec               # Run tests',
      'rubocop                         # Lint',
      'rubocop -A                      # Format',
    ],
  },
  kotlin: {
    heading: 'Kotlin',
    commands: [
      'gradle test                     # Run tests',
      'detekt                          # Lint',
      'ktlint -F                       # Format',
    ],
  },
  swift: {
    heading: 'Swift',
    commands: [
      'swift test                      # Run tests',
      'swiftlint                       # Lint',
      'swift-format format -r . -i     # Format',
    ],
  },
  rust: {
    heading: 'Rust',
    commands: [
      'cargo test                      # Run tests',
      'cargo clippy                    # Lint',
      'cargo fmt                       # Format',
    ],
  },
  dart: {
    heading: 'Dart / Flutter',
    commands: [
      'dart test                       # Run tests',
      'dart analyze                    # Lint',
      'dart format .                   # Format',
    ],
  },
  scala: {
    heading: 'Scala',
    commands: [
      'sbt test                        # Run tests',
      'sbt scalafix                    # Lint',
      'scalafmt                        # Format',
    ],
  },
  elixir: {
    heading: 'Elixir',
    commands: [
      'mix test                        # Run tests',
      'mix credo                       # Lint',
      'mix format                      # Format',
    ],
  },
  zig: {
    heading: 'Zig',
    commands: [
      'zig build test                  # Run tests',
      'zig build                       # Build (lint via compiler)',
      'zig fmt .                       # Format',
    ],
  },
};

function buildCommandsBlock(languages, useDocker) {
  const lines = ['```bash'];
  for (const lang of languages) {
    const entry = LANGUAGE_COMMANDS[lang];
    if (!entry) continue;
    if (lines.length > 1) lines.push('');
    lines.push(`# ${entry.heading}`);
    lines.push(...entry.commands);
  }
  if (useDocker) {
    if (lines.length > 1) lines.push('');
    lines.push('# Docker');
    lines.push('docker compose up -d            # Start services');
    lines.push('docker compose down             # Stop services');
  }
  if (lines.length === 1) {
    lines.push('# Add your project-specific commands here');
  }
  lines.push('```');
  return lines.join('\n');
}

// --- Step runner functions ---

async function runProjectInfo(selections) {
  const { projectName, description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: selections.projectName || path.basename(process.cwd()),
    },
    {
      type: 'input',
      name: 'description',
      message: 'One-line description:',
      default: selections.description || undefined,
    },
  ]);
  return { ...selections, projectName, description };
}

async function runProjectType(selections) {
  const projectTypes = await promptProjectType();
  return { ...selections, projectTypes };
}

async function runTechStack(selections) {
  const { languages, useDocker } = await promptTechStack(selections.projectTypes);
  return { ...selections, languages, useDocker };
}

async function runAgents(selections) {
  const selectedAgents = await promptAgentSelection(selections.projectTypes);
  return { ...selections, selectedAgents };
}

async function runOptionalExtras(selections) {
  const { generatePluginJson, scaffoldGtdMemory } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generatePluginJson',
      message: 'Generate .claude-plugin/plugin.json for marketplace compatibility?',
      default: selections.generatePluginJson || false,
    },
    {
      type: 'confirm',
      name: 'scaffoldGtdMemory',
      message: 'Scaffold structured memory files (decisions.md, preferences.md)?',
      default: selections.scaffoldGtdMemory || false,
    },
  ]);
  return { ...selections, generatePluginJson, scaffoldGtdMemory };
}

const STEP_RUNNERS = {
  projectInfo: runProjectInfo,
  projectType: runProjectType,
  techStack: runTechStack,
  agents: runAgents,
  optionalExtras: runOptionalExtras,
};

// --- Confirmation ---

async function showConfirmation(selections) {
  const stackLabels = selections.languages
    .filter((l) => l !== 'other')
    .map((l) => {
      const entry = TECH_STACKS.find((s) => s.value === l);
      return entry ? entry.name : l;
    });
  if (selections.languages.includes('other') && stackLabels.length === 0) {
    stackLabels.push('Other / None');
  }
  if (selections.useDocker) stackLabels.push('Docker');

  const universalCount = UNIVERSAL_AGENTS.length;
  const optionalCount = selections.selectedAgents.length;
  const totalCount = universalCount + optionalCount;

  display.newline();
  display.divider('REVIEW');
  display.newline();
  console.log(
    `  ${'Project'.padEnd(10)}${display.white(selections.projectName)}${selections.description ? display.dimColor(` — ${selections.description}`) : ''}`
  );
  console.log(
    `  ${'Type'.padEnd(10)}${display.renderBadgeList(selections.projectTypes, display.TYPE_BADGES)}`
  );
  console.log(
    `  ${'Stack'.padEnd(10)}${display.renderBadgeList(stackLabels, display.STACK_BADGES)}`
  );
  console.log(
    `  ${'Agents'.padEnd(10)}${display.white(`${universalCount} universal + ${optionalCount} optional`)} ${display.dimColor(`(${totalCount} total)`)}`
  );

  const extrasLabels = [];
  if (selections.generatePluginJson) extrasLabels.push('plugin.json');
  if (selections.scaffoldGtdMemory) extrasLabels.push('memory docs');
  if (extrasLabels.length > 0) {
    console.log(`  ${'Extras'.padEnd(10)}${display.white(extrasLabels.join(', '))}`);
  }

  display.newline();

  const { confirmation } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirmation',
      message: 'Everything look right?',
      choices: [
        { name: 'Yes, install the workflow', value: 'yes' },
        { name: 'No, let me start over', value: 'restart' },
        { name: 'Let me adjust a specific step', value: 'adjust' },
      ],
    },
  ]);

  return confirmation;
}

// --- Shared functions ---

function createInitialSelections(projectRoot) {
  return {
    projectName: path.basename(projectRoot),
    description: '',
    projectTypes: [],
    languages: [],
    useDocker: false,
    selectedAgents: [],
    generatePluginJson: false,
    scaffoldGtdMemory: false,
  };
}

async function runAllSteps(selections) {
  selections = await runProjectInfo(selections);
  selections = await runProjectType(selections);
  selections = await runTechStack(selections);
  selections = await runAgents(selections);
  selections = await runOptionalExtras(selections);
  return selections;
}

async function runInteractivePrompts(projectRoot) {
  let selections = createInitialSelections(projectRoot);

  let confirmed = false;
  let firstRun = true;

  while (!confirmed) {
    if (firstRun) {
      selections = await runAllSteps(selections);
      firstRun = false;
    }

    const confirmation = await showConfirmation(selections);

    if (confirmation === 'yes') {
      confirmed = true;
    } else if (confirmation === 'restart') {
      selections = createInitialSelections(projectRoot);
      display.newline();
      display.info('Starting over...');
      display.newline();
      selections = await runAllSteps(selections);
    } else if (confirmation === 'adjust') {
      const { step } = await inquirer.prompt([
        {
          type: 'list',
          name: 'step',
          message: 'Which step do you want to adjust?',
          choices: CONFIRMATION_STEPS,
        },
      ]);
      selections = await STEP_RUNNERS[step](selections);
    }
  }

  return selections;
}

function buildTemplateVariables(selections) {
  const { projectName, description, languages, useDocker } = selections;

  const techStackLines = languages
    .filter((l) => l !== 'other')
    .map((l) => {
      const entry = TECH_STACKS.find((s) => s.value === l);
      return `- ${entry ? entry.name : l}`;
    });
  if (languages.includes('other') && techStackLines.length === 0) {
    techStackLines.push('- Not specified');
  }
  if (useDocker) techStackLines.push('- Docker');
  const techStackText = techStackLines.join('\n');

  const techStackTableItems = languages
    .filter((l) => l !== 'other')
    .map((l) => {
      const entry = TECH_STACKS.find((s) => s.value === l);
      return entry ? entry.name : l;
    });
  if (languages.includes('other') && techStackTableItems.length === 0) {
    techStackTableItems.push('Not specified');
  }
  const techStackTable = techStackTableItems.join(', ');
  const dockerRow = useDocker ? '\n| Containers   | Docker                            |' : '';

  const commandsText = buildCommandsBlock(languages, useDocker);

  const skillsLines = TEMPLATE_SKILLS.map(
    (s) => `- ${s}/SKILL.md — Run /setup to fill automatically`
  );
  const skillsText = skillsLines.join('\n');

  const memoryArchitectureExtras = selections.scaffoldGtdMemory
    ? '\n- Team decisions: `docs/memory/decisions.md` (version-controlled, shared).\n- Team preferences: `docs/memory/preferences.md` (version-controlled, shared).'
    : '';

  return {
    project_name: projectName,
    description: description || 'A project scaffolded with Worclaude',
    tech_stack_filled_during_init: techStackText,
    tech_stack: techStackText,
    tech_stack_table: techStackTable,
    docker_row: dockerRow,
    commands_filled_during_init: commandsText,
    project_specific_skills: skillsText,
    memory_architecture_extras: memoryArchitectureExtras,
    timestamp: new Date().toISOString(),
  };
}

async function computeAndWriteWorkflowMeta(projectRoot, selections, version) {
  const fileHashes = await computeFileHashes(projectRoot);

  const meta = createWorkflowMeta({
    version,
    projectTypes: selections.projectTypes,
    techStack: selections.languages,
    universalAgents: UNIVERSAL_AGENTS,
    optionalAgents: selections.selectedAgents,
    useDocker: selections.useDocker || false,
    fileHashes,
  });
  await writeWorkflowMeta(projectRoot, meta);
}

// --- Scenario A: Fresh scaffolding ---

async function scaffoldFresh(projectRoot, selections, variables, settingsStr, version) {
  const { selectedAgents, projectTypes } = selections;
  const spinner = ora('Creating workflow structure...').start();

  try {
    await scaffoldFile('core/claude-md.md', 'CLAUDE.md', variables, projectRoot);
    spinner.text = 'Created CLAUDE.md';

    await scaffoldFile('core/agents-md.md', 'AGENTS.md', variables, projectRoot);
    spinner.text = 'Created AGENTS.md';

    await writeFile(path.join(projectRoot, '.claude', 'settings.json'), settingsStr);
    spinner.text = 'Created .claude/settings.json';

    for (const agent of UNIVERSAL_AGENTS) {
      await scaffoldFile(
        `agents/universal/${agent}.md`,
        path.join('.claude', 'agents', `${agent}.md`),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${UNIVERSAL_AGENTS.length} universal agents`;

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

    for (const cmd of COMMAND_FILES) {
      await scaffoldFile(
        `commands/${cmd}.md`,
        path.join('.claude', 'commands', `${cmd}.md`),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${COMMAND_FILES.length} commands`;

    for (const skill of UNIVERSAL_SKILLS) {
      await scaffoldFile(
        `skills/universal/${skill}.md`,
        path.join('.claude', 'skills', skill, 'SKILL.md'),
        {},
        projectRoot
      );
    }
    spinner.text = `Created ${UNIVERSAL_SKILLS.length} universal skills`;

    for (const skill of TEMPLATE_SKILLS) {
      await scaffoldFile(
        `skills/templates/${skill}.md`,
        path.join('.claude', 'skills', skill, 'SKILL.md'),
        variables,
        projectRoot
      );
    }
    spinner.text = `Created ${TEMPLATE_SKILLS.length} template skills`;

    const agentRoutingContent = buildAgentRoutingSkill(selectedAgents, projectTypes);
    await writeFile(
      path.join(projectRoot, '.claude', 'skills', 'agent-routing', 'SKILL.md'),
      agentRoutingContent
    );
    spinner.text = 'Created agent routing guide';

    await scaffoldFile('core/mcp-json.json', '.mcp.json', {}, projectRoot);
    spinner.text = 'Created .mcp.json';

    await updateGitignore(projectRoot);
    spinner.text = 'Updated .gitignore';

    const progressPath = path.join(projectRoot, 'docs', 'spec', 'PROGRESS.md');
    const specPath = path.join(projectRoot, 'docs', 'spec', 'SPEC.md');
    const skipped = { progressMd: false, specMd: false };

    if (!(await fileExists(progressPath))) {
      await scaffoldFile(
        'core/progress-md.md',
        path.join('docs', 'spec', 'PROGRESS.md'),
        variables,
        projectRoot
      );
    } else {
      skipped.progressMd = true;
    }
    if (!(await fileExists(specPath))) {
      const primaryType = projectTypes[0];
      const specTemplate = SPEC_MD_TEMPLATE_MAP[primaryType] || 'specs/spec-md.md';
      await scaffoldFile(
        specTemplate,
        path.join('docs', 'spec', 'SPEC.md'),
        variables,
        projectRoot
      );
    } else {
      skipped.specMd = true;
    }
    spinner.text = 'Created docs/spec/';

    // Create sessions directory for session persistence
    await writeFile(path.join(projectRoot, '.claude', 'sessions', '.gitkeep'), '');
    spinner.text = 'Created .claude/sessions/';

    // Copy hook scripts (.claude/hooks/)
    await scaffoldHooks(projectRoot);
    spinner.text = 'Created .claude/hooks/';

    // Create learnings directory for correction capture
    await writeFile(path.join(projectRoot, '.claude', 'learnings', '.gitkeep'), '');
    spinner.text = 'Created .claude/learnings/';

    // Opt-in: plugin.json for Claude Code marketplace compatibility
    if (selections.generatePluginJson) {
      await scaffoldPluginJson(projectRoot, selections);
      spinner.text = 'Created .claude-plugin/plugin.json';
    }

    // Opt-in: GTD memory scaffold (docs/memory/decisions.md, preferences.md)
    if (selections.scaffoldGtdMemory) {
      await scaffoldMemoryDocs(projectRoot);
      spinner.text = 'Created docs/memory/';
    }

    await computeAndWriteWorkflowMeta(projectRoot, selections, version);
    spinner.text = 'Created .claude/workflow-meta.json';

    spinner.succeed('Workflow installed successfully!');
    return skipped;
  } catch (err) {
    spinner.fail('Failed to create workflow structure');
    display.error(err.message);
    process.exit(1);
  }
}

function displayFreshSuccess(selections, skipped) {
  const totalAgents = UNIVERSAL_AGENTS.length + selections.selectedAgents.length;
  const totalSkills = UNIVERSAL_SKILLS.length + TEMPLATE_SKILLS.length + 1; // +1 for agent-routing.md

  display.newline();
  display.success('CLAUDE.md');
  display.success('AGENTS.md');
  display.success('.claude/settings.json');
  display.success('.claude/workflow-meta.json');
  display.success(`.claude/agents/${display.dimColor(`        ${totalAgents} agents`)}`);
  display.success(`.claude/commands/${display.dimColor(`      ${COMMAND_FILES.length} commands`)}`);
  display.success(`.claude/skills/${display.dimColor(`        ${totalSkills} skills`)}`);
  display.success('.claude/sessions/');
  display.success('.claude/hooks/');
  if (selections.generatePluginJson) {
    display.success('.claude-plugin/plugin.json');
  }
  if (selections.scaffoldGtdMemory) {
    display.success('docs/memory/' + display.dimColor('           decisions.md, preferences.md'));
  }
  display.success('.mcp.json');
  display.success('.gitignore');
  if (skipped.progressMd) {
    display.dim('  docs/spec/PROGRESS.md — already exists, skipped');
  }
  if (skipped.specMd) {
    display.dim('  docs/spec/SPEC.md — already exists, skipped');
  }
  if (!skipped.progressMd && !skipped.specMd) {
    display.success(`docs/spec/${display.dimColor('             PROGRESS.md, SPEC.md')}`);
  }

  display.newline();
  display.divider('NEXT');
  display.newline();
  console.log(`  ${display.white('1.')} Start a Claude Code session in this project`);
  console.log(
    `  ${display.white('2.')} Run ${display.purple('/setup')} — Claude will interview you about your project`
  );
  console.log(`     and fill in all configuration files automatically`);
  console.log(`  ${display.white('3.')} Review CLAUDE.md and adjust if needed`);
  console.log(`  ${display.white('4.')} Start building!`);
  display.newline();
  console.log(
    `  ${display.yellow('TIP')} ${display.dimColor(`${display.purple('/setup')} is the fastest way to configure. ~5 minutes.`)}`
  );
  display.newline();
}

// --- Scenario B: Detection report and merge report ---

function displayDetectionReport(scan) {
  display.sectionHeader('DETECTED SETUP');

  const dot = (label, width = 26) => label + ' ' + '.'.repeat(width - label.length) + ' ';

  display.barLine(
    `${display.dimColor(dot('CLAUDE.md'))}${scan.hasClaudeMd ? display.white(`exists (${scan.claudeMdLineCount} lines)`) : display.dimColor('not found')}`
  );
  display.barLine(
    `${display.dimColor(dot('.claude/settings.json'))}${scan.hasSettingsJson ? display.white('exists') : display.dimColor('not found')}`
  );
  display.barLine(
    `${display.dimColor(dot('.claude/skills/'))}${scan.existingSkills.length > 0 ? display.white(`${scan.existingSkills.length} files found`) : display.dimColor('not found')}`
  );
  display.barLine(
    `${display.dimColor(dot('.claude/agents/'))}${scan.existingAgents.length > 0 ? display.white(`${scan.existingAgents.length} files found`) : display.dimColor('not found')}`
  );
  display.barLine(
    `${display.dimColor(dot('.claude/commands/'))}${scan.existingCommands.length > 0 ? display.white(`${scan.existingCommands.length} files found`) : display.dimColor('not found')}`
  );
  display.barLine(
    `${display.dimColor(dot('.mcp.json'))}${scan.hasMcpJson ? display.white('exists') : display.dimColor('not found')}`
  );
  display.newline();
  display.info('A backup will be created before any changes.');
  display.newline();
}

function displayMergeReport(report, backupPath) {
  display.newline();

  // Tier 1 — Added
  if (
    report.added.agents.length > 0 ||
    report.added.commands.length > 0 ||
    report.added.skills.length > 0
  ) {
    display.barLine(`${display.green('+')} Added automatically:`);
    if (report.added.agents.length > 0) {
      display.barLine(`  ${display.green('✓')} ${report.added.agents.length} agents added`);
    }
    if (report.added.commands.length > 0) {
      display.barLine(`  ${display.green('✓')} ${report.added.commands.length} commands added`);
    }
    if (report.added.skills.length > 0) {
      display.barLine(
        `  ${display.green('✓')} ${report.added.skills.length} skills added${report.conflicts.skills.length > 0 ? ` (${report.conflicts.skills.length} conflicts saved as .workflow-ref.md)` : ''}`
      );
    }
    if (report.added.permissions > 0) {
      display.barLine(
        `  ${display.green('✓')} ${report.added.permissions} permission rules appended to settings.json`
      );
    }
    if (report.added.hooks > 0) {
      display.barLine(`  ${display.green('✓')} ${report.added.hooks} hooks added to settings.json`);
    }
    display.newline();
  }

  // Tier 2 — Conflicts
  const allConflicts = [
    ...report.conflicts.skills,
    ...report.conflicts.agents,
    ...report.conflicts.commands,
  ];
  if (allConflicts.length > 0) {
    display.barLine(`${display.yellow('~')} Conflicts (saved alongside for review):`);
    for (const file of allConflicts) {
      const refName = file.replace('.md', '.workflow-ref.md');
      display.barLine(`  ${display.yellow('⚠')} ${file} → ${refName}`);
    }
    display.newline();
  }

  // Tier 3 — Hook conflicts
  if (report.hookConflicts.length > 0) {
    display.barLine(`Hook conflicts resolved:`);
    for (const desc of report.hookConflicts) {
      display.barLine(`  ${display.dimColor(desc)}`);
    }
    display.newline();
  }

  // CLAUDE.md handling
  if (report.claudeMdHandling === 'suggestions-generated') {
    display.success('Suggestions saved to CLAUDE.md.workflow-suggestions');
  } else if (report.claudeMdHandling === 'merged-sections') {
    display.success('CLAUDE.md updated with selected sections');
  } else if (report.claudeMdHandling === 'created') {
    display.success('CLAUDE.md created');
  }

  // Memory Architecture Tier 3 notice
  if (report.memoryArchitectureSectionExists) {
    display.newline();
    display.info(
      'docs/memory/ scaffolded, but your CLAUDE.md already has a Memory Architecture section.'
    );
    display.dim('  Add these lines manually if you want pointer bullets:');
    display.dim('    - Team decisions: `docs/memory/decisions.md` (version-controlled, shared).');
    display.dim(
      '    - Team preferences: `docs/memory/preferences.md` (version-controlled, shared).'
    );
  }

  // Skipped
  if (report.skipped.progressMd) {
    display.dim('  docs/spec/PROGRESS.md — already exists, skipped');
  }
  if (report.skipped.specMd) {
    display.dim('  docs/spec/SPEC.md — already exists, skipped');
  }

  // Summary
  display.newline();
  if (backupPath) {
    display.dim(`  Backup: ${path.basename(backupPath)}/`);
  }

  display.newline();
  display.divider('NEXT');
  display.newline();
  if (allConflicts.length > 0) {
    console.log(`  ${display.white('1.')} Review .workflow-ref.md files and merge what's useful`);
  }
  if (report.claudeMdHandling === 'suggestions-generated') {
    console.log(`  ${display.white('2.')} Review CLAUDE.md.workflow-suggestions`);
    console.log(
      `  ${display.white('3.')} Delete .workflow-ref.md and .workflow-suggestions files when done`
    );
  }
  console.log(
    `  Run ${display.purple('/setup')} in Claude Code for project-specific configuration`
  );
  display.newline();
}

// --- Main command ---

export async function initCommand() {
  const projectRoot = process.cwd();

  // Step 1: Detect scenario
  const scenario = await detectScenario(projectRoot);

  if (scenario === 'upgrade') {
    const meta = await readWorkflowMeta(projectRoot);
    display.info(`This project was initialized with Worclaude v${meta?.version || 'unknown'}.`);
    display.info('Use `worclaude upgrade` to update.');
    return;
  }

  // Step 2: Welcome
  const version = await getPackageVersion();
  display.banner(version);

  // Windows guidance: hooks require Git Bash
  if (process.platform === 'win32') {
    display.info(
      'Windows detected \u2014 hooks require Git for Windows (Git Bash). See: https://gitforwindows.org'
    );
    display.newline();
  }

  // Step 3: If existing project, show detection report and confirm
  let existingScan = null;
  let backupPath = null;

  if (scenario === 'existing') {
    existingScan = await scanExistingSetup(projectRoot);
    displayDetectionReport(existingScan);

    const { proceed } = await inquirer.prompt([
      {
        type: 'list',
        name: 'proceed',
        message: 'Proceed with workflow installation?',
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      },
    ]);

    if (!proceed) {
      display.info('Installation cancelled.');
      return;
    }

    const spinner = ora('Creating backup...').start();
    backupPath = await createBackup(projectRoot);
    spinner.succeed(`Backed up to ${path.basename(backupPath)}/`);
    display.newline();
  }

  // Step 4: Interactive prompts (shared between A and B)
  const selections = await runInteractivePrompts(projectRoot);

  // Step 5: Build template variables
  const variables = buildTemplateVariables(selections);

  // Step 6: Branch by scenario
  if (scenario === 'fresh') {
    const { settingsStr } = await buildSettingsJson(selections.languages, selections.useDocker);
    const skipped = await scaffoldFresh(projectRoot, selections, variables, settingsStr, version);
    displayFreshSuccess(selections, skipped);
  } else {
    // Scenario B: merge
    const spinner = ora('Merging workflow...').start();
    try {
      const report = await performMerge(projectRoot, existingScan, selections, variables, {
        spinner,
      });
      await updateGitignore(projectRoot);
      await computeAndWriteWorkflowMeta(projectRoot, selections, version);
      spinner.succeed('Workflow merged successfully!');
      displayMergeReport(report, backupPath);
    } catch (err) {
      spinner.fail('Failed to merge workflow');
      display.error(err.message);
      process.exit(1);
    }
  }
}
