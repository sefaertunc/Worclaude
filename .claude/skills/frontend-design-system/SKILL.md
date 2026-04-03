---
description: "Terminal UI patterns: display.js visual system, Chalk styling, Ora spinners, Inquirer prompts, and CLI output conventions for worclaude"
---

# Terminal UI Conventions

worclaude has no web frontend. This skill covers the terminal UI system — the equivalent of a design system for CLI output: display utilities, styling, interactive prompts, and spinner management.

## Display System (src/utils/display.js)

All user-facing output goes through the `display` namespace. Import as:
```js
import * as display from '../utils/display.js';
```

### Bold + Badges visual system
The CLI uses a "Bold + Badges" restyle for all output. Key display functions:
- `display.success(msg)` — green checkmark + message
- `display.error(msg)` — red styled error
- `display.info(msg)` — info badge
- `display.warning(msg)` — warning badge
- `display.newline()` — empty line for spacing
- `display.header(title)` — section headers with styling

**Rule:** Never use `console.log()` for user-facing output. Always `display.*`. Console is only acceptable in test files.

## Chalk Styling

Using Chalk ^5.4.1 (ESM-only version). Colors are applied via `chalk.hex()` for brand-consistent styling, not via named colors.

No custom theme object — colors are defined inline in `display.js` functions. If you add a new display function, match the existing visual weight and color scheme.

## Ora Spinners

Spinners provide progress feedback during non-interactive operations (file copying, backup creation, merge processing).

### Critical rule: spinner/prompt ordering
Ora spinners must be **stopped before** any Inquirer prompt fires. If a spinner is animating when Inquirer renders a prompt, the terminal gets corrupted.

```js
// CORRECT
spinner.stop();  // or spinner.succeed() / spinner.fail()
const answer = await inquirer.prompt([...]);
spinner = ora('Continuing...').start();

// WRONG — terminal corruption
// spinner is still running
const answer = await inquirer.prompt([...]);
```

### Spinner lifecycle
```js
const spinner = ora('Creating backup...').start();
try {
  await doWork();
  spinner.succeed('Backup created');
} catch (err) {
  spinner.fail('Backup failed');
  display.error(err.message);
}
```

## Inquirer Prompts (src/prompts/)

Using Inquirer ^12.5.0. Prompts are isolated in `src/prompts/` — one file per prompt group:
- `project-type.js` — multi-select project type with redundancy warnings
- `tech-stack.js` — multi-select languages + Docker question
- `agent-selection.js` — two-step category → fine-tune selection
- `conflict-resolution.js` — hook conflict resolution (keep/replace/chain)
- `claude-md-merge.js` — CLAUDE.md merge strategy selection

### Prompt patterns
- Multi-select uses checkbox prompt with inline descriptions
- Confirmation uses list prompt with explicit options (not y/n) — prevents random text input
- Redundancy detection: when overlapping selections detected, show warning as a confirm prompt with go-back option

### Confirm prompt rule
Use list-based confirmation (explicit choices), not simple confirm (y/n). This was a bug fix — simple y/n confirms accepted random text as "no".

```js
// CORRECT
{ type: 'list', choices: ['Yes, install', 'No, let me start over', 'Let me adjust'] }

// AVOID for important decisions
{ type: 'confirm' }  // accepts any non-y input as "no"
```

## Output Structure

### Init flow output
```
Header → Project info prompts → Type selection → Stack selection → Agent selection →
Confirmation review → Spinner (scaffolding) → File creation list → Next steps
```

### Status/diff output
Uses indented, aligned display with consistent badge formatting. File status indicators: `✓` (success), `~` (modified), `-` (missing), `+` (extra).

### Next steps pattern
Every command that modifies files ends with a "Next steps" section — numbered list of what the user should do next. `/setup` is always listed as the primary next step after `init`.
