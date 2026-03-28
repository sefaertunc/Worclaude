# SPEC.md — Worclaude CLI

## Product Overview

**worclaude** is a CLI tool that scaffolds a comprehensive Claude Code workflow system into any project. It installs agents, skills, slash commands, hooks, permissions, and configuration files derived from 53 tips by Boris Cherny (creator of Claude Code at Anthropic).

**Version:** 1.3.5
**Install:** `npm install -g worclaude`
**Usage:** `worclaude init` in any project directory

---

## Core Commands

| Command             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `worclaude init`    | Scaffold workflow into a project (fresh or existing) |
| `worclaude upgrade` | Update universal components to latest version        |
| `worclaude status`  | Show current workflow state, version, customizations |
| `worclaude backup`  | Manual backup of current Claude setup                |
| `worclaude restore` | Restore from a backup                                |
| `worclaude diff`    | Compare current setup vs latest workflow version     |

---

## Three Scenarios

### Scenario A: Fresh Project

No `.claude/` directory or `CLAUDE.md` exists. Full interactive scaffold.

### Scenario B: Existing Project

Project has some Claude Code setup (CLAUDE.md, skills, hooks, etc.). Smart merge with backup.

### Scenario C: Upgrade

Project previously ran `worclaude init`. Update universal components without touching customizations.

**Detection logic:**

- No `.claude/` and no `CLAUDE.md` → Scenario A
- `.claude/` or `CLAUDE.md` exists but no `.claude/workflow-meta.json` → Scenario B
- `.claude/workflow-meta.json` exists → Scenario C

---

## Init Flow (Scenario A — Fresh Project)

### Step 1: Welcome & Project Info

```
$ worclaude init

  Worclaude v1.2.8
  ─────────────────────

? Project name: My Project
? One-line description: A web app for managing tasks
```

### Step 2: Project Type Selection

Multi-select with inline descriptions and smart redundancy detection.

```
? What type of project is this? (space to toggle, enter to confirm)
  ◻ Full-stack web application — Frontend + backend in one repo
  ◻ Backend / API              — Server, REST/GraphQL, no frontend
  ◻ Frontend / UI              — Client-side app, no backend
  ◻ CLI tool                   — Command-line application
  ◻ Data / ML / AI             — Data pipelines, ML models, LLM apps
  ◻ Library / Package          — Reusable module published to npm/PyPI
  ◻ DevOps / Infrastructure    — Infrastructure, CI/CD, deployment

  ℹ Not sure? Pick what's closest. You can add or remove
    agents later with `worclaude upgrade`.
```

If "Full-stack web" AND "Backend / API" or "Frontend / UI" are selected:

```
  ⚠ "Full-stack web" already includes backend and frontend.
    You may not need to select those separately.
```

If multiple types selected that share recommended agents:

```
  ℹ Some agents are recommended by multiple project types: api-designer, bug-fixer
    They will only be installed once.
```

### Step 3: Tech Stack Selection

Multi-select languages. Determines permissions, hooks (formatter), and template content.

```
? Primary language(s) / runtime: (space to toggle, enter to confirm)
  ◻ Python
  ◻ Node.js / TypeScript
  ◻ Java
  ◻ C# / .NET
  ◻ C / C++
  ◻ Go
  ◻ PHP
  ◻ Ruby
  ◻ Kotlin
  ◻ Swift
  ◻ Rust
  ◻ Dart / Flutter
  ◻ Scala
  ◻ Elixir
  ◻ Zig
  ◻ Other / None

  ℹ This sets tool permissions and formatters.
    Update anytime via settings.json.

? Do you use Docker currently?
  ❯ Yes
    No
  ℹ If you add Docker later, run `worclaude upgrade`.
```

When multiple languages selected, all permissions are merged and formatters are chained with `&&`.

### Step 4: Agent Selection

Two-step category-based approach. Universal agents listed as already included.

**Step 1: Select agent categories (pre-selected based on project type)**

```
✓ Universal agents (always installed):
  ✓ plan-reviewer
  ✓ code-simplifier
  ✓ test-writer
  ✓ build-validator
  ✓ verify-app

? Which agent categories do you need? (space to toggle)
  ◼ Backend         — api-designer, database-analyst, auth-auditor
  ◻ Frontend        — ui-reviewer, style-enforcer
  ◻ DevOps          — ci-fixer, docker-helper, deploy-validator, dependency-manager
  ◼ Quality         — bug-fixer, security-reviewer, performance-auditor, refactorer
  ◻ Documentation   — doc-writer, changelog-generator
  ◻ Data / AI       — data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer
```

**Step 2: Fine-tune each selected category (press Enter to accept all defaults)**

```
? Fine-tune Backend agents? (space to toggle, enter to accept defaults)
  ◼ api-designer       — Reviews API design for RESTful conventions
  ◼ database-analyst    — Reviews database schemas and queries
  ◼ auth-auditor        — Audits authentication and authorization
```

### Step 4.5: Confirmation

After all prompts, before scaffolding, show a review summary.

```
  ─── Review Your Selections ───

  Project:    My Project — A web app for managing tasks
  Type:       Backend / API
  Stack:      Python, Docker
  Agents:     5 universal + 6 optional (11 total)

? Everything look right?
  ◉ Yes, install the workflow
  ○ No, let me start over
  ○ Let me adjust a specific step
```

If "adjust a specific step", show step picker and re-run that step only.

### Step 5: Scaffold

Create all files. Show progress.

```
  Creating workflow structure...

  ✓ CLAUDE.md
  ✓ .claude/settings.json (permissions, hooks, sandbox)
  ✓ .claude/workflow-meta.json
  ✓ .claude/agents/ (5 universal + 6 selected)
  ✓ .claude/commands/ (10 universal)
  ✓ .claude/skills/ (9 universal + 3 templates + 1 generated)
  ✓ .mcp.json
  ✓ docs/spec/PROGRESS.md
  ✓ docs/spec/SPEC.md

  Done! Workflow installed successfully.

  Next steps:
  1. Fill in your Tech Stack and Commands in CLAUDE.md
  2. Fill in project-specific skill templates in .claude/skills/
  3. Write your SPEC.md
  4. Start a Claude Code session: claude --worktree --tmux
```

---

## Init Flow (Scenario B — Existing Project)

### Step 1: Detection & Backup

```
$ worclaude init

  Worclaude v1.2.8
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

### Step 2: Backup

```
  Creating backup...
  ✓ Backed up to .claude-backup-20260323-143022/
```

### Step 3: Project Type & Tech Stack & Agents

Same interactive prompts as Scenario A.

### Step 4: Tiered Merge

**Tier 1 — Additive (automatic, no prompt):**

- Missing skills → add
- Missing agents → add (universal + selected optional)
- Missing commands → add all 12
- settings.json permissions → append new ones to existing list
- settings.json hooks → append new hooks (only if matcher doesn't conflict)
- .mcp.json → add missing servers
- docs/spec/PROGRESS.md → create if missing, skip if exists
- docs/spec/SPEC.md → create if missing, skip if exists
- .claude/workflow-meta.json → create

**Tier 2 — Safe alongside (notify, don't ask):**

- Conflicting skills → keep user's, save workflow version as `{name}.workflow-ref.md`
- Conflicting agents → same pattern
- Conflicting commands → same pattern

**Tier 3 — Interactive (ask user):**

- CLAUDE.md → special handling (see below)
- settings.json hook matcher conflicts → ask user

### Step 5: CLAUDE.md Special Handling

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

Default: keep user's, generate suggestions file.

### Step 6: Report

```
  Merge complete!

  Added:
  ✓ 5 universal agents + 4 selected optional agents
  ✓ 12 slash commands
  ✓ 6 universal skills (3 conflicts saved as .workflow-ref.md)
  ✓ 18 permission rules appended
  ✓ 3 hooks added

  Conflicts (saved alongside):
  ~ context-management.md → context-management.workflow-ref.md
  ~ git-conventions.md → git-conventions.workflow-ref.md
  ~ testing.md → testing.workflow-ref.md

  Suggestions:
  ~ CLAUDE.md.workflow-suggestions (review and merge manually)

  Next steps:
  1. Review .workflow-ref.md files and merge what's useful
  2. Review CLAUDE.md.workflow-suggestions
  3. Delete .workflow-ref.md and .workflow-suggestions files when done
```

---

## Upgrade Flow (Scenario C)

### Step 1: CLI Self-Update Check

Checks the npm registry for a newer CLI version. If found, offers to self-update. On permission errors, suggests `sudo`.

```
$ worclaude upgrade

  ℹ New worclaude version available: v1.2.6 → v1.2.8
? Update worclaude CLI?
  ❯ Yes, update and continue
    No, continue with current version
```

After self-update, re-run is needed (new code must load).

### Step 2: Change Detection

Uses hashes stored in workflow-meta.json to detect which files user has customized.

```
  Changes in 1.1.0:
  + New agent: incident-responder
  + Updated: context-management.md (improved compaction)
  ~ Modified: settings.json (new hook)

  Auto-update (unchanged since install):
    git-conventions.md, plan-reviewer.md, 12 more

  Needs review (you've customized these):
    context-management.md
```

### Step 3: Apply

Same tiered merge as Scenario B for conflicting files. Auto-update unchanged files. Create workflow-meta.json with new version and hashes.

---

## Status Command

Checks the npm registry and shows version status:

- `(up to date)` — workflow and CLI are current
- `(upgrade available: vX.Y.Z)` — workflow is behind CLI, run `worclaude upgrade`
- `(CLI update available: vX.Y.Z)` — newer CLI on npm, run `npm install -g worclaude@latest`
- No suffix when offline (graceful degradation)

```
$ worclaude status

  ▌ WORCLAUDE STATUS
  │ Version    v1.2.8 (up to date)
  │ Project    Backend / API
  │ Stack      Python
  │ Agents     5 universal + 6 optional
  │ Commands   10
  │ Skills     12

  ℹ Customized files (differ from installed version):
        ~ CLAUDE.md

      Hooks:        3 active
  Permissions: 47 rules
```

---

## Backup & Restore

### Backup

```
$ worclaude backup

  Creating backup...
  ✓ Backed up to .claude-backup-20260323-143022/

  Contents:
    CLAUDE.md
    .claude/ (full directory)
    .mcp.json
```

### Restore

```
$ worclaude restore

  Available backups:
  1. .claude-backup-20260323-143022 (2 hours ago)
  2. .claude-backup-20260320-091500 (3 days ago)

? Select backup to restore: 1

  ⚠ This will replace your current Claude setup.
? Confirm restore? (y/N)

  ✓ Restored from .claude-backup-20260323-143022/
```

### Diff

```
$ worclaude diff

  Comparing current setup to workflow v1.2.8:

  Modified (your changes):
  ~ CLAUDE.md (added 5 gotchas)
  ~ .claude/skills/testing.md (added pytest patterns)

  Missing (removed or never installed):
  - .claude/agents/doc-writer.md

  Extra (you added):
  + .claude/skills/my-custom-skill.md
  + .claude/agents/my-custom-agent.md
```

---

## Delete Command

Removes worclaude workflow files from a project. Two modes:

1. **Remove from project** — removes scaffolded files, keeps CLI installed
2. **Remove from project + uninstall hint** — same cleanup, then prints `npm uninstall -g worclaude`

### Safety Rules

- Files tracked in `workflow-meta.json` `fileHashes` with unchanged hash → auto-delete
- Files tracked but user-modified (hash mismatch) → ask user (default: delete, backed up)
- `workflow-meta.json` → always delete (pure worclaude metadata)
- `settings.json` → ask user (may contain user-added permissions/hooks)
- `.workflow-ref.md` / `.workflow-suggestions` files → auto-delete (upgrade artifacts)
- User-added files in `.claude/` (not in `fileHashes`) → never delete
- Claude Code system dirs (`projects/`, `worktrees/`, `todos/`, `memory/`) → never delete
- Root files (`CLAUDE.md`, `.mcp.json`, `docs/spec/*`) → ask user (default: keep)
- `.gitignore` → remove `# Worclaude` header and `.claude/` entry only; keep `.claude-backup-*/`
- Backup directories → never delete

### Flow

```
$ worclaude delete

  ▌ DELETE WORKFLOW

? What would you like to do?
  ❯ Remove workflow from this project
    Remove workflow and uninstall worclaude globally
    ──────
    ← Cancel

  │ Workflow files in .claude/:
  │   ✓ 28 unmodified files (safe to remove)
  │   ~ 3 files you've customized
  │       .claude/agents/plan-reviewer.md
  │       .claude/skills/testing.md
  │       .claude/commands/start.md
  │   ● 2 user-added files (will NOT be touched)

? 3 file(s) have been customized. What should we do?
  ❯ Delete them too (they'll be in the backup)
    Keep them in .claude/

  ℹ These files were created or modified by worclaude but may contain your work:
      .claude/settings.json (permissions & hooks)
      CLAUDE.md
      .mcp.json
      docs/spec/PROGRESS.md
      docs/spec/SPEC.md

? What would you like to do with these files?
  ❯ Keep all (recommended)
    Let me choose which to remove
    Remove all

  ⚠ This will permanently delete 31 file(s).
    A backup will be created first.

? Confirm deletion?
    Yes, delete
  ❯ No, cancel

  ✓ Workflow removed!
    ✓ Removed 28 workflow files from .claude/
    ✓ Cleaned up .gitignore
    ℹ Kept 2 user-added file(s) in .claude/
    ℹ Kept: .claude/settings.json, CLAUDE.md, .mcp.json, docs/spec/PROGRESS.md, docs/spec/SPEC.md
      Backup: .claude-backup-20260327-143052/

  ℹ To uninstall worclaude CLI globally, run:
    npm uninstall -g worclaude
```

### Backup

A backup is always created before any deletion. The backup includes `.claude/`, `CLAUDE.md`, `.mcp.json`, and `docs/spec/` files.

### Empty Directory Cleanup

After file removal:

- Empty `.claude/agents/`, `.claude/commands/`, `.claude/skills/` → removed
- Empty `.claude/` → removed (only if no user files remain)
- Empty `docs/spec/` → removed; empty `docs/` → removed

---

## File Templates

### CLAUDE.md Template

```markdown
# CLAUDE.md

{project_name} — {description}

## Key Files

- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth

## Tech Stack

{tech_stack_filled_during_init}

## Commands

{commands_filled_during_init}

## Skills (read on demand, not upfront)

See `.claude/skills/` — load only what's relevant:

- context-management.md — Session lifecycle
- git-conventions.md — Commits and branches
- planning-with-files.md — Implementation planning
- review-and-handoff.md — Session endings
- verification.md — How to verify work
- testing.md — Test philosophy and patterns
  {project_specific_skills}

## Session Protocol

**Start:** Read PROGRESS.md. Read active implementation prompt if any.
**During:** One task at a time. Commit after each. Use subagents for side work.
**End:** Update PROGRESS.md. Write handoff if ending mid-task.

## Critical Rules

1. SPEC.md is source of truth. Do not invent features.
2. Test before moving on.
3. Ask if ambiguous. Do not guess.
4. Read source files before writing. Never assume.
5. Self-healing: same mistake twice → update CLAUDE.md.
6. Use subagents to keep main context clean.
7. Mediocre fix → scrap it, implement elegantly.

## Gotchas

[Grows during development]
```

### workflow-meta.json Template

```json
{
  "version": "1.0.0",
  "installedAt": "{timestamp}",
  "lastUpdated": "{timestamp}",
  "projectTypes": ["{selected_types}"],
  "techStack": ["{selected_stacks}"],
  "universalAgents": [
    "plan-reviewer",
    "code-simplifier",
    "test-writer",
    "build-validator",
    "verify-app"
  ],
  "optionalAgents": ["{selected_agents}"],
  "fileHashes": {
    "agents/plan-reviewer.md": "{sha256}",
    "agents/code-simplifier.md": "{sha256}",
    "skills/context-management.md": "{sha256}",
    ...
  }
}
```

### settings.json Structure

```json
{
  "permissions": {
    "allow": [
      "// -- Read-only / Exploration --",
      "Bash(find:*)",
      "Bash(grep:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(wc:*)",
      "Bash(which:*)",
      "Bash(tree:*)",
      "Bash(diff:*)",
      "Bash(sort:*)",
      "Bash(uniq:*)",
      "Bash(awk:*)",
      "Bash(sed:*)",
      "Bash(cut:*)",
      "Bash(jq:*)",
      "Bash(xargs:*)",
      "Bash(ps:*)",
      "Bash(du:*)",
      "Bash(df:*)",
      "Bash(env:*)",
      "Bash(printenv:*)",

      "// -- Git --",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)",
      "Bash(git branch:*)",
      "Bash(git checkout:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git pull:*)",
      "Bash(git fetch:*)",
      "Bash(git merge:*)",
      "Bash(git stash:*)",
      "Bash(git worktree:*)",
      "Bash(git rebase:*)",
      "Bash(git cherry-pick:*)",
      "Bash(git tag:*)",
      "Bash(gh:*)",

      "// -- Common Dev Tools --",
      "Bash(echo:*)",
      "Bash(mkdir:*)",
      "Bash(touch:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(tar:*)",
      "Bash(zip:*)",
      "Bash(unzip:*)",
      "Bash(make:*)",

      "// -- Edit Permissions --",
      "Edit(.claude/**)",
      "Edit(docs/**)",
      "Edit(src/**)",
      "Edit(tests/**)",
      "Edit(test/**)",
      "Edit(README*)",
      "Edit(*.md)",
      "Edit(package.json)",
      "Edit(pyproject.toml)",
      "Edit(Dockerfile*)",
      "Edit(docker-compose*)",
      "Edit(.github/**)"

      // Per-language permissions appended from settings/{lang}.json (16 languages supported)
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "{formatter_command} || true"
          }
        ]
      },
      {
        "matcher": "Stop",
        "hooks": [
          {
            "type": "command",
            "command": "{notification_command}"
          }
        ]
      }
    ],
    "PostCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "cat CLAUDE.md && cat docs/spec/PROGRESS.md 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

**Formatter commands by stack:**
| Stack | Command |
|---|---|
| Python | `ruff format . \|\| true` |
| Node/TypeScript | `npx prettier --write . \|\| true` |
| Java | `google-java-format -i $(find . -name '*.java') \|\| true` |
| C# / .NET | `dotnet format \|\| true` |
| C / C++ | `clang-format -i ... \|\| true` |
| Go | `gofmt -w . \|\| true` |
| PHP | `php-cs-fixer fix . \|\| true` |
| Ruby | `rubocop -A \|\| true` |
| Kotlin | `ktlint -F \|\| true` |
| Swift | `swift-format format -r . -i \|\| true` |
| Rust | `cargo fmt \|\| true` |
| Dart / Flutter | `dart format . \|\| true` |
| Scala | `scalafmt \|\| true` |
| Elixir | `mix format \|\| true` |
| Zig | `zig fmt . \|\| true` |

**Notification commands by OS:**
| OS | Command |
|---|---|
| Linux | `notify-send 'Claude Code' 'Session needs attention' 2>/dev/null \|\| true` |
| macOS | `osascript -e 'display notification "Session needs attention" with title "Claude Code"' 2>/dev/null \|\| true` |
| Windows | `powershell -command "New-BurntToastNotification -Text 'Claude Code','Session needs attention'" 2>/dev/null \|\| true` |

> **Windows note:** Claude Code runs hooks in bash (Git Bash / WSL) on all platforms. All hook commands use Unix shell syntax and require [Git for Windows](https://gitforwindows.org) to be installed.

---

## Universal Agents

### plan-reviewer.md

```markdown
---
name: plan-reviewer
model: opus
isolation: none
---

You are a senior staff engineer reviewing an implementation plan.
Your job is to challenge assumptions, identify ambiguity, check
for missing verification steps, and ensure the plan is specific
enough for one-shot implementation.

Review the plan critically:

- Are there ambiguous requirements that could be interpreted multiple ways?
- Is there a clear verification strategy for each step?
- Are there edge cases not addressed?
- Is the scope realistic for a single implementation pass?
- Does it align with the project's SPEC.md?

Be direct. Flag problems. Suggest improvements. Do not approve
plans that are vague or missing verification steps.
```

### code-simplifier.md

```markdown
---
name: code-simplifier
model: sonnet
isolation: worktree
---

You are a code quality specialist. Review the recently changed
code and improve it:

- Find and eliminate duplication
- Identify reuse opportunities with existing code
- Simplify complex logic
- Ensure consistency with project patterns
- Check CLAUDE.md compliance

Make the changes directly. Run tests after each change to verify
nothing breaks. Commit improvements separately from feature work.
```

### test-writer.md

```markdown
---
name: test-writer
model: sonnet
isolation: worktree
---

You are a test specialist. Write comprehensive tests for the
recently changed code:

- Unit tests for individual functions and methods
- Integration tests for component interactions
- Edge case coverage (null, empty, boundary values)
- Error path testing

Follow the project's testing patterns from .claude/skills/testing.md.
Run all tests to verify they pass. Aim for meaningful coverage,
not 100% line coverage.
```

### build-validator.md

```markdown
---
name: build-validator
model: haiku
isolation: none
---

Validate the project builds and passes all checks:

1. Run the build command
2. Run the full test suite
3. Run the linter
4. Check for type errors (if applicable)

Report any failures with clear error messages. Do not fix
issues — report them so the main session can address them.
```

### verify-app.md

```markdown
---
name: verify-app
model: sonnet
isolation: worktree
---

You are a verification specialist. Test the actual running
application behavior, not just unit tests:

- Start the application
- Test the changed functionality end-to-end
- Verify the behavior matches the specification
- Check for regressions in related features
- Test error handling and edge cases in the running app

Report results with specific pass/fail for each verification step.
```

---

## Optional Agent Catalog

### Category Recommendations Map

| Project Type            | Recommended Agents                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Full-stack web          | ui-reviewer, api-designer, database-analyst, security-reviewer, bug-fixer, doc-writer           |
| Backend / API           | api-designer, database-analyst, security-reviewer, auth-auditor, bug-fixer, performance-auditor |
| Frontend / UI           | ui-reviewer, style-enforcer, performance-auditor, bug-fixer                                     |
| CLI tool                | bug-fixer, doc-writer, dependency-manager                                                       |
| Data / ML / AI          | data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer, database-analyst                |
| Library / Package       | doc-writer, dependency-manager, performance-auditor, refactorer, changelog-generator            |
| DevOps / Infrastructure | ci-fixer, docker-helper, deploy-validator, dependency-manager                                   |

### All Optional Agents

Each agent follows the same frontmatter format. Full content for each agent is in `templates/agents/optional/`. The key specifications:

| Agent                  | Model  | Isolation | Category |
| ---------------------- | ------ | --------- | -------- |
| ui-reviewer            | sonnet | none      | frontend |
| style-enforcer         | haiku  | none      | frontend |
| api-designer           | opus   | none      | backend  |
| database-analyst       | sonnet | none      | backend  |
| auth-auditor           | opus   | none      | backend  |
| dependency-manager     | haiku  | none      | devops   |
| ci-fixer               | sonnet | worktree  | devops   |
| docker-helper          | sonnet | none      | devops   |
| deploy-validator       | sonnet | none      | devops   |
| bug-fixer              | sonnet | worktree  | quality  |
| security-reviewer      | opus   | none      | quality  |
| performance-auditor    | sonnet | none      | quality  |
| refactorer             | sonnet | worktree  | quality  |
| doc-writer             | sonnet | worktree  | docs     |
| changelog-generator    | haiku  | none      | docs     |
| data-pipeline-reviewer | sonnet | none      | data     |
| ml-experiment-tracker  | sonnet | none      | data     |
| prompt-engineer        | opus   | none      | data     |

---

## Universal Slash Commands

All 12 slash commands are installed in every project. Files live in `.claude/commands/`.

### /start (start.md)

```markdown
Read docs/spec/PROGRESS.md to understand current state.
Read .claude/skills/agent-routing.md for agent usage guidance.

Check for handoff files from previous sessions:

- Look in docs/handoffs/ for any HANDOFF\*.md files
  (both HANDOFF-{branch}-{date}.md and legacy HANDOFF\_{date}.md)
- Prioritize files matching the current branch name
- If found, read them for context and report what was handed off

If an active implementation prompt exists, read it.
Report: what was last completed, what's next, any blockers.
```

### /end (end.md)

```markdown
Use this ONLY when stopping work mid-task without committing.

Do NOT update PROGRESS.md — /sync handles that on develop after merging.

Mid-task handoff:

1. Create docs/handoffs/HANDOFF-{branch-name}-{date}.md
2. Include: what was being worked on, what is done, what is left,
   decisions/context needed, files modified
3. git add -A
4. git commit -m "wip: handoff for [task description]"
5. git push
```

### /commit-push-pr (commit-push-pr.md)

```markdown
Determine which branch you're on, then follow the appropriate flow.

On a feature branch (feature/\*, fix/\*, chore/\*, refactor/\*):

- Do NOT touch shared-state files (see git-conventions.md)
- Stage, commit, push, PR targeting develop

On develop (after /sync has been run):

- Stage, commit, push, PR targeting main

On any other branch: ask user which base branch to target.

Use gh pr create for PR creation.
```

### /review-plan (review-plan.md)

```markdown
Send the current implementation plan to the plan-reviewer agent.
The plan-reviewer will act as a staff engineer and critically
review the plan for:

- Ambiguity
- Missing verification steps
- Unrealistic scope
- Edge cases
- SPEC.md alignment

Wait for the review and address all feedback before proceeding.
```

### /techdebt (techdebt.md)

```markdown
Scan the codebase for technical debt:

- Duplicated code
- Dead code (unused functions, imports, variables)
- TODO/FIXME/HACK comments
- Overly complex functions
- Missing tests for critical paths
- Inconsistent patterns

Report findings organized by severity. Fix quick wins directly.
```

### /verify (verify.md)

```markdown
Run full project verification:

1. Run the test suite
2. Run the build
3. Run the linter
4. Run type checking (if applicable)
5. Run any domain-specific verification

Report results clearly. Do not proceed if any check fails.
```

### /compact-safe (compact-safe.md)

```markdown
Run /compact to compress context.
The PostCompact hook will automatically re-read CLAUDE.md
and PROGRESS.md.

After compaction, briefly confirm:

- Current task
- Current branch
- What was just being worked on
```

### /status (status.md)

```markdown
Report current session state:

- Current task / what you're working on
- Git branch and recent commits
- Test status (last run results)
- Context usage estimate
- Any blockers or pending decisions
```

### /update-claude-md (update-claude-md.md)

```markdown
Based on this session's work, propose updates to CLAUDE.md:

Review what happened:

- Any mistakes that should become rules
- Any patterns discovered that should be documented
- Any gotchas encountered

Write the proposed additions to the Gotchas section or
Critical Rules section. Show the diff before applying.
```

### /setup (setup.md)

```markdown
Conversational interview to fill in project-specific files with real content.
Asks 7 sections: Project Story, Architecture, Tech Stack Details, Core Features,
Development Workflow, Coding Conventions, and Verification Strategy.

After the interview, writes/updates: CLAUDE.md, SPEC.md, backend-conventions.md,
frontend-design-system.md, project-patterns.md, and PROGRESS.md with real,
project-specific content from the interview answers.
```

### /sync (sync.md)

```markdown
Update shared-state files after merging feature PRs into develop.
Run on the develop branch AFTER all PRs are merged and conflicts resolved.

Pre-check: confirm on develop, check for conflict markers, check if
anything was merged since last sync (early exit if nothing to do).
Updates: PROGRESS.md (stats, completed items), SPEC.md (if features changed),
version bump per git-conventions.md Versioning Policy.
Verify via /verify. Commit, push, PR to main.
```

### /conflict-resolver (conflict-resolver.md)

```markdown
ONLY resolves merge conflicts — does not update PROGRESS.md, SPEC.md,
or bump versions (that is /sync's job).

1. Detect conflicts via git status
2. Understand each side's intent from git log
3. Resolve: keep both if different areas, combine if same lines, ask if contradictory
4. Verify no conflict markers remain
5. Run tests and lint
6. Commit resolution only — do not push or create PR
```

---

## Universal Skills

All 9 universal skills live in `.claude/skills/`. Full content for each is in `templates/skills/universal/`. They follow Thariq's skill authoring standards:

- Skip the obvious
- Build a Gotchas section
- Progressive disclosure (folder structure when complex)
- Don't railroad — give info, let Claude adapt
- Description = trigger phrase for the model
- Include helper scripts where useful

### Skill Summaries

| Skill                    | Core Content                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| context-management.md    | Context budget awareness, when to /compact, when to /clear, subagent offloading for context hygiene |
| git-conventions.md       | Branch naming, commit message format, PR workflow, worktree conventions                             |
| planning-with-files.md   | How to structure implementation plans as files, progressive implementation, plan review process     |
| review-and-handoff.md    | Session ending protocol, HANDOFF document format, what to include for seamless continuation         |
| prompt-engineering.md    | Effective prompting patterns, challenge Claude, demand elegance, write detailed specs               |
| verification.md          | Domain-specific verification beyond tests: browser, API, data, CLI. How to close the feedback loop  |
| testing.md               | Test philosophy, coverage strategy, test-first patterns, what to test vs what not to                |
| claude-md-maintenance.md | How Claude writes rules for itself, when to update, how to keep CLAUDE.md lean                      |
| subagent-usage.md        | When to use subagents, how many, context hygiene, worktree isolation patterns                       |

### Template Skills (project-specific placeholders)

| Skill                     | Purpose                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| backend-conventions.md    | Stack-specific backend patterns. Placeholder with sections to fill.                 |
| frontend-design-system.md | Design system, components, styling. Placeholder with sections to fill.              |
| project-patterns.md       | Architectural patterns specific to this project. Placeholder with sections to fill. |

---

## Configuration Details

### Statusline

```
[Opus·High] 🏷 auth-refactor | 🌿 feature/auth | ████████░░ 78% | $0.12 | 🕐 12m
```

Elements: model+effort, session name, branch, context %, cost, time elapsed.

### Effort Level

Default: High. User escalates to max per session via `/effort max`.

### Output Style

Default: Concise. User switches to explanatory when exploring unfamiliar territory.

### Sandbox Mode

Default: Sandbox with auto-allow. Structural safety via file and network isolation.

---

## Tech Stack for the CLI Tool Itself

- **Runtime:** Node.js (cross-platform: Linux, macOS, Windows)
- **Package manager:** npm
- **CLI framework:** Commander.js
- **Interactive prompts:** Inquirer.js
- **Terminal styling:** Chalk
- **Spinners:** Ora
- **File operations:** fs-extra
- **Hashing:** Node.js crypto (built-in)
- **OS detection:** Node.js os (built-in)
- **Testing:** Vitest
- **Linting:** ESLint + Prettier

### package.json bin entry

```json
{
  "name": "worclaude",
  "version": "1.2.8",
  "bin": {
    "worclaude": "./src/index.js"
  }
}
```

---

## Project Structure

```
worclaude/
├── package.json
├── README.md
├── LICENSE
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   └── skills/
├── docs/
│   ├── index.md                    # VitePress landing page
│   ├── .vitepress/                 # VitePress config + theme
│   ├── guide/                      # User guides (intro, getting-started, existing, upgrading, tips)
│   ├── reference/                  # Reference docs (agents, commands, skills, hooks, permissions, config)
│   ├── demo/                       # Interactive terminal demo
│   └── spec/
│       ├── SPEC.md
│       └── PROGRESS.md
├── src/
│   ├── index.js                    # CLI entry point
│   ├── data/
│   │   └── agents.js               # Catalogs, tech stacks, formatters, categories
│   ├── commands/
│   │   ├── init.js
│   │   ├── upgrade.js
│   │   ├── status.js
│   │   ├── backup.js
│   │   ├── restore.js
│   │   └── diff.js
│   ├── core/
│   │   ├── detector.js             # Scenario A/B/C detection
│   │   ├── merger.js               # Tiered merge logic
│   │   ├── scaffolder.js           # Template → project file creation
│   │   ├── backup.js               # Backup/restore logic
│   │   ├── config.js               # workflow-meta.json management
│   │   └── file-categorizer.js     # Hash maps + file categorization for upgrade/diff
│   ├── prompts/
│   │   ├── project-type.js
│   │   ├── agent-selection.js
│   │   ├── tech-stack.js
│   │   ├── conflict-resolution.js
│   │   └── claude-md-merge.js
│   └── utils/
│       ├── file.js
│       ├── hash.js
│       ├── time.js                 # relativeTime() for backup listing
│       └── display.js              # Bold + Badges visual system
├── templates/
│   ├── core/
│   │   ├── claude-md.md
│   │   ├── mcp-json.json
│   │   ├── progress-md.md
│   │   └── workflow-meta.json
│   ├── specs/
│   │   ├── spec-md.md              # Default SPEC template
│   │   └── spec-md-{type}.md       # 7 project-type-specific SPEC templates
│   ├── settings/
│   │   ├── base.json               # Universal permissions
│   │   ├── python.json
│   │   ├── node.json
│   │   ├── java.json
│   │   ├── csharp.json
│   │   ├── cpp.json
│   │   ├── go.json
│   │   ├── php.json
│   │   ├── ruby.json
│   │   ├── kotlin.json
│   │   ├── swift.json
│   │   ├── rust.json
│   │   ├── dart.json
│   │   ├── scala.json
│   │   ├── elixir.json
│   │   ├── zig.json
│   │   └── docker.json
│   ├── agents/
│   │   ├── universal/ (5 agents)
│   │   └── optional/
│   │       ├── frontend/ (ui-reviewer, style-enforcer)
│   │       ├── backend/ (api-designer, database-analyst, auth-auditor)
│   │       ├── devops/ (ci-fixer, docker-helper, deploy-validator, dependency-manager)
│   │       ├── quality/ (bug-fixer, security-reviewer, performance-auditor, refactorer)
│   │       ├── docs/ (doc-writer, changelog-generator)
│   │       └── data/ (data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer)
│   ├── commands/ (12 slash commands)
│   └── skills/
│       ├── universal/ (9 files)
│       └── templates/ (3 files)
└── tests/
    ├── commands/ (init, upgrade, status, backup, restore, diff)
    ├── core/ (detector, merger, scaffolder, backup, file-categorizer)
    ├── prompts/ (claude-md-merge)
    └── utils/ (display, file, hash, time)
```

---

## Implementation Phases

### Phase 1: Foundation

- Project setup (package.json, ESLint, Prettier, Vitest)
- CLI entry point with Commander.js
- All template files created
- Basic `init` command (Scenario A only — fresh project)

### Phase 2: Interactive Prompts

- Project type selection (multi-select with overlap warning)
- Tech stack selection
- Agent selection (category recommendations + manual override)
- Template variable substitution

### Phase 3: Smart Merge

- Detector (Scenario A/B/C detection)
- Backup system
- Tiered merge logic
- CLAUDE.md special handling
- Conflict resolution prompts
- Full Scenario B support

### Phase 4: Upgrade & Utilities

- workflow-meta.json with file hashes
- `upgrade` command (Scenario C)
- `status` command
- `backup` / `restore` commands
- `diff` command

### Phase 5: Polish & Testing

- Comprehensive tests for all scenarios
- Test fixtures for fresh, existing, and workflow projects
- Cross-platform testing (Linux, macOS, Windows)
- README with documentation
- npm publish preparation

### Post-release (v1.1.0–v1.2.8)

- Expanded tech stack from 6 to 16 language options with per-language settings templates and formatters
- Renamed project from claude-workflow to worclaude
- VitePress documentation site with interactive terminal demo and GitHub Pages deployment
- Bold + Badges visual system restyle for all CLI output
- CLI self-update: `worclaude upgrade` checks npm registry, offers self-update with sudo detection
- Dynamic `--version` from package.json (was hardcoded)
- Smart version status in `worclaude status`: distinguishes workflow-outdated vs CLI-outdated vs up-to-date
- Shared `getLatestNpmVersion()` utility with 5s timeout for graceful offline degradation
- Numerous UX improvements and bug fixes (see PROGRESS.md for full list)

---

## Design Decisions Reference

This spec is derived from 53 tips by Boris Cherny (creator of Claude Code). Key design decisions:

1. **Agents are task-specific, not role-based.** No "backend-engineer" agents. Domain knowledge lives in skills.
2. **CLAUDE.md must be lean.** Under 50 lines. Progressive disclosure via skills.
3. **Sandbox with auto-allow** as default. Safety through structural isolation.
4. **High effort default.** Max escalated per session for complex tasks.
5. **Concise output style default.** Explanatory when exploring.
6. **Auto-naming for sessions.** Manual --name only when user wants it.
7. **Three universal hooks.** Format on write, PostCompact re-injection, notification on stop.
8. **All slash commands universal.** They're lightweight — include all 12 everywhere.
9. **Skills use progressive disclosure.** CLAUDE.md points to skills, skills load on demand.
10. **The pipeline: Design → Review → Execute → Quality → Verify → PR.**
