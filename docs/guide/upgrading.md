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
  Comparing current setup to workflow v2.2.3:

  Modified (your changes):
  ~ CLAUDE.md (added 5 gotchas)
  ~ .claude/skills/testing/SKILL.md (added pytest patterns)

  Missing (removed or never installed):
  - .claude/agents/doc-writer.md

  Extra (you added):
  + .claude/skills/my-custom-skill.md
  + .claude/agents/my-custom-agent.md
```

This is a read-only command -- it does not change anything. Use it to decide whether an upgrade is worth doing.

## Running the Upgrade

```bash
worclaude upgrade
```

Worclaude reads your `.claude/workflow-meta.json` to understand what was originally installed and what version you are on:

```
  Worclaude Upgrade

  Current version: 2.1.0
  New version:     2.2.3
```

If you are already on the latest version, Worclaude tells you and exits.

## How Change Detection Works

Worclaude uses SHA-256 hashes stored in `workflow-meta.json` to categorize every file into one of five groups:

1. **Auto-update** -- Files you have not modified since installation. These are safe to update automatically because you have not customized them.
2. **Conflict** -- Files you have customized AND the workflow has updated. These need your review.
3. **New files** -- Files that did not exist in the previous version. These are added directly.
4. **Unchanged** -- Files where neither you nor the workflow made changes. Nothing to do.
5. **Modified** -- Files you customized but the workflow has not updated. Your changes are preserved as-is.

The preview shows all five categories before anything is written:

```
  Changes:

  Auto-update (unchanged since install):
    ✓ agents/plan-reviewer.md
    ✓ agents/code-simplifier.md
    ✓ 12 more files

  Needs review (you've customized these):
    ~ skills/context-management.md (modified since install)

  New in this version:
    + agents/incident-responder.md

  Unchanged (no updates needed): 8 files

  Your customizations (no workflow updates available):
    ~ skills/testing.md

? Proceed with upgrade? (Y/n)
```

## What Happens During the Upgrade

After you confirm, Worclaude:

1. **Creates a backup** of your entire Claude Code setup (same timestamped backup as Scenario B).
2. **Auto-updates** files you have not touched -- replaces them with the new version directly.
3. **Saves conflict files** as `.workflow-ref.md` alongside your customized versions, so you can review and merge at your own pace.
4. **Adds new files** directly to your `.claude/` directory.
5. **Merges settings.json** -- appends any new permissions and hooks using the same tiered logic as the initial merge (new permissions are appended, hook conflicts are prompted).
6. **Updates workflow-meta.json** with the new version number, timestamp, and recomputed file hashes.

```
  Upgrade complete! (2.2.2 → 2.2.3)

  Updated:     14 files
  Conflicts:   1 files (saved as .workflow-ref.md)
  New:         1 files added
  Unchanged:   8 files
  Customized:  2 files (no updates needed)

  Backup: .claude-backup-20260325-091500/

  Review .workflow-ref.md files and merge what's useful.
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
