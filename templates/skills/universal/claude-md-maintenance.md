---
description: "How Claude writes rules for itself, when to update CLAUDE.md, keeping it lean and effective"
when_to_use: "When considering updates to CLAUDE.md, when the same mistake has happened twice, when CLAUDE.md is getting too long"
version: "1.0.0"
---

# CLAUDE.md Maintenance

## The Self-Healing Pattern

When Claude makes the same mistake twice, it should update CLAUDE.md to prevent a
third occurrence. This is "self-healing" — the system learns from its errors.

The cycle:
1. Claude makes mistake X
2. User corrects Claude
3. Claude makes mistake X again
4. Claude (or user) adds a rule to CLAUDE.md: "Don't do X. Do Y instead."
5. Mistake X doesn't happen again

This is why the Gotchas section exists. It grows organically from real problems
encountered during development.

## The 200-Line Target

CLAUDE.md should stay under 200 lines of actual content. This is the official
Claude Code guidance and matches `worclaude doctor`'s WARN threshold (150 lines /
30,000 chars) and ERROR threshold (200 lines). It is a target, not a hard limit,
but exceeding it significantly means CLAUDE.md is trying to do too much.

Claude reads CLAUDE.md at the start of every session and after every /compact.
Long CLAUDE.md files waste context on every single interaction.

## What Belongs in CLAUDE.md

YES:
- Project identity (name, one-line description)
- Key file pointers (PROGRESS.md, SPEC.md)
- Tech stack and build/test/run commands
- Session protocol (start/during/end)
- Critical rules (5-10 maximum)
- Gotchas (grows, but prune regularly)
- Skills pointer (list of available skills)

NO:
- Detailed coding standards (put in a skill)
- Architecture documentation (put in a skill or docs/)
- API documentation (put in docs/)
- Full workflow descriptions (put in a skill)
- Things Claude already knows (common language features, standard libraries)

## What Belongs in Skills vs CLAUDE.md

CLAUDE.md: things Claude needs to know EVERY session, regardless of task.
Skills: things Claude needs to know SOMETIMES, for specific types of work.

Example:
- "Use conventional commits" -> CLAUDE.md (applies to every commit)
- "Commit message format: type(scope): description, body explains why..." -> skill
  (only needed when actually writing commits)

## Maintaining the Gotchas Section

The Gotchas section captures project-specific traps. Format:

```markdown
## Gotchas
- The settings merger must handle comment strings in JSON arrays (they're not valid
  JSON but we support them for readability)
- Always use path.join(), never string concatenation for file paths — breaks on Windows
- The backup directory uses timestamps with colons replaced by hyphens for Windows compat
```

Each gotcha should be:
- Specific (not "be careful with paths")
- Actionable (says what to do, not just what's wrong)
- Born from real experience (don't pre-populate with hypotheticals)

## When to Prune

Review CLAUDE.md when:
- It exceeds the 200-line target
- You notice rules that no longer apply
- A rule has been absorbed into a skill
- Two rules say the same thing differently

Pruning checklist:
- Remove rules for code that no longer exists
- Consolidate duplicate rules
- Move detailed guidance to skills
- Remove gotchas that have been fixed at the code level

## Using /update-claude-md

The /update-claude-md command helps at session end:
1. Reviews what happened during the session
2. Identifies mistakes that should become rules
3. Identifies patterns worth documenting
4. Proposes additions with diffs

Always review proposed changes before applying. Not every mistake needs a rule.
Only add rules for recurring problems.

## The @include Directive

When CLAUDE.md outgrows what one file can hold cleanly, use `@path/to/import`
to split content into separate files that still load with CLAUDE.md:

```markdown
# CLAUDE.md
## Key Files
@README
@docs/git-instructions.md
@~/.claude/my-project-instructions.md
```

Syntax (per official Claude Code docs):

- `@path/to/import` — relative to the file containing the directive
  (e.g., `@README`, `@docs/git-instructions.md`)
- `@~/path` — home-directory relative
  (e.g., `@~/.claude/my-project-instructions.md`)
- Works in CLAUDE.md, .claude/CLAUDE.md, .claude/rules/*.md, and CLAUDE.local.md
- Does NOT work inside code blocks (only in leaf text nodes)
- Non-existent files are silently ignored; circular references are prevented

Behavior:

- **Imports load at launch and consume context.** They help organization, not
  context budget. Splitting CLAUDE.md into 5 files of 50 lines each produces
  the same context cost as one 250-line file.
- **Recursion is capped at 5 hops.** A imports B imports C... — Claude stops
  resolving after 5 levels.
- **External imports trigger an approval dialog on first use.** Importing a
  path outside the project root (e.g., a system-wide config) prompts the user
  to confirm before the import resolves. This is a one-time approval.

### The `@~/.claude/...` worktree-share pattern

Worktree agents (`isolation: worktree`) operate in a freshly-checked-out copy
of the repo. Anything in `.claude/CLAUDE.local.md` or other gitignored files
is not present in the worktree, so the agent loses your local rules.

Workaround: store shared local rules in a home-directory file and import it
from the project's CLAUDE.md:

```markdown
# CLAUDE.md
@~/.claude/my-team-rules.md
```

The worktree agent re-reads `~/.claude/my-team-rules.md` at launch (it lives
outside the repo, so no checkout is needed) and gets the same rules as your
main session. The first run triggers an external-import approval; after that
it loads silently.

Reserve this pattern for rules that belong to *you* across all projects
(coding style preferences, personal shortcuts). Team-shared rules should
still live inside the repo.

## Gotchas

- CLAUDE.md is read as system context, not as a document. Write it as instructions,
  not as documentation. "Use path.join for file paths" not "The project uses
  path.join for file paths because..."
- Don't add rules preemptively. Wait for the mistake to happen twice. Premature
  rules clutter the file without proven value.
- If CLAUDE.md contradicts a skill file, CLAUDE.md wins. Keep them consistent.
- Skills are loaded on demand. CLAUDE.md is always loaded. Use this asymmetry
  intentionally.
