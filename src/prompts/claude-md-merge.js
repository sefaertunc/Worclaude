import inquirer from 'inquirer';
import * as display from '../utils/display.js';

const SECTION_DETECTORS = [
  {
    name: 'Key Files',
    heading: '## Key Files',
    test: (c) => /PROGRESS\.md/i.test(c) || /Key Files/i.test(c),
  },
  {
    name: 'Session Protocol',
    heading: '## Session Protocol',
    test: (c) =>
      /Session Protocol/i.test(c) || (/\*\*Start:\*\*/i.test(c) && /\*\*End:\*\*/i.test(c)),
  },
  {
    name: 'Critical Rules',
    heading: '## Critical Rules',
    test: (c) => /Critical Rules/i.test(c) || /## Rules/i.test(c),
  },
  {
    name: 'Skills pointer',
    heading: '## Skills',
    test: (c) => /\.claude\/skills\//i.test(c) || /Skills.*read on demand/i.test(c),
  },
  {
    name: 'Gotchas section',
    heading: '## Gotchas',
    test: (c) => /Gotchas/i.test(c),
  },
];

export function detectMissingSections(existingContent) {
  return SECTION_DETECTORS.filter((s) => !s.test(existingContent)).map((s) => s.name);
}

function extractSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.startsWith(heading));
  if (startIdx === -1) return null;

  // Find the next ## heading after this one
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join('\n').trimEnd();
}

export function generateWorkflowSuggestions(existingContent, renderedTemplate) {
  const missing = detectMissingSections(existingContent);

  const lines = [
    '# Claude Workflow — Suggested CLAUDE.md Additions',
    '',
    'The following sections are recommended based on the Claude Code',
    'workflow system. Review and merge what\'s useful into your CLAUDE.md.',
    '',
  ];

  for (const sectionName of missing) {
    const detector = SECTION_DETECTORS.find((s) => s.name === sectionName);
    if (!detector) continue;

    const sectionContent = extractSection(renderedTemplate, detector.heading);
    if (!sectionContent) continue;

    lines.push(`## Suggested: ${sectionName}`);
    lines.push('```');
    lines.push(sectionContent);
    lines.push('```');
    lines.push('');
  }

  if (missing.length === 0) {
    lines.push('Your CLAUDE.md already has all recommended sections. No suggestions needed.');
  }

  return lines.join('\n');
}

export async function promptClaudeMdMerge(existingContent, missingSections) {
  const lineCount = existingContent.split(/\r?\n/).length;

  display.newline();
  display.info(`Your CLAUDE.md (${lineCount} lines) was detected.`);

  if (missingSections.length === 0) {
    display.success('Your CLAUDE.md already has all recommended sections!');
    return 'keep';
  }

  display.newline();
  display.info('The workflow recommends these additions:');
  for (const section of missingSections) {
    display.success(`[+] ${section}`);
  }

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'How would you like to handle CLAUDE.md?',
      choices: [
        { name: 'Keep mine, save suggestions to CLAUDE.md.workflow-suggestions', value: 'keep' },
        { name: 'Merge interactively section by section', value: 'merge-sections' },
      ],
    },
  ]);

  return choice;
}

export async function interactiveSectionMerge(existingContent, renderedTemplate, missingSections) {
  let updatedContent = existingContent;

  for (const sectionName of missingSections) {
    const detector = SECTION_DETECTORS.find((s) => s.name === sectionName);
    if (!detector) continue;

    const sectionContent = extractSection(renderedTemplate, detector.heading);
    if (!sectionContent) continue;

    display.newline();
    display.info(`Section: ${sectionName}`);
    display.dim(sectionContent.split(/\r?\n/).slice(0, 5).join('\n'));
    if (sectionContent.split(/\r?\n/).length > 5) {
      display.dim('  ...');
    }

    const { addSection } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addSection',
        message: `Add "${sectionName}" to your CLAUDE.md?`,
        default: true,
      },
    ]);

    if (addSection) {
      updatedContent = updatedContent.trimEnd() + '\n\n' + sectionContent + '\n';
    }
  }

  return updatedContent;
}
