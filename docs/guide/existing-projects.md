# Existing Projects

If your project already has some Claude Code configuration -- a `CLAUDE.md`, a `.claude/` directory, an `.mcp.json`, or any combination -- Worclaude detects it and uses a smart merge strategy instead of overwriting your work. This page explains exactly how that works.

## How Detection Works

When you run `worclaude init`, the detector checks three things:

1. Does `.claude/workflow-meta.json` exist? If yes, this project was previously set up by Worclaude -- you will be redirected to use `worclaude upgrade` instead.
2. Does `.claude/`, `CLAUDE.md`, or `.mcp.json` exist (but no `workflow-meta.json`)? If yes, this is an existing project with manual Claude Code configuration -- **Scenario B**.
3. None of the above exist? This is a fresh project -- **Scenario A** (covered in [Getting Started](/guide/getting-started)).

This page covers Scenario B.

## What Gets Detected

When Worclaude detects an existing setup, it scans your project and shows a report:

```
  Worclaude v1.1.0
  ─────────────────────

  Detected existing Claude Code setup:

  CLAUDE.md ................. exists (38 lines)
  .claude/settings.json ..... exists
  .claude/skills/ ........... 9 files found
  .claude/agents/ ........... not found
  .claude/commands/ ......... not found
  .mcp.json ................. exists

  A backup will be created before any changes.

? Proceed? (Y/n)
```

The detector examines:

- **CLAUDE.md** -- Whether it exists and how many lines it contains
- **.claude/settings.json** -- Whether permissions and hooks are already configured
- **.claude/skills/** -- Which skill files you have
- **.claude/agents/** -- Which agent files you have
- **.claude/commands/** -- Which command files you have
- **.mcp.json** -- Whether MCP server configuration exists
- **docs/spec/PROGRESS.md** and **docs/spec/SPEC.md** -- Whether spec documents exist

## Automatic Backup

Before making any changes, Worclaude creates a timestamped backup of your entire Claude Code setup:

```
  Creating backup...
  ✓ Backed up to .claude-backup-20260323-143022/
```

The backup contains copies of `CLAUDE.md`, the entire `.claude/` directory, and `.mcp.json`. If anything goes wrong, you can restore from this backup using `worclaude restore`.

After the backup, Worclaude runs the same interactive prompts as a fresh install (project name, description, project type, tech stack, agent selection). Your answers determine what the workflow wants to install.

## The Three Merge Tiers

Worclaude uses a tiered merge strategy designed to never destroy your work. Each file falls into one of three tiers based on whether a conflict exists.

### Tier 1: Additive (Automatic, No Prompt)

Files that do not conflict with anything you already have are added silently:

- **Missing skills** are added directly to `.claude/skills/`
- **Missing agents** are added to `.claude/agents/` (both universal and your selected optional agents)
- **Missing commands** are added to `.claude/commands/`
- **settings.json permissions** -- new permission rules are appended to your existing allow list without removing any of your existing rules
- **settings.json hooks** -- new hooks are appended if their matcher does not conflict with an existing hook
- **.mcp.json** -- missing MCP servers are added; your existing servers take priority if there is a name collision
- **docs/spec/PROGRESS.md** -- created if missing, skipped if it already exists
- **docs/spec/SPEC.md** -- created if missing, skipped if it already exists
- **.claude/workflow-meta.json** -- always created (this is how Worclaude tracks that it has been installed)

### Tier 2: Safe Alongside (Notify, Do Not Ask)

When Worclaude wants to install a file that you already have (for example, a skill or agent with the same name), it does not overwrite yours. Instead, it saves the workflow version alongside your file with a `.workflow-ref.md` suffix:

- Your `context-management.md` stays untouched
- The workflow version is saved as `context-management.workflow-ref.md`

This applies to conflicting skills, agents, and commands. You get a notification in the final report but are never prompted to choose during the merge.

```
  Conflicts (saved alongside for review):
  ~ context-management.md → context-management.workflow-ref.md
  ~ git-conventions.md → git-conventions.workflow-ref.md
  ~ testing.md → testing.workflow-ref.md
```

### Tier 3: Interactive (Asks You)

Two types of conflicts require your input:

**Hook conflicts** -- When an existing hook has the same matcher as a workflow hook but a different command, Worclaude asks what to do:

- **Replace** -- Use the workflow hook
- **Chain** -- Combine both hooks with `&&`
- **Keep** -- Keep your existing hook

**CLAUDE.md** -- This gets special handling (see below).

## CLAUDE.md Special Handling

Your `CLAUDE.md` is the most important file in your Claude Code setup. Worclaude treats it with extra care.

First, Worclaude checks which recommended sections your `CLAUDE.md` is missing. The recommended sections are: Session Protocol, Critical Rules, Skills pointer, and Gotchas.

If your `CLAUDE.md` already has all recommended sections, Worclaude tells you and moves on without any changes.

If sections are missing, you are given three options:

```
  Your CLAUDE.md (38 lines) was detected.

  The workflow recommends these additions:
  [+] Session Protocol section (Start/During/End)
  [+] Critical Rules: self-healing, subagent usage
  [+] Skills pointer section (progressive disclosure)
  [+] Gotchas section (empty, grows during development)

? How would you like to handle CLAUDE.md?
  ◉ Keep mine, save suggestions to CLAUDE.md.workflow-suggestions
  ○ Show me a side-by-side comparison
  ○ Merge interactively section by section
```

**Option 1 (default): Keep yours, save suggestions** -- Your `CLAUDE.md` is untouched. A `CLAUDE.md.workflow-suggestions` file is created next to it with the recommended additions. You can review and manually integrate what you want.

**Option 2: Side-by-side comparison** -- See your version and the workflow version side by side to understand the differences.

**Option 3: Interactive section merge** -- Go through each missing section and decide whether to append it to your `CLAUDE.md`.

## After the Merge

When the merge completes, you see a full report:

```
  Merge complete!

  Added automatically:
  ✓ 9 agents added
  ✓ 12 commands added
  ✓ 6 skills added (3 conflicts saved as .workflow-ref.md)
  ✓ 18 permission rules appended to settings.json
  ✓ 3 hooks added to settings.json

  Conflicts (saved alongside for review):
  ~ context-management.md → context-management.workflow-ref.md
  ~ git-conventions.md → git-conventions.workflow-ref.md
  ~ testing.md → testing.workflow-ref.md

  Suggestions:
  ~ CLAUDE.md.workflow-suggestions (review and merge manually)

  Backup: .claude-backup-20260323-143022/

  What to do next:

  1. Review .workflow-ref.md files and merge what's useful
  2. Review CLAUDE.md.workflow-suggestions
  3. Delete .workflow-ref.md and .workflow-suggestions files when done
  Run /setup in Claude Code for project-specific configuration
```

### Reviewing `.workflow-ref.md` Files

These files contain the workflow's version of files you already had. Open them side by side with your versions and merge anything useful. For example, the workflow's `testing.md` might have testing patterns you have not considered.

Once you have merged what you want, delete the `.workflow-ref.md` files -- they are reference copies, not active configuration.

### Reviewing `CLAUDE.md.workflow-suggestions`

If you chose to keep your `CLAUDE.md`, the suggestions file contains the sections Worclaude recommends adding. Review each section and copy what fits your workflow into your actual `CLAUDE.md`.

Delete the file when you are done.

### Running `/setup`

After the merge, start Claude Code and run `/setup`. This conversational interview fills in the template skills and other placeholder content with your project's real details. It works the same way whether you did a fresh install or a merge.

## Restoring from Backup

If something went wrong or you want to undo the merge entirely:

```bash
worclaude restore
```

This shows your available backups and lets you restore one. The restore replaces your current Claude Code setup with the backup contents.

## Next Steps

- [Upgrading](/guide/upgrading) -- How to update when new Worclaude versions are released
- [Workflow Tips](/guide/workflow-tips) -- Best practices for using the workflow after setup
- [Getting Started](/guide/getting-started) -- For fresh projects without existing configuration
