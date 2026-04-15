# Learnings

Worclaude scaffolds a **learning loop** — a lightweight system that captures corrections and rules you give Claude during a session, persists them to disk, and replays them at the start of every future session. Unlike CLAUDE.md (shared static rules, version-controlled), learnings are **personal, dynamic, and gitignored** — they belong to the developer, not the repo.

## Two-Store Memory Architecture

Worclaude keeps project memory in two stores with complementary strengths:

| Store                | Scope                | Lifecycle                                                         | Tracked in git  | Loaded when                                       |
| -------------------- | -------------------- | ----------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| `CLAUDE.md`          | Project (shared)     | Edited deliberately; capped at ~200 lines                         | Yes             | Every session (always)                            |
| `.claude/learnings/` | Developer (personal) | Auto-grows via hooks and `/learn`; pruned when learnings go stale | No (gitignored) | Every session (SessionStart loads recent entries) |

**Rule of thumb:** if a rule applies to every contributor on the project, it goes in CLAUDE.md. If it is specific to how _you_ work with Claude on _this_ project, it goes in `.claude/learnings/`.

---

## How Learnings Are Captured

Three entry points, in increasing order of user effort:

### 1. Automatic correction detection (UserPromptSubmit hook)

The `correction-detect.cjs` hook runs on every user prompt and matches two pattern groups:

**Correction patterns** — surface a hint that Claude may have made a mistake:

- `no, that's wrong` / `not right` / `incorrect`
- `you should` / `you shouldn't` / `you need to` / `you forgot`
- `that's not what I meant/asked/wanted`
- `wrong file`
- `undo that` / `don't do that`
- `actually, …` / `I said …`

**Learn patterns** — explicit save signals:

- `remember this` / `remember that`
- `add this to your rules`
- `don't do that again`
- `learn from this`
- `[LEARN]`

On a match, the hook writes `[Correction detected]` or `[Learn trigger detected]` to stdout — Claude sees it and is prompted to propose a `[LEARN]` block.

### 2. Automatic learning extraction (Stop hook)

The `learn-capture.cjs` hook runs when Claude stops. It scans the last 20 lines of the session transcript for `[LEARN]` blocks in this format:

```
[LEARN] Category: One-line rule description
Mistake: What went wrong (optional)
Correction: What should happen instead (optional)
```

Each block is persisted to `.claude/learnings/{category-slug}.md` with YAML frontmatter. The file is created if it does not exist, or appended to if it does. An entry is added to `.claude/learnings/index.json` with metadata.

The hook uses a file-based re-entry guard (`.claude/.stop-hook-active`) so hypothetical re-entrant Stop events do not duplicate entries. Stop hook always exits 0 — it never blocks session termination.

### 3. Explicit `/learn` command

When the user runs `/learn <text>`, Claude formats the text as a `[LEARN]` block and writes it directly. This is the most explicit path — useful for capturing rules that didn't come from a mid-session correction.

See the [Slash Commands reference](/reference/slash-commands#learn) for the full `/learn` definition.

---

## How Learnings Are Replayed

The `SessionStart` hook reads `.claude/learnings/index.json` and injects the most recent learnings into the session context before Claude sees the user's first prompt. This is why learnings survive across sessions without the user having to re-state them.

In practice: you correct Claude once, it captures the rule, and the next time you start a Claude Code session on this project the rule is already loaded.

---

## File Format

### Per-category Markdown file

Each distinct `[LEARN] Category:` value produces one file at `.claude/learnings/{category-slug}.md`:

```markdown
---
created: 2026-04-15
category: git
project: worclaude
times_applied: 0
---

**Rule:** Always use `Bash(git:*)` wildcard instead of listing subcommands.
**Mistake:** Listed individual git subcommands, causing new ones to trigger approval prompts.
**Correction:** Use `Bash(git:*)` in the permissions array.
```

Fields:

| Field           | Purpose                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `created`       | ISO date the entry was first persisted                                                                    |
| `category`      | Verbatim from the `[LEARN]` block — used as the slug basis                                                |
| `project`       | Name of the project (from `package.json` or the directory name) — useful when a dotfiles sync merges them |
| `times_applied` | Usage counter. Not auto-incremented; tools can bump it when they notice a rule firing                     |

Multiple `[LEARN]` blocks with the same category append to the same file with a blank-line separator, so a single `git.md` can accumulate many git-related rules over time.

### `index.json`

```json
{
  "learnings": [
    {
      "file": "git.md",
      "category": "git",
      "created": "2026-04-15",
      "times_applied": 0
    }
  ]
}
```

`index.json` is the source of truth the SessionStart hook reads. Each entry maps to a file in `.claude/learnings/`. The index is overwritten atomically on each Stop-hook write.

---

## Directory Layout

```
.claude/
  learnings/
    index.json                # source-of-truth index (read by SessionStart)
    git.md                    # one file per learning category
    testing.md
    api-conventions.md
```

---

## Why Gitignored

Learnings are gitignored by default because:

1. **They are personal.** A correction you made because Claude misread _your_ mental model should not surface to every other contributor's session.
2. **They are noisy in history.** The SessionStart + Stop hook loop writes files on every session — turning them into git churn would be worse than the signal they provide.
3. **They can contain private context.** `[LEARN]` blocks sometimes record things like "we use internal auth service X at $COMPANY" — fine on your machine, not fine in a public repo.

If you want to share a learning with your team, **promote it**: move the rule from `.claude/learnings/{category}.md` into CLAUDE.md's Critical Rules or Gotchas section. That is the self-healing loop described in the [claude-md-maintenance skill](/reference/skills#claude-md-maintenance).

---

## Doctor Integration

`worclaude doctor` validates the learnings system as part of its integrity checks:

- `.claude/learnings/index.json` parses as valid JSON
- Every file referenced in the index exists on disk
- Every `.md` file in the directory has a corresponding index entry (no orphans)
- YAML frontmatter is present and has the expected fields

Failures are surfaced as `FAIL` badges; warnings as `WARN`. See the [`worclaude doctor` reference](/reference/commands#doctor) for the full check list.

---

## Hook Profile Behavior

| Profile    | Correction detection | Learning capture | Session load |
| ---------- | -------------------- | ---------------- | ------------ |
| `minimal`  | Off                  | Off              | On (always)  |
| `standard` | On                   | On               | On           |
| `strict`   | On                   | On               | On           |

On `minimal`, the SessionStart hook still loads learnings that already exist on disk — new captures just do not fire. Users who want zero learning-system overhead can delete the `.claude/learnings/` directory entirely; doctor will flag it as an info message, not a failure.

---

## See Also

- [Slash Commands: `/learn`](/reference/slash-commands#learn) — explicit capture command
- [Hooks: SessionStart, Stop, UserPromptSubmit](/reference/hooks) — the three hooks that make the loop work
- [Skills: `claude-md-maintenance`](/reference/skills#claude-md-maintenance) — when to promote a learning into CLAUDE.md
- [Claude Code Integration](/guide/claude-code-integration) — how the two-store memory architecture fits with Claude Code's native memory system
