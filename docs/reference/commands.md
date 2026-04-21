# CLI Commands

Worclaude commands are primarily interactive — input is collected through Inquirer.js prompts at runtime. A few commands accept flags for scripting and CI use: `worclaude upgrade` takes `--dry-run`, `--yes`, and `--repair-only`; `worclaude doctor` takes `--json`. Aside from these, no command accepts positional arguments.

## worclaude init

Scaffolds a complete Claude Code workflow into the current directory.

**Syntax**

```bash
worclaude init
```

**Behavior**

The command detects one of three scenarios automatically:

| Scenario             | Condition                                           | Action                                        |
| -------------------- | --------------------------------------------------- | --------------------------------------------- |
| **A -- Fresh**       | No `.claude/` directory, no `CLAUDE.md`             | Full scaffold from scratch                    |
| **B -- Existing**    | Some Claude files exist but no `workflow-meta.json` | Smart merge with backup                       |
| **Upgrade redirect** | `workflow-meta.json` exists                         | Tells user to run `worclaude upgrade` instead |

**Interactive prompts (all scenarios)**

1. **Project name** -- defaults to the current directory name.
2. **One-line description** -- free text.
3. **Project type** -- multi-select from 7 categories (Full-stack web application, Backend / API, Frontend / UI, CLI tool, Data / ML / AI, Library / Package, DevOps / Infrastructure).
4. **Tech stack** -- multi-select from 16 languages plus Docker toggle.
5. **Agent selection** -- optional agents recommended by project type, selectable by category.
6. **Confirmation** -- review summary with three choices: accept, start over, or adjust a specific step.

**Scenario A output (fresh)**

Creates all of the following:

- `CLAUDE.md` -- populated with project name, description, tech stack, and commands
- `.claude/settings.json` -- permissions and hooks for the selected stack
- `.claude/agents/` -- 6 universal + selected optional agents
- `.claude/commands/` -- 18 slash commands
- `.claude/skills/` -- 12 universal + 3 template + 1 generated skills (directory format)
- `.claude/workflow-meta.json` -- installation metadata with file hashes
- `.mcp.json` -- empty MCP server configuration
- `docs/spec/PROGRESS.md` -- if not already present
- `docs/spec/SPEC.md` -- project-type-specific template, if not already present

**Scenario B output (existing)**

1. Displays a detection report showing what already exists.
2. Creates a timestamped backup before any changes.
3. Merges new files alongside existing ones.
4. Saves conflicts under `.claude/workflow-ref/<same-path>` for manual review (kept out of `.claude/commands/` and `.claude/agents/` so references cannot shadow live files).
5. Generates `CLAUDE.md.workflow-suggestions` if CLAUDE.md already exists.

**Examples**

```bash
# Scaffold into a new project
mkdir my-api && cd my-api
worclaude init

# Scaffold into a project that already has some Claude files
cd existing-project
worclaude init
# → detects existing setup, creates backup, merges
```

**Notes**

- Existing `PROGRESS.md` and `SPEC.md` files are never overwritten.
- CLAUDE.md is never auto-merged in Scenario B; suggestions are saved separately.
- The confirmation step allows adjusting any individual step without restarting the entire flow.

---

## worclaude upgrade

Updates universal workflow components to the latest CLI version **and** repairs on-disk drift. Preserves user customizations.

**Syntax**

```bash
worclaude upgrade [--dry-run] [--yes] [--repair-only]
```

**Flags**

| Flag            | Effect                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| `--dry-run`     | Preview planned changes and exit without writing anything                      |
| `--yes`         | Skip the interactive confirmation prompt (for CI / scripted flows)             |
| `--repair-only` | Run only the drift-repair pass; skip template updates even on version mismatch |

**Prerequisites**

Requires an existing `workflow-meta.json` from a prior `worclaude init`. Exits with guidance if not found.

**Behavior**

1. Compares installed version against CLI version and categorizes every tracked file.
2. Builds a **repair plan** (missing files to restore, directories to re-create, sidecars to write).
3. Dispatches based on version state and drift:

| Situation                            | Flow                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| Versions match, no drift             | Prints `Already up to date (vX.Y.Z)` and exits        |
| Versions match, drift detected       | Runs the **Repair-only** flow (version unchanged)     |
| Versions differ (default)            | Runs repair pass, then the **Template update** flow   |
| Versions differ, `--repair-only` set | Runs the Repair-only flow; version stays at installed |

4. Displays a preview covering both repair and template work.
5. Prompts for confirmation (unless `--yes`).
6. Creates a backup before applying any changes.
7. Applies the repair pass, then template updates (auto-update / conflict sidecars / new files / settings merge).
8. Refreshes hashes and writes `workflow-meta.json`.

### File Categories

Every tracked file lands in one of these buckets:

| Category                | Meaning                                                                                    | Action                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Auto-update**         | File unchanged since install, template has new version                                     | Replaced with new version                          |
| **Conflict**            | User has customized the file, template has new version                                     | New version saved under `.claude/workflow-ref/`    |
| **New**                 | File added in this CLI version                                                             | Installed directly                                 |
| **Missing (expected)**  | File tracked in `fileHashes` but deleted on disk, and still shipped by the current version | **Restored** from template (hash refreshed)        |
| **Missing (untracked)** | File tracked in `fileHashes` but no longer in templates                                    | Removed from `fileHashes`; on-disk state unchanged |
| **Unchanged**           | Template unchanged between versions                                                        | No action                                          |
| **Modified**            | User customized, no template update available                                              | No action                                          |

### Drift Repair (Tier 1)

Before applying version-driven changes, `upgrade` reconciles the installation against the current template set:

- **Missing expected files** are restored from templates; their hashes are refreshed.
- **Hook scripts** (`.claude/hooks/*.{cjs,js}`) and **`AGENTS.md`** (tracked as `root/AGENTS.md`) became part of `buildTemplateHashMap` in v2.4.6. Installs predating v2.4.6 pick them up via the `newFiles` path on first upgrade. User-edited copies on disk with no corresponding `fileHashes` entry are preserved — a reference copy is written under `.claude/workflow-ref/<same-path>` instead of overwriting.
- **`.claude/learnings/`** (+ `.gitkeep`) is (re-)created if missing.
- When `CLAUDE.md` lacks memory-architecture guidance keywords, a sidecar is written at **`.claude/workflow-ref/CLAUDE.md`** with suggested additions. `CLAUDE.md` itself is never auto-modified.

**Examples**

```bash
# Standard upgrade (runs repair pass + template updates)
worclaude upgrade

# Preview without writing
worclaude upgrade --dry-run

# Non-interactive (CI-friendly)
worclaude upgrade --yes

# Repair drift only, don't touch template updates
worclaude upgrade --repair-only

# Repair + update without prompts
worclaude upgrade --repair-only --yes

# When already current and no drift
worclaude upgrade
# → "Already up to date (v2.4.6)."
```

**Notes**

- A backup is always created before any changes are applied (including repair-only runs).
- Reference copies under `.claude/workflow-ref/` should be reviewed manually; delete the directory (or individual files) when done.
- Settings merge is additive — existing permissions and hooks are preserved.
- Repair only restores files missing from disk. It never overwrites files the user edited; those migrate via the sidecar path.

### v2.0.0 Migration

When upgrading from a version below 2.0.0, two additional migrations run automatically:

- **Skill format migration** -- Flat `skill.md` files are moved to `skill/SKILL.md` directory format. Hash keys in `workflow-meta.json` are updated. Corresponding reference copies are moved along with them.
- **Workflow-ref relocation (v2.5.1)** -- Legacy `*.workflow-ref.md` files (and root-level `CLAUDE.md.workflow-ref.md` / `AGENTS.md.workflow-ref`) from pre-v2.5.1 installs are moved into `.claude/workflow-ref/<same-path>`. Idempotent — safe to run repeatedly.
- **Agent description patching** -- Agents missing the required `description` frontmatter field get it added. Unmodified agents are patched silently. Modified agents prompt for confirmation before patching.

The upgrade report shows migration counts (e.g., "Migrated: 14 skills to directory format", "Patched: 5 agents with description").

---

## worclaude status

Displays a summary of the current workflow installation.

**Syntax**

```bash
worclaude status
```

**Prerequisites**

Requires `workflow-meta.json`. Shows a setup prompt if not found.

**Output includes**

| Section          | Details                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Version info     | Installed version, install date, last update date                       |
| Project info     | Project types, tech stack                                               |
| Agents           | Universal count, optional count, optional agent names                   |
| Files            | Command count, skill count                                              |
| Customized files | Files whose hash differs from the installed version                     |
| Pending review   | Any files under `.claude/workflow-ref/` or `.workflow-suggestions` file |
| Settings         | Number of active hooks, number of permission rules                      |

**Examples**

```bash
worclaude status
```

**Notes**

- CLAUDE.md is always listed as potentially customized since it is expected to diverge.
- Pending review items indicate leftover merge artifacts from `init` or `upgrade`.

---

## worclaude backup

Creates a timestamped snapshot of all Claude workflow files.

**Syntax**

```bash
worclaude backup
```

**Behavior**

1. Creates a directory named `.claude-backup-YYYYMMDD-HHMMSS` in the project root.
2. Copies `CLAUDE.md`, the entire `.claude/` directory, and `.mcp.json` into the backup.
3. Displays a summary of backed-up contents (file counts per category).

No prompts are required. The command runs immediately.

**Examples**

```bash
worclaude backup
# → Backed up to .claude-backup-20260325-143022/
```

**Notes**

- Backups are local and not tracked by git (add `.claude-backup-*` to `.gitignore`).
- The `init` (Scenario B) and `upgrade` commands create backups automatically; this command is for manual use.

---

## worclaude restore

Restores a previous backup, replacing the current workflow files.

**Syntax**

```bash
worclaude restore
```

**Behavior**

1. Lists all available `.claude-backup-*` directories with relative timestamps (e.g., "2 hours ago").
2. User selects a backup from the list (or cancels).
3. Displays a warning that current files will be overwritten.
4. Prompts for confirmation (default: No).
5. Replaces `CLAUDE.md`, `.claude/`, and `.mcp.json` with the backup contents.

**Examples**

```bash
worclaude restore
# → Lists backups, user picks one, confirms, files restored
```

**Notes**

- Restore replaces the current `workflow-meta.json` with the backup version. Run `worclaude upgrade` afterward if the CLI has been updated since the backup.
- Confirmation defaults to "No" as a safety measure.

---

## worclaude diff

Compares the current workflow files against the installed versions.

**Syntax**

```bash
worclaude diff
```

**Prerequisites**

Requires `workflow-meta.json`. Exits with guidance if not found.

**Output categories**

| Symbol  | Category                             | Meaning                                                        |
| ------- | ------------------------------------ | -------------------------------------------------------------- |
| `~`     | Modified                             | User changed the file since install                            |
| `-`     | Missing (will be restored)           | Tracked file missing on disk, still shipped by current CLI     |
| `-`     | Deleted (removed in current version) | Tracked file missing on disk, no longer shipped by current CLI |
| `+`     | Extra                                | User added files not from the workflow                         |
| `^`     | Outdated                             | CLI has a newer template version available                     |
| (count) | Unchanged                            | Files matching their installed hash                            |

**Behavior**

- Compares file hashes against those stored in `workflow-meta.json`.
- Compares template hashes against the current CLI version to detect outdated files.
- Splits missing files into "will be restored" (still in templates) vs "removed in current version" so the next `worclaude upgrade` run is predictable.
- If outdated or restorable files are found, suggests running `worclaude upgrade`.

**Examples**

```bash
worclaude diff
# Shows categorized file differences

worclaude diff
# → "No changes detected." (when everything matches)
```

**Notes**

- Only files inside `.claude/` are tracked. CLAUDE.md and `.mcp.json` are not part of the hash comparison.
- The diff is read-only; it never modifies files.

---

## worclaude delete

Removes the worclaude workflow from the current project.

**Syntax**

```bash
worclaude delete
```

**Prerequisites**

Requires `workflow-meta.json`. Exits with guidance if not found.

**Behavior**

1. Creates a backup before any deletions.
2. Classifies every tracked file using hash comparison:

| Classification | Meaning                               | Action                       |
| -------------- | ------------------------------------- | ---------------------------- |
| **Unmodified** | File matches installed hash           | Deleted automatically        |
| **Modified**   | User has customized the file          | Prompts user (default: keep) |
| **User-owned** | Root files (CLAUDE.md, settings.json) | Prompts user (default: keep) |

3. Handles root files individually: `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, and `docs/spec/` files.
4. Removes `.claude/` directory contents (preserving Claude Code system dirs: `projects/`, `worktrees/`, `todos/`, `memory/`).
5. Cleans worclaude entries from `.gitignore`.
6. Shows global uninstall hint (`npm uninstall -g worclaude`).

**Examples**

```bash
worclaude delete
# → Creates backup, classifies files, prompts for modified files, removes workflow
```

**Notes**

- A backup is always created before deletion.
- Modified files default to "keep" when prompted.
- Claude Code system directories under `.claude/` are never touched.

---

## worclaude doctor

Validates the health of the current workflow installation.

**Syntax**

```bash
worclaude doctor
worclaude doctor --json       # Emit results as JSON for scripting
```

**Prerequisites**

Requires `workflow-meta.json`. Reports failure if not found.

**Checks performed**

| Section               | What it checks                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core Files**        | `workflow-meta.json`, `CLAUDE.md` (exists + line count ≤200 + memory-architecture guidance), `AGENTS.md`, `settings.json` (permissions + hooks object), `sessions/` directory |
| **CLAUDE.md Size**    | Character count against thresholds: warns at 30K, fails at 38K (hard limit 40K). Large files degrade context quality.                                                         |
| **Hooks**             | Hook event names against the Claude Code v2.1.101 documented set, key hook coverage (PreCompact/UserPromptSubmit/Stop), referenced hook script files exist, async flags       |
| **Components**        | All 6 universal agents present, selected optional agents present, all slash commands present, all skills present, agents use non-deprecated model names                       |
| **Skill Format**      | Detects flat `.md` files in `skills/` that should be in directory format (`skill-name/SKILL.md`). Reports count and filenames.                                                |
| **Agent Description** | Verifies all agent files have `name` and `description` in YAML frontmatter. Without these, agents are invisible to Claude Code.                                               |
| **Documentation**     | `docs/spec/PROGRESS.md` and `docs/spec/SPEC.md` presence                                                                                                                      |
| **Learnings**         | `.claude/learnings/` directory, `index.json` validity, orphaned entries                                                                                                       |
| **Git Integration**   | `.claude/sessions/` and `.claude/learnings/` are gitignored (via `git check-ignore`)                                                                                          |
| **Integrity**         | File hash verification against `workflow-meta.json`, pending files under `.claude/workflow-ref/` or `.workflow-suggestions`                                                   |

**Output**

Each check shows a status indicator:

- ✓ (green) — pass
- ⚠ (yellow) — warning (non-blocking)
- ✗ (red) — failure (action required)

**Exit codes**

- `0` — all checks pass
- `1` — at least one warning (no failures)
- `2` — at least one failure

**`--json` mode**

Suppresses the formatted output and emits a single JSON object with `version`, `path`, `timestamp`, `installed`, `summary` (pass/warn/fail counts), and `checks[]` (each with `category`, `status`, `label`, and optional `detail`). Useful for CI dashboards or scripting.

**Examples**

```bash
worclaude doctor
# → Runs all checks and reports status per item

worclaude doctor --json | jq '.summary'
# → {"pass": 20, "warn": 3, "fail": 0}
```

**Notes**

- Uses dynamic counts from `agents.js` — no hardcoded numbers.
- Customized files are reported as "intact" or "customized" (both are fine).
- Run after `worclaude init` or `worclaude upgrade` to verify installation.

---

## See Also

- [Getting Started](/guide/getting-started) -- first-time setup walkthrough
- [Existing Projects](/guide/existing-projects) -- Scenario B merge details
- [Upgrading](/guide/upgrading) -- version update workflow
