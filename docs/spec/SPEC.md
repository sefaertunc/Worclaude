# SPEC.md — Worclaude CLI

## Table of Contents

- [Product Overview](#product-overview)
- [Core Commands](#core-commands)
- [Three Scenarios](#three-scenarios)
  - [Scenario A: Fresh Project](#scenario-a-fresh-project)
  - [Scenario B: Existing Project](#scenario-b-existing-project)
  - [Scenario C: Upgrade](#scenario-c-upgrade)
- [Init Flow (Scenario A — Fresh Project)](#init-flow-scenario-a--fresh-project)
  - [Step 1: Welcome & Project Info](#step-1-welcome--project-info)
  - [Step 2: Project Type Selection](#step-2-project-type-selection)
  - [Step 3: Tech Stack Selection](#step-3-tech-stack-selection)
  - [Step 4: Agent Selection](#step-4-agent-selection)
  - [Step 4.5: Confirmation](#step-45-confirmation)
  - [Step 5: Scaffold](#step-5-scaffold)
- [Init Flow (Scenario B — Existing Project)](#init-flow-scenario-b--existing-project)
  - [Step 1: Detection & Backup](#step-1-detection--backup)
  - [Step 2: Backup](#step-2-backup)
  - [Step 3: Project Type & Tech Stack & Agents](#step-3-project-type--tech-stack--agents)
  - [Step 4: Tiered Merge](#step-4-tiered-merge)
  - [Step 5: CLAUDE.md Special Handling](#step-5-claudemd-special-handling)
  - [Step 6: Report](#step-6-report)
- [Upgrade Flow (Scenario C)](#upgrade-flow-scenario-c)
  - [Step 1: CLI Self-Update Check](#step-1-cli-self-update-check)
  - [Step 2: Change Detection](#step-2-change-detection)
  - [Step 2b: Drift Repair (Tier 1)](#step-2b-drift-repair-tier-1)
  - [Step 3: Apply](#step-3-apply)
- [Status Command](#status-command)
- [Backup & Restore](#backup--restore)
  - [Backup](#backup)
  - [Restore](#restore)
  - [Diff](#diff)
- [Delete Command](#delete-command)
  - [Safety Rules](#safety-rules)
  - [Flow](#flow)
  - [Backup](#backup-1)
  - [Empty Directory Cleanup](#empty-directory-cleanup)
- [Doctor Command](#doctor-command)
  - [Core Files](#core-files)
  - [Components](#components)
  - [Documentation](#documentation)
  - [Git Integration](#git-integration)
  - [Integrity](#integrity)
- [Session Persistence](#session-persistence)
  - [SessionStart Hook](#sessionstart-hook)
  - [Session Summaries](#session-summaries)
  - [Drift Detection](#drift-detection)
- [Hook Profiles](#hook-profiles)
- [Hook Script Contracts](#hook-script-contracts)
  - [pre-compact-save.cjs](#pre-compact-savecjs)
  - [correction-detect.cjs](#correction-detectcjs)
  - [learn-capture.cjs](#learn-capturecjs)
  - [skill-hint.cjs](#skill-hintcjs)
- [File Templates](#file-templates)
  - [CLAUDE.md Template](#claudemd-template)
  - [workflow-meta.json Template](#workflow-metajson-template)
  - [settings.json Structure](#settingsjson-structure)
- [Background-Agent Concurrency](#background-agent-concurrency)
- [Agent Routing Skill (auto-regeneration)](#agent-routing-skill-auto-regeneration)
- [Universal Agents](#universal-agents)
  - [plan-reviewer.md](#plan-reviewermd)
  - [code-simplifier.md](#code-simplifiermd)
  - [test-writer.md](#test-writermd)
  - [build-validator.md](#build-validatormd)
  - [verify-app.md](#verify-appmd)
- [Optional Agent Catalog](#optional-agent-catalog)
  - [Category Recommendations Map](#category-recommendations-map)
  - [All Optional Agents](#all-optional-agents)
- [Universal Slash Commands](#universal-slash-commands)
  - [/start](#start-startmd)
  - [/end](#end-endmd)
  - [/commit-push-pr](#commit-push-pr-commit-push-prmd)
  - [/review-plan](#review-plan-review-planmd)
  - [/techdebt](#techdebt-techdebtmd)
  - [/verify](#verify-verifymd)
  - [/compact-safe](#compact-safe-compact-safemd)
  - [/status](#status-statusmd)
  - [/update-claude-md](#update-claude-md-update-claude-mdmd)
  - [/setup](#setup-setupmd)
  - [/sync](#sync-syncmd)
  - [/conflict-resolver](#conflict-resolver-conflict-resolvermd)
  - [/review-changes](#review-changes-review-changesmd)
  - [/build-fix](#build-fix-build-fixmd)
  - [/refactor-clean](#refactor-clean-refactor-cleanmd)
  - [/test-coverage](#test-coverage-test-coveragemd)
- [Universal Skills](#universal-skills)
  - [Skill Summaries](#skill-summaries)
  - [Template Skills (project-specific placeholders)](#template-skills-project-specific-placeholders)
- [Configuration Details](#configuration-details)
  - [Statusline](#statusline)
  - [Effort Level](#effort-level)
  - [Output Style](#output-style)
  - [Sandbox Mode](#sandbox-mode)
- [Tech Stack for the CLI Tool Itself](#tech-stack-for-the-cli-tool-itself)
  - [package.json bin entry](#packagejson-bin-entry)
- [Project Structure](#project-structure)
- [Implementation Phases](#implementation-phases)
- [Design Decisions Reference](#design-decisions-reference)

---

## Product Overview

**worclaude** is a CLI tool that scaffolds a comprehensive Claude Code workflow system into any project. It installs agents, skills, slash commands, hooks, permissions, and configuration files derived from tips by Boris Cherny (creator of Claude Code at Anthropic).

**Version:** 2.1.0
**Install:** `npm install -g worclaude`
**Usage:** `worclaude init` in any project directory

---

## Core Commands

| Command                                                 | Purpose                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `worclaude init`                                        | Scaffold workflow into a project (fresh or existing)                                              |
| `worclaude upgrade [--dry-run] [--yes] [--repair-only]` | Update components and repair on-disk drift                                                        |
| `worclaude status`                                      | Show current workflow state, version, customizations                                              |
| `worclaude backup`                                      | Manual backup of current Claude setup                                                             |
| `worclaude restore`                                     | Restore from a backup                                                                             |
| `worclaude diff`                                        | Compare current setup vs latest workflow version                                                  |
| `worclaude delete`                                      | Remove worclaude workflow from project                                                            |
| `worclaude doctor`                                      | Check installation health and file integrity                                                      |
| `worclaude scan [--path] [--json] [--quiet]`            | Detect project facts; write `.claude/cache/detection-report.json`                                 |
| `worclaude setup-state <sub> [--path]`                  | Inspect/persist `/setup` state file (`show`, `save --stdin\|--from-file`, `reset`, `resume-info`) |

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
  Agents:     6 universal + 6 optional (12 total)

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
  ✓ .claude/agents/ (6 universal + 6 selected)
  ✓ .claude/commands/ (18 universal)
  ✓ .claude/skills/ (11 universal + 3 templates + 1 generated)
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

**Tier 2 — Reference copy (notify, don't ask):**

- Conflicting skills → keep user's, save workflow version under `.claude/workflow-ref/skills/{name}/SKILL.md`
- Conflicting agents → save workflow version under `.claude/workflow-ref/agents/{name}.md`
- Conflicting commands → save workflow version under `.claude/workflow-ref/commands/{name}.md`
- `.claude/workflow-ref/` mirrors the live tree and preserves original filenames. Kept out of Claude Code's command, agent, and skill discovery so reference copies never shadow live files.

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
  ✓ 6 universal agents + 4 selected optional agents
  ✓ 18 slash commands
  ✓ 9 universal skills (3 conflicts saved under .claude/workflow-ref/)
  ✓ 18 permission rules appended
  ✓ 3 hooks added

  Conflicts (template copy saved under .claude/workflow-ref/):
  ⚠ context-management/SKILL.md
  ⚠ git-conventions/SKILL.md
  ⚠ testing/SKILL.md

  Suggestions:
  ~ CLAUDE.md.workflow-suggestions (review and merge manually)

  Next steps:
  1. Review files under .claude/workflow-ref/ and merge what's useful
  2. Review CLAUDE.md.workflow-suggestions
  3. Delete .claude/workflow-ref/ and .workflow-suggestions when done
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

### Step 2b: Drift Repair (Tier 1)

Before applying version-driven changes, `upgrade` reconciles the installation against the current template set. This is Tier 1 behavior ("scaffold if absent"):

- Files in `fileHashes` missing on disk AND still in `buildTemplateHashMap` AND of an always-scaffolded type (`universal-agent`, selected `optional-agent`, `command`, `universal-skill`, `hook`, `root-file`) → restored from templates; hash refreshed.
- Files in `fileHashes` missing on disk but no longer in `buildTemplateHashMap` → removed from tracking.
- Hook scripts (`.claude/hooks/*.{cjs,js}`) and `AGENTS.md` (as `root/AGENTS.md`) are tracked in `fileHashes` as of v2.4.6. Installs predating v2.4.6 pick them up via the `newFiles` path on first upgrade. User-edited copies on disk with no corresponding `fileHashes` entry are preserved; a reference copy is written under `.claude/workflow-ref/<same-path>` instead of overwriting.
- `.claude/learnings/` + `.gitkeep` are (re-)created if missing.
- When `CLAUDE.md` lacks memory-architecture guidance keywords, a sidecar is written at `.claude/workflow-ref/CLAUDE.md`. `CLAUDE.md` itself is never auto-modified.
- As of v2.5.1, `migrateWorkflowRefLocation` runs at the start of every upgrade. It sweeps legacy `*.workflow-ref.md` siblings (and root-level `CLAUDE.md.workflow-ref.md` / `AGENTS.md.workflow-ref`) from pre-v2.5.1 installs into `.claude/workflow-ref/<original-path>`. Idempotent — skips files that already exist at the new location.
- Repair runs every `upgrade`. When versions match AND drift exists, `upgrade` enters a "Repair-only" flow (preview → confirm → apply), version unchanged. Without drift, behavior is unchanged ("Already up to date").

Flags: `--dry-run` previews without writing; `--yes` skips confirmations; `--repair-only` runs only the repair pass (no template updates even at version mismatch).

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
  │ Agents     6 universal + 6 optional
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
- Files under `.claude/workflow-ref/` and legacy `.workflow-ref.md` siblings / `.workflow-suggestions` → auto-delete (upgrade artifacts)
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

## Doctor Command

Checks installation health across four categories with PASS/WARN/FAIL status per check.

### Core Files

- `workflow-meta.json` — exists with version, projectTypes, techStack
- `CLAUDE.md` — exists and is substantive (min 10 lines); WARN at 30KB, FAIL at 38KB
- `settings.json` — has permissions array and critical hooks (PostCompact, SessionStart)
- `.claude/sessions/` — directory exists for session persistence

### Components

- Universal agents (all 5 present, each has required `description` frontmatter, completeness scoring for optional fields)
- Selected optional agents (per workflow-meta, `description` field verified, completeness scoring)
- Command files (all 16 present)
- Skills (universal + template + agent-routing.md, directory format verified)

### Documentation

- `docs/spec/PROGRESS.md` — exists (required by /start and /sync)
- `docs/spec/SPEC.md` — exists (referenced by plan-reviewer)

### Git Integration

- `.claude/sessions/` and `.claude/learnings/` — gitignore coverage check (contain per-user state that shouldn't be committed)
- `origin/HEAD` divergence — warns when the current branch is ahead of whatever `origin/HEAD` points to. Worktree agents (`claude --worktree` and `Agent` `isolation: "worktree"`) base off `origin/HEAD`, so an ahead branch produces stale worktree checkouts. Fix: `git remote set-head origin <branch>` (local-only, reversible via `--auto` or `main`). Skipped silently outside a git repo.

### Integrity

- File hash comparison vs `workflow-meta.json` fileHashes — detects customizations or deletions
- Pending files under `.claude/workflow-ref/` — flags unresolved merge conflicts

```
$ worclaude doctor

  ▌ WORCLAUDE DOCTOR
  │
  │ Core Files
  │   ✓ workflow-meta.json
  │   ✓ CLAUDE.md (42 lines)
  │   ✓ settings.json (3 hooks, 47 permissions)
  │   ✓ .claude/sessions/
  │
  │ Components
  │   ✓ 6/6 universal agents
  │   ✓ 6/6 optional agents
  │   ✓ 18/18 commands
  │   ✓ 15/15 skills
  │
  │ Documentation
  │   ✓ docs/spec/PROGRESS.md
  │   ✓ docs/spec/SPEC.md
  │
  │ Integrity
  │   ✓ 28 files match installed hashes
  │   ⚠ 3 files customized
  │   ✓ No pending review files
  │
  │ Result: HEALTHY (1 warning)
```

---

## Session Persistence

### SessionStart Hook

Fires at the beginning of every Claude Code session. Loads four pieces of context:

1. `CLAUDE.md` — project rules and conventions
2. `docs/spec/PROGRESS.md` — completed work and next steps
3. Most recent `.claude/sessions/*.md` — previous session summary
4. Current git branch name

The SessionStart hook has **no profile gate** — it always fires because losing project context is never acceptable.

### Session Summaries

Written automatically by `/commit-push-pr` (after committing) and `/end` (mid-task handoff). Stored in `.claude/sessions/` with naming: `YYYY-MM-DD-HHMM-{short-branch-name}.md`. Summaries include a `## Workflow Observability` section listing agents invoked, commands used, and verification result.

The second line of each summary is `sha: {full HEAD SHA at the time of writing}`. The line MUST start at column 0 with the literal string `sha:` (case-sensitive, no markdown formatting around it) so `/start` can match it with `grep -oP '^sha:\s*\K[a-f0-9]+'` and use the value as the lower bound of `git log <sha>..HEAD` drift detection.

### Drift Detection

The `/start` command supplements SessionStart with git history drift. It prefers SHA-based drift when the most recent session summary records a `sha:` line and the SHA is reachable; otherwise it falls back to date-based drift.

- **SHA-based** (preferred): `git log <sha>..HEAD --oneline` from the recorded SHA to the current HEAD.
- **Date-based** (fallback): commits since the session date parsed from the filename.
- Either path caps the listed commits at 15 one-liners.
- Reports as non-interpreted signals (no warnings or analysis).

---

## Hook Profiles

Set `WORCLAUDE_HOOK_PROFILE` to control which hooks execute:

| Hook                          | minimal | standard (default) | strict |
| ----------------------------- | ------- | ------------------ | ------ |
| SessionStart: Context         | always  | always             | always |
| PostToolUse: Formatter        | skip    | run                | run    |
| PostToolUse: TypeScript Check | skip    | skip               | run    |
| PostCompact: Context          | always  | always             | always |
| PreCompact: pre-compact-save  | always  | always             | always |
| UserPromptSubmit: correction  | skip    | run                | run    |
| UserPromptSubmit: skill-hint  | skip    | run                | run    |
| Stop: learn-capture           | skip    | run                | run    |
| SessionEnd: Notification      | skip    | run                | run    |
| Notification                  | skip    | run                | run    |

SessionStart, PostCompact, and PreCompact:pre-compact-save always fire (no
profile gate). Formatter, notification, correction, skill-hint, and
learn-capture gate via a shell `case` statement that exits 0 on `minimal`.
TypeScript check runs only on `strict`.

```bash
WORCLAUDE_HOOK_PROFILE=minimal claude          # Per-session
export WORCLAUDE_HOOK_PROFILE=strict           # Persistent
```

---

## Hook Script Contracts

Four Node scripts ship in `templates/hooks/` and are scaffolded into
`.claude/hooks/` during init. Each is invoked from `settings.json` with the
hook payload on stdin and obeys a strict "never block the user" contract: any
internal failure is swallowed and the script exits 0.

### pre-compact-save.cjs

|                     |                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Event**           | `PreCompact` (registered with `async: true`)                                                                                                                                                                                                                                                   |
| **Profile gating**  | None — always fires. Losing context to compaction is unacceptable.                                                                                                                                                                                                                             |
| **Stdin (JSON)**    | `trigger`, `cwd` (both optional; `cwd` falls back to `process.cwd()`)                                                                                                                                                                                                                          |
| **Stdout / stderr** | None on the happy path.                                                                                                                                                                                                                                                                        |
| **Exit code**       | Always `0`.                                                                                                                                                                                                                                                                                    |
| **Side effects**    | Writes a snapshot to `.claude/sessions/pre-compact-{ISO-timestamp}.md` containing trigger, current branch, `git status --porcelain`, and `git log --oneline -3`. Creates `.claude/sessions/` if missing. Each shelled-out git call has a 5-second timeout and a swallowed-stderr stdio config. |

### correction-detect.cjs

|                     |                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Event**           | `UserPromptSubmit`                                                                                                        |
| **Profile gating**  | Skipped on `minimal` via shell `case`. Runs on `standard`/`strict`.                                                       |
| **Stdin (JSON)**    | `input.prompt` (string)                                                                                                   |
| **Stdout / stderr** | One of two hint lines on stdout when a `learnPatterns` or `correctionPatterns` regex matches the prompt. Otherwise empty. |
| **Exit code**       | Always `0`.                                                                                                               |
| **Side effects**    | None. No file I/O, no network.                                                                                            |

### learn-capture.cjs

|                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Event**           | `Stop`                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Profile gating**  | Skipped on `minimal` via shell `case`. Runs on `standard`/`strict`.                                                                                                                                                                                                                                                                                                                                                                                           |
| **Stdin (JSON)**    | `cwd` (optional; falls back to `process.cwd()`), `transcript_path` (path to JSONL transcript).                                                                                                                                                                                                                                                                                                                                                                |
| **Stdout / stderr** | None on the happy path.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Exit code**       | Always `0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Side effects**    | Scans the last 20 lines of the transcript for `[LEARN] Category: rule` blocks (with optional `Mistake:` / `Correction:` follow-up lines). Each match becomes a markdown entry appended to `.claude/learnings/{slugified-category}.md` and indexed in `.claude/learnings/index.json`. Creates the directory if missing. A `.claude/.stop-hook-active` flag file (30s TTL) prevents re-entrancy when the Stop event fires more than once for the same response. |

### skill-hint.cjs

|                     |                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Event**           | `UserPromptSubmit`                                                                                                                                                                                     |
| **Profile gating**  | Skipped on `minimal` via shell `case`. Runs on `standard`/`strict`.                                                                                                                                    |
| **Stdin (JSON)**    | `input.prompt` (string), `cwd` (optional).                                                                                                                                                             |
| **Stdout / stderr** | At most one `[Skill hint] Consider loading skill: {slug}/SKILL.md` line on stdout when a token in the prompt overlaps a token in any subdirectory name of `.claude/skills/`. Stops at the first match. |
| **Exit code**       | Always `0`.                                                                                                                                                                                            |
| **Side effects**    | None. Read-only directory listing under `.claude/skills/`.                                                                                                                                             |

Tokenization is shared shape across both prompt-submit hooks: lowercase, non-
alphanumeric split, `length >= 4`, stopword filter (`the`, `and`, `for`, ...).
Skill-hint matches by skill **directory name** today; an enrichment to also
match the skill's `description:` frontmatter is tracked as Phase 3 T3.10.

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
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo '=== CLAUDE.md ==='; cat CLAUDE.md 2>/dev/null; ... (loads CLAUDE.md, PROGRESS.md, last session summary, current branch)"
          }
        ]
      }
    ],
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

## Background-Agent Concurrency

Multiple background agents on the same branch coexist cleanly. Worktree-isolated
agents (`isolation: "worktree"`) each create their own sibling worktree off
`origin/HEAD`, so file/index/ref collisions are impossible by construction.
Non-isolated agents share the main checkout but are read-only by convention.

A "lock file per branch" guard was rejected after the 2026-04-26 concurrency
test: it would have blocked the legitimate parallel-agents case without adding
guarantees beyond what worktree isolation already provides. Worktree locks
themselves are pid-keyed by Claude Code and survive agent completion; stale
locks are normal and cleared with `git worktree remove -f -f <path>` or the
project's worktree-cleanup helper.

The full convention lives in `.claude/skills/agent-routing/SKILL.md` under
`## Background-Agent Concurrency`. SPEC defers to that skill so the guidance
stays in the file every session reads.

---

## Agent Routing Skill (auto-regeneration)

The agent-routing skill at `.claude/skills/agent-routing/SKILL.md` is generated
from the project's `.claude/agents/*.md` frontmatter, not from a centralized
JS registry. Each agent file is the single source of truth for its routing
metadata. The required frontmatter fields are:

| Field            | Type                    | Notes                                                   |
| ---------------- | ----------------------- | ------------------------------------------------------- |
| `name`           | string                  | Already required by Claude Code's runtime               |
| `description`    | string                  | Already required by Claude Code's runtime               |
| `model`          | `opus`/`sonnet`/`haiku` | Already required by Claude Code's runtime               |
| `isolation`      | `none` / `worktree`     | Already required by Claude Code's runtime               |
| `category`       | string                  | `universal`, `frontend`, `backend`, `quality`, etc.     |
| `triggerType`    | `automatic` / `manual`  | Drives Automatic-vs-Manual section partitioning         |
| `triggerCommand` | string \| omitted       | Slash command that invokes the agent, if any            |
| `whenToUse`      | string                  | Surfaces under `**When:**` in the routing entry         |
| `whatItDoes`     | string                  | Surfaces under `**What it does:**`                      |
| `expectBack`     | string                  | Surfaces under `**Expect back:**`                       |
| `situationLabel` | string                  | Decision-matrix row label                               |
| `status`         | `reserved` \| omitted   | Routes the agent into `## Reserved` instead of triggers |

The generator (`src/generators/agent-routing.js`) emits a complete file:

```
---
description: "Agent Routing Guide — when to spawn each installed agent"
---

<!-- AUTO-GENERATED-START -->
# Agent Routing Guide
…canonical content…
<!-- AUTO-GENERATED-END -->
```

Regeneration only touches content between the AUTO-GENERATED markers — any
user-authored prose above or below the markers is preserved. If the file
exists without markers (older scaffolds, hand-edited files), regeneration
replaces the whole file with the marker-wrapped form.

**Run automatically:** during `worclaude upgrade` (after the upgrade write
phase) and during `/sync` (step 10b, after PROGRESS/SPEC updates).

**Run manually:** `worclaude regenerate-routing` reads the project's
`.claude/agents/` and rewrites the skill file in place.

**Init/scaffold:** generates the routing skill from
`templates/agents/**/*.md` (worclaude's source-side templates) filtered to
the agents the user selected during init.

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

| Project Type            | Recommended Agents                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Full-stack web          | ui-reviewer, api-designer, database-analyst, security-reviewer, bug-fixer, doc-writer, e2e-runner            |
| Backend / API           | api-designer, database-analyst, security-reviewer, auth-auditor, bug-fixer, performance-auditor, build-fixer |
| Frontend / UI           | ui-reviewer, style-enforcer, performance-auditor, bug-fixer, e2e-runner                                      |
| CLI tool                | bug-fixer, doc-writer, dependency-manager, build-fixer                                                       |
| Data / ML / AI          | data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer, database-analyst                             |
| Library / Package       | doc-writer, dependency-manager, performance-auditor, refactorer, changelog-generator                         |
| DevOps / Infrastructure | ci-fixer, docker-helper, deploy-validator, dependency-manager                                                |

### All Optional Agents

Each agent uses frontmatter fields recognized by Claude Code's runtime. Required: `name`, `description`. Optional: `model`, `isolation`, `disallowedTools`, `background`, `maxTurns`, `omitClaudeMd`, `memory`, `criticalSystemReminder`, `skills`, `initialPrompt`. Full content in `templates/agents/optional/`. Key specifications:

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
| build-fixer            | sonnet | worktree  | quality  |
| e2e-runner             | sonnet | worktree  | quality  |
| doc-writer             | sonnet | worktree  | docs     |
| changelog-generator    | haiku  | none      | docs     |
| data-pipeline-reviewer | sonnet | none      | data     |
| ml-experiment-tracker  | sonnet | none      | data     |
| prompt-engineer        | opus   | none      | data     |

---

## Universal Slash Commands

All 18 slash commands are installed in every project. Files live in `.claude/commands/`.

### /start (start.md)

```markdown
Read docs/spec/PROGRESS.md to understand current state.
Read .claude/skills/agent-routing.md for agent usage guidance.

Check for handoff files from previous sessions:

- Look in docs/handoffs/ for any HANDOFF\*.md files
  (both HANDOFF-{branch}-{date}.md and legacy HANDOFF\_{date}.md)
- Prioritize files matching the current branch name
- If found, read them for context and report what was handed off

Drift detection: extract date from most recent .claude/sessions/\*.md,
count commits since that date (max 15), report as non-interpreted signals.

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
- Stage, commit, push, create PR targeting develop
- Declare version bump in the PR body: `Version bump: {major|minor|patch|none}`
  per the Versioning Policy. Revert PRs match the bump level of the PR being
  reverted. Ambiguous cases → ASK the user, don't guess. /sync parses this
  line exactly; other phrasings are ignored.

On develop (after /sync has been run):

- Stage, commit, push, PR targeting main
- Versioning is handled by /sync, not here. The release PR body is
  pre-written by /sync with the aggregated bump summary and the list
  of feature PRs included in the release.

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
Diagnose-first project setup with a 12-state state machine. Runs:

INIT (precondition check: .claude/workflow-meta.json must exist; resume
prompt if an unexpired state file is present)
→ SCAN (invokes `worclaude scan --path .`, reads detection report)
→ CONFIRM_HIGH (user confirms high-confidence detections via numbered
checklist; unchecks become interview queue entries)
→ CONFIRM_MEDIUM (per-item numbered choice for medium-confidence items;
supports candidates[] alternatives from the scanner)
→ INTERVIEW_STORY, INTERVIEW_ARCH, INTERVIEW_FEATURES,
INTERVIEW_WORKFLOW, INTERVIEW_CONVENTIONS, INTERVIEW_VERIFICATION
(conversational residuals, per-question resume granularity)
→ WRITE (merge-write six files, preserving user content via
ATX-heading-scoped replace or append-if-authored)
→ DONE (clears state, summarizes).

State persistence: .claude/cache/setup-state.json. 24-hour staleness
window after which INIT offers to discard and restart. Every mutation
persisted via `worclaude setup-state save --from-file .claude/cache/setup-state.draft.json`
(the `--stdin` form remains supported for scripting) BEFORE rendering
the next prompt. Interruption at any point is recoverable by
re-running /setup.

Anti-drift rules (pinned at top of setup.md, override contextual
judgment): sequential state advance only; no backward advance within
an invocation; off-topic input triggers a restate, never an answer —
INTERVIEW states classify every reply as Answer / Skip / Cancel /
Back / OFF-TOPIC with an explicit "prefer off-topic when uncertain"
default; `cancel setup` matches regex `/^(cancel|stop|abort)( setup)?[.!?\s]*$/i`
and preserves state; tool use is whitelisted (scanner + setup-state
CLI + cache reads between SCAN and WRITE; `AskUserQuestion` at
INTERVIEW states only; the six target file reads/writes only at
WRITE); no memory pre-fill from prior sessions; prompts render verbatim
in fenced code blocks at CONFIRM stages.

Detection-skip matrix auto-fills four questionIds when the scanner
already answered them: `story.problem` (via readme), `arch.classification`
(via monorepo), `arch.external_apis` (via externalApis), and
`workflow.new_dev_steps` (via scripts + readme). Recorded as
`"[auto-filled from <field>]"` before the already-answered skip-list
is evaluated.

Interaction mode contract governs how each interview question is
collected: `selectable` / `multi-selectable` (invoke `AskUserQuestion`),
`hybrid` (detection pre-fill + accept/edit/replace), or `free-text`
(default). Ten questions have non-default modes — 5 selectable, 2
multi-selectable, 3 hybrid. Fallback to numbered-list parsing when
`AskUserQuestion` is unavailable.

CONFIRM_HIGH and CONFIRM_MEDIUM's text-parse fallback show "→ Will be
saved as: <target>" under each detected item and handle the `help`
keyword (not `?` — Claude Code binds `?` to its built-in
keyboard-shortcut overlay) by rendering a Field-help block
(plain-English description, target file/section, example answer)
without advancing state. CONFIRM_MEDIUM uses the `AskUserQuestion` tool
directly when the per-item option count is ≤ 4 (the tool's schema cap)
— in that path the consequence info is carried inside each option's
`description` field and no `help` trigger is needed (description text
is inline). The Field-help table lives next to the QuestionId
enumeration and covers all 14 detection fields + 22 questionIds.

Output files (unchanged from prior /setup): CLAUDE.md, docs/spec/SPEC.md,
three SKILL.md files (backend-conventions, frontend-design-system,
project-patterns), docs/spec/PROGRESS.md. Merge strategy is
conservative: CLAUDE.md replaces only Tech Stack + Commands sections
by ATX heading; SPEC.md and SKILL.md files are fully rewritten when
template-only (CRLF-normalized SHA-256 matches workflow-meta.json),
otherwise append a "## Additions from /setup (<date>)" section;
PROGRESS.md only ever appends a "## Setup notes (<date>)" block.
```

### /sync (sync.md)

```markdown
Update shared-state files after merging feature PRs into develop.
Run on the develop branch AFTER all PRs are merged and conflicts resolved.

Pre-check: confirm on develop, check for conflict markers, check if
anything was merged since last sync (early exit if nothing to do).

Updates: PROGRESS.md (stats, completed items), SPEC.md (if features changed).

Version bump (v2.5.0+ aggregation model):

1. Bootstrap tag: `git describe --tags` — if no tag, prompt yes/custom/cancel
   to create a starting tag. Never silently invents one. Handles push-failure
   by preserving the local tag and telling the user to retry.
2. Aggregation: `gh pr list --state merged --base develop --limit 500`
   filtered by `merged:>=<last-tag-date>` with `%as` date format. Release
   PRs (`headRefName=develop` + `baseRefName=main`) filtered out. Each PR's
   body is scanned for `Version bump: {major|minor|patch|none}`. Missing
   declarations treated as `none` with a warning (carried through to both
   the release PR body and CHANGELOG entry).
3. Highest declared bump wins using precedence `major > minor > patch > none`.
   If the highest is `none`: update PROGRESS.md / SPEC.md, commit, push, stop.
   No version bump, no PR to main.
4. If bump is `patch`/`minor`/`major`: prompt ship/wait with release group
   summary (always prompts, including for major). On ship: bump
   package.json, append to CHANGELOG.md with section defaults (major/minor →
   Added; patch → Fixed; none-with-warning → Changed with ⚠ prefix) and
   content-driven placement across Added/Changed/Fixed/Tests/Docs.
5. Verify via /verify. Commit, push. Create PR to main with the release
   group summary (warnings included) as the PR body verbatim.

Publish is manual: maintainer creates a GitHub Release against main with
tag vX.Y.Z, which triggers release.yml → npm publish with provenance.
/sync does not publish.
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

### /review-changes (review-changes.md)

```markdown
Review changed code for reuse, quality, and efficiency.

CRITICAL: This is a READ-ONLY review. You MUST NOT edit any files.
You MUST NOT make any commits. You MUST NOT stage changes.
Only analyze and report.

1. Read recent changes (git diff HEAD~1 or staged changes)
2. Check for:
   - Duplicated code or missed reuse opportunities
   - Unnecessary complexity or abstraction
   - Inconsistency with project patterns
   - CLAUDE.md compliance issues
3. Report findings as a prioritized table:

| Finding | Category | Action                |
| ------- | -------- | --------------------- |
| [what]  | [type]   | Fix / Skip — [reason] |

The user will decide which findings to act on and apply fixes themselves.
Do NOT apply any fixes. Do NOT touch any files. REPORT ONLY.
```

### /build-fix (build-fix.md)

```markdown
Fix the current build failures. Delegates to the build-fixer agent
for diagnosis and resolution.

Process: Run full validation suite, categorize errors (build → type → test → lint),
fix one category at a time, re-run after each fix, confirm all green.

Rules: Never silence tests, never weaken lint rules, report unresolvable errors after 3 attempts.
```

### /refactor-clean (refactor-clean.md)

```markdown
Run a focused cleanup pass on the codebase. Delegates to the code-simplifier agent.

Cleans: dead code, duplication, complexity (>30 lines, >3 nesting levels), consistency.
Process: Focus on recent files first, one improvement at a time, test after every change.

Rules: Never change behavior, never combine with feature work, skip low-coverage files.
```

### /test-coverage (test-coverage.md)

```markdown
Analyze test coverage and fill gaps in critical areas. Delegates to the test-writer agent.

Process: Measure coverage, identify gaps in business logic and error paths,
prioritize by risk (HIGH: auth/validation, MEDIUM: business rules, LOW: getters),
write missing tests, report before/after coverage table.

Rules: Test behavior not implementation, no trivial tests, independent tests, report bugs don't fix.
```

---

## Universal Skills

All 12 universal skills are installed in directory format (`skill-name/SKILL.md`) under `.claude/skills/`. Source templates live in `templates/skills/universal/`. They follow Thariq's skill authoring standards:

- Skip the obvious
- Build a Gotchas section
- Progressive disclosure (folder structure when complex)
- Don't railroad — give info, let Claude adapt
- Description = trigger phrase for the model
- Include helper scripts where useful

### Skill Summaries

| Skill                    | Core Content                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| context-management.md    | Context budget awareness, when to /compact, when to /clear, subagent offloading for context hygiene     |
| git-conventions.md       | Branch naming, commit message format, PR workflow, worktree conventions                                 |
| planning-with-files.md   | How to structure implementation plans as files, progressive implementation, plan review process         |
| review-and-handoff.md    | Session ending protocol, HANDOFF document format, what to include for seamless continuation             |
| prompt-engineering.md    | Effective prompting patterns, challenge Claude, demand elegance, write detailed specs                   |
| verification.md          | Domain-specific verification beyond tests: browser, API, data, CLI. How to close the feedback loop      |
| testing.md               | Test philosophy, coverage strategy, test-first patterns, what to test vs what not to                    |
| claude-md-maintenance.md | How Claude writes rules for itself, when to update, how to keep CLAUDE.md lean                          |
| subagent-usage.md        | When to use subagents, how many, context hygiene, worktree isolation patterns                           |
| security-checklist.md    | OWASP Top 10 reference checklist any agent can consult when reviewing or writing security-relevant code |
| coordinator-mode.md      | Multi-agent coordination patterns, task decomposition, parallel agent orchestration                     |

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
│   │   ├── diff.js
│   │   ├── delete.js
│   │   ├── doctor.js
│   │   ├── scan.js                 # Project-fact detection (worclaude scan)
│   │   └── setup-state.js          # `/setup` state inspection + persistence CLI
│   ├── core/
│   │   ├── detector.js             # Scenario A/B/C detection
│   │   ├── merger.js               # Tiered merge logic
│   │   ├── scaffolder.js           # Template → project file creation
│   │   ├── backup.js               # Backup/restore logic
│   │   ├── config.js               # workflow-meta.json management
│   │   ├── file-categorizer.js     # Hash maps + file categorization for upgrade/diff
│   │   ├── setup-state.js          # /setup state machine persistence (schema + load/save)
│   │   └── project-scanner/        # Detection engine for `worclaude scan`
│   │       ├── index.js            # scanProject, writeDetectionReport
│   │       ├── manifests.js        # Shared package.json / pyproject.toml parsing
│   │       └── detectors/          # 14 Tier 1 detectors (one file per detector)
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
│   │       ├── quality/ (bug-fixer, security-reviewer, performance-auditor, refactorer, build-fixer, e2e-runner)
│   │       ├── docs/ (doc-writer, changelog-generator)
│   │       └── data/ (data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer)
│   ├── commands/ (18 slash commands)
│   └── skills/
│       ├── universal/ (12 files, installed as skill-name/SKILL.md)
│       └── templates/ (3 files, installed as skill-name/SKILL.md)
└── tests/
    ├── commands/ (init, upgrade, status, backup, restore, diff, delete, doctor, scan, setup-state)
    ├── core/ (detector, merger, scaffolder, backup, file-categorizer, hook-profiles, migration, setup-state, project-scanner/)
    ├── fixtures/scanner/ (minimal project fixtures for scanner tests)
    ├── generators/ (agent-routing)
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

### Post-release (v1.3.0–v1.9.0)

- Delete command: safe workflow removal with hash-based file classification
- Agent enrichment: structured guidance, output formats, decision frameworks for all agent templates
- New agents: build-fixer, e2e-runner; new commands: build-fix, refactor-clean, test-coverage; new skill: security-checklist
- Session persistence: SessionStart hook auto-loads CLAUDE.md, PROGRESS.md, last session summary, and branch
- Drift detection: /start command detects commits since last session
- Doctor command: 4-category health check (core files, components, docs, integrity)
- Hook profiles: WORCLAUDE_HOOK_PROFILE environment variable (minimal/standard/strict)
- CI & branching strategy, Windows compatibility, comprehensive documentation

### v2.0.0: Claude Code Runtime Integration

- Skills migrated to directory format (`skill-name/SKILL.md`) — required by Claude Code's skill loader
- All 25 agent templates enriched with runtime frontmatter (`description`, `disallowedTools`, `background`, `maxTurns`, `omitClaudeMd`, `memory`)
- Skill and command templates enriched with `when_to_use`, `paths`, and `description` frontmatter
- Doctor: CLAUDE.md size check (WARN 30KB / FAIL 38KB), skill format check, agent description check
- Upgrade migrations: automatic skill flat→directory conversion, agent frontmatter auto-patching
- New content: MEMORY.md template, coordinator-mode skill, enhanced verify-app agent
- E2E audit with 60+ new tests for migration and doctor checks
- Documentation: new claude-code-integration.md guide + 13 reference/guide page updates

### v2.1.0: Post-release Polish and Backlog Implementation

- Agent frontmatter: added `criticalSystemReminder`, `skills`, `initialPrompt` fields to select agents
- Skill templates: added `version` field to all 11 universal skill frontmatter
- Doctor: agent frontmatter completeness scoring, CLAUDE.md section analysis
- Settings validation matrix: 46 tests covering all language/docker template combinations
- MEMORY.md template: enriched with structured content format (rule + Why + How to apply)
- Tech debt: removed dead code, deduplicated workflow validation, data-driven command registration

### v2.2.0: Native Memory, Richer Skills

- Removed project-root MEMORY.md scaffolding — Claude Code's native memory system at `~/.claude/projects/<slug>/memory/` handles everything automatically
- Hooks reference: documented all 27 hook events (was 5) with matchers, exit codes, and use cases
- Hook types: documented all 4 types (command, prompt, http, agent) with per-type field tables
- Skill frontmatter: documented all 16 runtime fields (was 3) with applicability column
- Agent frontmatter: documented 6 new fields (tools, effort, color, permissionMode, mcpServers, hooks)
- CLAUDE.md @include directive and loading hierarchy documented
- Token budgets reference table added to context-management skill
- Coordinator mode: 4-phase workflow (Research → Synthesis → Implementation → Verification)
- Verify-app: added mobile, database migration, and data/ML pipeline verification patterns
- Documentation version examples updated from v1.1.0 to v2.2.0

---

## Design Decisions Reference

This spec is derived from tips by Boris Cherny (creator of Claude Code). Key design decisions:

1. **Agents are task-specific, not role-based.** No "backend-engineer" agents. Domain knowledge lives in skills.
2. **CLAUDE.md must be lean.** Under 50 lines. Progressive disclosure via skills.
3. **Sandbox with auto-allow** as default. Safety through structural isolation.
4. **High effort default.** Max escalated per session for complex tasks.
5. **Concise output style default.** Explanatory when exploring.
6. **Auto-naming for sessions.** Manual --name only when user wants it.
7. **Four hook events.** SessionStart context loading, format on write, PostCompact re-injection, notification on stop.
8. **All slash commands universal.** They're lightweight — include all 16 everywhere.
9. **Skills use progressive disclosure.** CLAUDE.md points to skills, skills load on demand.
10. **The pipeline: Design → Review → Execute → Quality → Verify → PR.**
11. **Hook profiles for flexibility.** Three levels (minimal/standard/strict) via environment variable — never break session context.
