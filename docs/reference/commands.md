# CLI Commands

All Worclaude commands are fully interactive. They accept no positional arguments or flags (beyond `--help` and `--version` on the main binary). User input is collected through Inquirer.js prompts at runtime.

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
- `.claude/agents/` -- 5 universal + selected optional agents
- `.claude/commands/` -- 17 slash commands
- `.claude/skills/` -- 12 universal + 3 template + 1 generated skills (directory format)
- `.claude/workflow-meta.json` -- installation metadata with file hashes
- `.mcp.json` -- empty MCP server configuration
- `docs/spec/PROGRESS.md` -- if not already present
- `docs/spec/SPEC.md` -- project-type-specific template, if not already present

**Scenario B output (existing)**

1. Displays a detection report showing what already exists.
2. Creates a timestamped backup before any changes.
3. Merges new files alongside existing ones.
4. Saves conflicts as `.workflow-ref.md` files for manual review.
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

Updates universal workflow components to the latest CLI version. Preserves user customizations.

**Syntax**

```bash
worclaude upgrade
```

**Prerequisites**

Requires an existing `workflow-meta.json` from a prior `worclaude init`. Exits with guidance if not found.

**Behavior**

1. Compares installed version against CLI version. Exits early if already current.
2. Categorizes every tracked file into one of five buckets:

| Category        | Meaning                                       | Action                                  |
| --------------- | --------------------------------------------- | --------------------------------------- |
| **Auto-update** | File unchanged since install                  | Replaced with new version               |
| **Conflict**    | User has customized the file                  | New version saved as `.workflow-ref.md` |
| **New**         | File added in this CLI version                | Installed directly                      |
| **Unchanged**   | Template unchanged between versions           | No action                               |
| **Modified**    | User customized, no template update available | No action                               |

3. Displays a preview of all changes.
4. Prompts for confirmation (Yes / No).
5. Creates a backup before applying any changes.
6. Merges new permissions and hooks into `settings.json`.
7. Recomputes file hashes and updates `workflow-meta.json`.

**Examples**

```bash
# Standard upgrade
worclaude upgrade

# When already current
worclaude upgrade
# → "Already up to date (v2.2.6)."
```

**Notes**

- A backup is always created before changes are applied.
- Conflict files should be reviewed manually; delete `.workflow-ref.md` files when done.
- Settings merge is additive -- existing permissions and hooks are preserved.

### v2.0.0 Migration

When upgrading from a version below 2.0.0, two additional migrations run automatically:

- **Skill format migration** -- Flat `skill.md` files are moved to `skill/SKILL.md` directory format. Hash keys in `workflow-meta.json` are updated. Corresponding `.workflow-ref.md` files are also moved inside the skill directory.
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

| Section          | Details                                                 |
| ---------------- | ------------------------------------------------------- |
| Version info     | Installed version, install date, last update date       |
| Project info     | Project types, tech stack                               |
| Agents           | Universal count, optional count, optional agent names   |
| Files            | Command count, skill count                              |
| Customized files | Files whose hash differs from the installed version     |
| Pending review   | Any `.workflow-ref.md` or `.workflow-suggestions` files |
| Settings         | Number of active hooks, number of permission rules      |

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

| Symbol  | Category  | Meaning                                    |
| ------- | --------- | ------------------------------------------ |
| `~`     | Modified  | User changed the file since install        |
| `-`     | Deleted   | File was removed since install             |
| `+`     | Extra     | User added files not from the workflow     |
| `^`     | Outdated  | CLI has a newer template version available |
| (count) | Unchanged | Files matching their installed hash        |

**Behavior**

- Compares file hashes against those stored in `workflow-meta.json`.
- Compares template hashes against the current CLI version to detect outdated files.
- If outdated files are found, suggests running `worclaude upgrade`.

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
| **Components**        | All 5 universal agents present, selected optional agents present, all slash commands present, all skills present, agents use non-deprecated model names                       |
| **Skill Format**      | Detects flat `.md` files in `skills/` that should be in directory format (`skill-name/SKILL.md`). Reports count and filenames.                                                |
| **Agent Description** | Verifies all agent files have `name` and `description` in YAML frontmatter. Without these, agents are invisible to Claude Code.                                               |
| **Documentation**     | `docs/spec/PROGRESS.md` and `docs/spec/SPEC.md` presence                                                                                                                      |
| **Learnings**         | `.claude/learnings/` directory, `index.json` validity, orphaned entries                                                                                                       |
| **Git Integration**   | `.claude/sessions/` and `.claude/learnings/` are gitignored (via `git check-ignore`)                                                                                          |
| **Integrity**         | File hash verification against `workflow-meta.json`, pending `.workflow-ref.md` or `.workflow-suggestions` files                                                              |

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
