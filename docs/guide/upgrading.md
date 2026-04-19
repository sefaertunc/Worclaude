# Upgrading

When a new version of Worclaude is released, you can update your project's workflow files without losing your customizations. This page covers Scenario C: upgrading a project that was previously set up with Worclaude.

## When to Upgrade

First, update the Worclaude CLI itself:

```bash
npm install -g worclaude@latest
```

Then check if your project has available updates:

```bash
worclaude diff
```

This compares your current setup against the latest workflow version and shows what has changed:

```
  Comparing current setup to workflow v2.4.6:

  Modified (your changes):
  ~ CLAUDE.md (added 5 gotchas)
  ~ .claude/skills/testing/SKILL.md (added pytest patterns)

  Missing (will be restored by upgrade):
  - .claude/hooks/learn-capture.cjs
  - .claude/agents/doc-writer.md

  Deleted (removed in current version):
  - .claude/agents/retired-agent.md

  Extra (you added):
  + .claude/skills/my-custom-skill.md
  + .claude/agents/my-custom-agent.md
```

This is a read-only command -- it does not change anything. Use it to decide whether an upgrade is worth doing.

The two "Missing" categories behave differently during `worclaude upgrade`:

- **Missing (will be restored)** — file is tracked in `workflow-meta.json` and still shipped by the current CLI. The next `upgrade` run will re-install it from the template.
- **Deleted (removed in current version)** — file is tracked in `workflow-meta.json` but no longer in the current CLI's templates (the workflow retired it). Upgrade will drop it from tracking; the on-disk state (gone) stays gone.

## Running the Upgrade

```bash
worclaude upgrade
```

Worclaude reads your `.claude/workflow-meta.json` to understand what was originally installed and what version you are on:

```
  Worclaude Upgrade

  Current version: 2.4.5
  New version:     2.4.6
```

If you are already on the latest version **and** nothing has drifted from the installed state, Worclaude prints `Already up to date (vX.Y.Z)` and exits. If versions match but some files have been deleted from disk, Worclaude enters the **Repair-only flow** described below.

### Flags

`worclaude upgrade` accepts three optional flags:

| Flag            | Purpose                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| `--dry-run`     | Preview the planned changes and exit without writing anything                  |
| `--yes`         | Skip the interactive confirmation prompt (useful in CI or scripted flows)      |
| `--repair-only` | Run only the drift-repair pass; skip template updates even on version mismatch |

```bash
# Preview first, apply second
worclaude upgrade --dry-run
worclaude upgrade

# Non-interactive repair for CI
worclaude upgrade --repair-only --yes
```

## How Change Detection Works

Worclaude uses SHA-256 hashes stored in `workflow-meta.json` to categorize every file. Files split into these groups:

1. **Auto-update** — Files you have not modified since installation. Safe to replace with the new version.
2. **Conflict** — Files you have customized AND the workflow has updated. The new version is saved as `.workflow-ref.md` alongside yours; review manually.
3. **New files** — Files that did not exist in the previous version. Added directly.
4. **Missing (will be restored)** — Files tracked in `workflow-meta.json` but missing on disk, and still shipped by the current version. Restored from templates during the repair pass.
5. **Deleted (removed in current version)** — Files tracked in `workflow-meta.json` but no longer in the current templates. Dropped from tracking.
6. **Unchanged** — Neither you nor the workflow made changes. Nothing to do.
7. **Modified** — You customized the file and the workflow has not updated it. Preserved as-is.

The preview shows each non-empty category before anything is written:

```
  Changes:

  + Restore (missing from disk):
    + hooks/learn-capture.cjs

  ✓ Auto-update (unchanged since install):
    ✓ agents/plan-reviewer.md
    ✓ agents/code-simplifier.md
    ✓ 12 more files

  ~ Needs review (you've customized these):
    ~ skills/context-management.md (modified since install)

  + New in this version:
    + agents/incident-responder.md

  ~ Also:
    ~ CLAUDE.md memory guidance missing (will write CLAUDE.md.workflow-ref.md)

  = Unchanged: 8 files

  ~ Your customizations (no workflow updates available):
    ~ skills/testing.md

? Proceed with upgrade? (Y/n)
```

## The Repair-Only Flow

If your CLI and installed versions match but `worclaude doctor` reports drift — typically missing hook scripts, a missing `AGENTS.md`, a missing `.claude/learnings/` directory, or CLAUDE.md without memory-architecture guidance — `worclaude upgrade` runs a **repair-only** flow. It restores missing files and writes sidecars without bumping the recorded version:

```
  Worclaude Repair (v2.4.6)

  Drift detected:
  + Restore (missing from disk):
    + hooks/pre-compact-save.cjs
    + hooks/learn-capture.cjs
    + hooks/correction-detect.cjs
    + hooks/skill-hint.cjs

  ~ Also:
    ~ .claude/learnings/ directory missing (will be created)
    ~ CLAUDE.md memory guidance missing (will write CLAUDE.md.workflow-ref.md)

? Repair drifted files? (Y/n)
```

You can force this flow on any version with `worclaude upgrade --repair-only`, which applies the repair pass and skips the template-update step even when a newer version is available.

### Tracked files added in v2.4.6

Earlier versions of `worclaude upgrade` did not track hook scripts or `AGENTS.md`, so deleting them went undetected. v2.4.6 fixes this by adding `hooks/*.{cjs,js}` and `root/AGENTS.md` to the tracked file set. Projects initialized before v2.4.6 pick up these entries automatically on first upgrade:

- Hook scripts and `AGENTS.md` already on disk with unmodified content get quietly tracked in `workflow-meta.json`.
- User-edited hook scripts or `AGENTS.md` on disk — bytes that do not match the template — are **preserved**, and a `.workflow-ref<ext>` sidecar is written alongside so you can compare and merge manually.

### CLAUDE.md handling

`CLAUDE.md` is always considered user-owned; `worclaude upgrade` never edits it in place. If it lacks memory-architecture guidance keywords (`memory architecture`, `.claude/learnings`, `[LEARN]`, `/learn`, etc.), upgrade writes a `CLAUDE.md.workflow-ref.md` sidecar with a suggested snippet. Paste the snippet into your `CLAUDE.md` wherever makes sense, then delete the sidecar.

## What Happens During the Upgrade

After you confirm, Worclaude:

1. **Creates a backup** of your entire Claude Code setup (same timestamped backup as Scenario B).
2. **Auto-updates** files you have not touched -- replaces them with the new version directly.
3. **Saves conflict files** as `.workflow-ref.md` alongside your customized versions, so you can review and merge at your own pace.
4. **Adds new files** directly to your `.claude/` directory.
5. **Merges settings.json** -- appends any new permissions and hooks using the same tiered logic as the initial merge (new permissions are appended, hook conflicts are prompted).
6. **Updates workflow-meta.json** with the new version number, timestamp, and recomputed file hashes.

```
  Upgrade complete! (2.4.5 → 2.4.6)

  Restored:    4 files
  Updated:     14 files
  Conflicts:   1 files (saved as .workflow-ref.md)
  New:         1 files added
  Unchanged:   8 files
  Customized:  2 files (no updates needed)
  Sidecar:     1 suggestion files

  Backup: .claude-backup-20260419-091500/

  Review .workflow-ref files and merge what's useful.
```

## Upgrading from v1.x to v2.0.0

v2.0.0 introduces Claude Code runtime integration. Two structural changes require migration:

**What changed:**

- **Skill format:** Flat `.md` files replaced with `skill-name/SKILL.md` directory format. Claude Code silently ignores flat files in the skills directory.
- **Agent frontmatter:** The `description` field is now required. Without it, agents are invisible to Claude Code's `/agents` listing and routing.
- **New skill:** `coordinator-mode` added for multi-agent orchestration.
- **New doctor checks:** CLAUDE.md size limits, skill format validation, agent description verification.

**What `worclaude upgrade` does automatically:**

1. Migrates skill files from flat to directory format (e.g., `testing.md` → `testing/SKILL.md`)
2. Moves corresponding `.workflow-ref.md` files inside skill directories
3. Patches agent files with missing `description` frontmatter (auto-patches unmodified agents; prompts for modified ones)
4. Updates hash keys in `workflow-meta.json` for the new skill paths

**How to verify the upgrade:**

1. Run `worclaude doctor` -- all new checks should pass
2. Start Claude Code and run `/skills` to confirm skills are loaded with descriptions
3. Run `/agents` to confirm all agents are visible
4. Check that conditional skills activate only when working on matching files

**If something went wrong:** Run `worclaude restore` to roll back from the automatic backup.

## Handling Conflict Files

After the upgrade, review any `.workflow-ref.md` files the same way you would after a Scenario B merge. Open the reference file alongside your customized version, merge what is useful, and delete the reference file when you are done.

See [Existing Projects](/guide/existing-projects) for detailed guidance on reviewing `.workflow-ref.md` files.

## Restoring After a Failed Upgrade

If something goes wrong, restore from the backup:

```bash
worclaude restore
```

Select the backup that was created during the upgrade and your setup will be restored to its pre-upgrade state.

## Next Steps

- [Workflow Tips](/guide/workflow-tips) -- Best practices for working with Claude Code
- [Existing Projects](/guide/existing-projects) -- How the merge system works in detail
- [Getting Started](/guide/getting-started) -- Full setup walkthrough for new projects
