# Implementation Prompt: Phase 1 UX Fixes — Round 2

## Context
Read `docs/spec/SPEC.md` and `docs/spec/PROGRESS.md` for context.

Phase 1 UX improvements are implemented but testing revealed issues that need fixing. These are UX/display fixes and content quality improvements.

---

## Fix 1: Hints Must Be Visible DURING Selection, Not After

**Problem:** The "Not sure?" hint for project type, the language hint, and the Docker hint all appear AFTER the user submits their selection. They need to be visible WHILE the user is choosing.

**Fix:** For Inquirer.js checkbox/list prompts, use the `message` property to include the hint text as part of the prompt itself, or use the `suffix` property. The hint should be visible on screen before the user makes any selection.

For project type:
```
? What type of project is this? (space to toggle, enter to confirm)
  ℹ Not sure? Pick what's closest. You can add/remove agents later.

  ◻ Full-stack web       — Frontend + backend in one repo
  ...
```

For language:
```
? Primary language(s) / runtime: (space to toggle, enter to confirm)
  ℹ This sets tool permissions and formatters. Update anytime via settings.json.

  ◻ Python
  ...
```

For Docker:
```
? Do you use Docker currently? (y/N)
  ℹ If you add Docker later, run `claude-workflow upgrade`.
```

The redundancy warning for Full-stack + Backend/Frontend should also appear dynamically DURING selection if possible. If Inquirer.js doesn't support dynamic messages during checkbox selection, show it immediately after with a prompt to continue or go back:
```
  ⚠ "Full-stack web" already includes backend and frontend.
    You may not need both. Continue anyway? (Y/n)
```

## Fix 2: Unselected Agent Categories Must Still Be Offered

**Problem:** After category selection, only selected categories get the fine-tune step. Agents from unselected categories are completely hidden — the user never sees them.

**Fix:** After fine-tuning selected categories, add one more prompt:

```
? Any other agent categories you'd like to add? (space to toggle, enter to skip)
  ◻ DevOps          — ci-fixer, docker-helper, deploy-validator, dependency-manager
  ◻ Documentation   — doc-writer, changelog-generator
  ◻ Data / AI       — data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer
```

Only show categories that were NOT already selected. If the user selects additional categories here, run the fine-tune step for those too. If they press enter without selecting any, move on.

This ensures every agent is reachable while keeping the default flow fast.

## Fix 3: Fix Column Spacing in Selections

**Problem:** Large horizontal gaps between selection labels and descriptions. Inquirer.js is padding columns too aggressively.

**Fix:** Use a simpler format. Instead of trying to align columns, use a dash separator with consistent short spacing:

```
  ◻ Full-stack web — Frontend + backend in one repo
  ◻ Backend / API — Server, REST/GraphQL, no frontend
```

NOT:
```
  ◻ Full-stack web       — Frontend + backend in one repo
  ◻ Backend / API                                          — Server, REST/GraphQL, no frontend
```

Check how the `name` property is set in the Inquirer.js choices array. If names are being padded with spaces for alignment, remove the padding. Use the format: `"Backend / API — Server, REST/GraphQL, no frontend"` as a single string for the `name` property, not separate columns.

If descriptions are being built with `.padEnd()` or similar string padding, remove it. Let the terminal handle natural text flow.

## Fix 4: Reorder Next Steps — /setup First

**Problem:** Next steps show `/setup` as step 2. It should be the most prominent action.

**Fix:** Reorder and emphasize:

```
  ✓ Workflow installed successfully!

  ℹ What to do next:

    1. Start a Claude Code session in this project
    2. Run /setup — Claude will interview you about your project
       and fill in all configuration files automatically
    3. Review CLAUDE.md and adjust if needed
    4. Start building!

  ℹ Tip: The /setup command is the fastest way to configure
    your project. It takes about 5 minutes.
```

Make `/setup` the hero action. Remove "Write your SPEC.md with project requirements" — that's what `/setup` does. Remove "Fill in project-specific skill templates" — that's also what `/setup` does.

## Fix 5: Verify /setup Command File

**Problem:** User couldn't call `/setup` in Claude Code.

**Fix:** Verify these things:
1. The file exists at `templates/commands/setup.md` in the source
2. It gets scaffolded to `.claude/commands/setup.md` in the target project
3. The filename is exactly `setup.md` (not `setup-command.md` or similar)
4. The scaffolder copies it along with the other 9 commands

Claude Code slash commands are invoked by the filename without extension. File named `setup.md` → invoked as `/setup`.

Test after fixing:
```bash
ls -la .claude/commands/setup.md
cat .claude/commands/setup.md
```

Make sure the file has content (not empty) and is properly formatted markdown.

## Fix 6: SPEC.md Tech Stack Table Broken by Multi-Line Content

**Problem:** When multiple languages are selected, the Tech Stack table in SPEC.md breaks:
```
| Language    | - Python
- Node.js / TypeScript
- Docker   |
```
The multi-line list breaks the markdown table formatting.

**Fix:** Format multiple selections as a comma-separated list within the table cell:
```
| Language    | Python, Node.js / TypeScript |
```
Or use a simple bulleted list outside the table. Either way, the markdown must render correctly. Also, Docker is not a language — it should be in a separate row (e.g., "Containers" or "Infrastructure"), not in the Language row.

## Fix 7: CLAUDE.md Commands Section is Generic

**Problem:** The Commands section shows placeholder comments:
```bash
# Add your project-specific commands here
# Example:
#   npm start          # Start dev server
```

When the user selected Python + Node.js, the init should pre-fill with relevant starter commands based on the selected tech stack.

**Fix:** Generate stack-specific starter commands. For example, if Python + Node selected:
```bash
# Python
python -m pytest                # Run tests
ruff check .                    # Lint
ruff format .                   # Format

# Node.js / TypeScript
npm test                        # Run tests
npx eslint .                    # Lint
npx prettier --write .          # Format

# Docker
docker compose up -d            # Start services
docker compose down             # Stop services
```

Map each tech stack selection to its common commands. These are starter suggestions the user refines — better than an empty placeholder.

## Fix 8: CLAUDE.md Skills Section — Better Text for Template Skills

**Problem:** Template skills say "Fill in with your project specifics" which gives the user no guidance.

**Fix:** Change the text to point users to `/setup`:
```
- backend-conventions.md — Run /setup to fill automatically
- frontend-design-system.md — Run /setup to fill automatically
- project-patterns.md — Run /setup to fill automatically
```

This connects the dots between the template placeholders and the `/setup` command that fills them.

---

## Verification

After all fixes, test the full flow again:

```bash
rm -rf /tmp/test-workflow && mkdir /tmp/test-workflow && cd /tmp/test-workflow && git init
node /home/sefa/SEFA/GIT/Claude-Workflow/src/index.js init
```

Checklist:
- [ ] "Not sure?" hint visible DURING project type selection
- [ ] Language hint visible DURING language selection  
- [ ] Docker hint visible DURING Docker question
- [ ] Redundancy warning appears when selecting Full-stack + Backend
- [ ] Category-based agent selection shows recommended pre-selected
- [ ] After fine-tuning selected categories, unselected categories are offered
- [ ] No excessive column spacing — compact, readable format
- [ ] Next steps show /setup as the primary action
- [ ] .claude/commands/setup.md exists and has content
- [ ] SPEC.md Tech Stack table renders correctly with multiple languages
- [ ] Docker is not listed as a "Language" in SPEC.md
- [ ] CLAUDE.md Commands section has stack-specific starter commands
- [ ] CLAUDE.md Skills section says "Run /setup to fill automatically" for templates
- [ ] All existing tests still pass
- [ ] Run `npm test` and `npm run lint`
