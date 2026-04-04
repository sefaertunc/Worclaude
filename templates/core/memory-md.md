# MEMORY.md

> This file is an index of pointers, not storage. Each entry should be under ~200 characters.
> Limit: 200 lines / 25KB. Move detail into topic files in `.claude/memory/`.
> Claude Code reads this at session start — keep it lean.

## User

<!-- Role, preferences, expertise — helps Claude tailor responses -->
<!-- Example: - [Backend lead](user_role.md) — 8 years Python, new to this frontend -->

## Feedback

<!-- What to do and what to avoid — both corrections AND confirmed approaches -->
<!-- Format: rule, then **Why:** and **How to apply:** -->
<!-- Example: - [No mocks in integration tests](feedback_testing.md) — burned by mock/prod divergence -->

## Project

<!-- Ongoing work, goals, deadlines — convert relative dates to absolute -->
<!-- Format: fact/decision, then **Why:** and **How to apply:** -->
<!-- Example: - [Merge freeze 2026-03-05](project_release.md) — mobile team cutting release branch -->

## Reference

<!-- Pointers to external systems — Linear boards, Slack channels, dashboards -->
<!-- Example: - [Pipeline bugs](reference_linear.md) — tracked in Linear project "INGEST" -->

---

## Memory File Format

Each memory file in `.claude/memory/` uses this frontmatter:

```markdown
---
name: descriptive-name
description: one-line summary used to decide relevance in future sessions
type: user | feedback | project | reference
---

Content here. For feedback/project types, structure as:
Rule or fact.
**Why:** the reason or context.
**How to apply:** when and where this guidance applies.
```

## Drift and Verification

- Memory records become stale over time. Before acting on a memory, verify it against the current state of the codebase.
- If a memory names a file path, check the file still exists. If it names a function or flag, grep for it.
- If a recalled memory conflicts with current information, trust what you observe now — update or remove the stale memory.
- "The memory says X exists" is not the same as "X exists now."

## What NOT to save here

- Code patterns, architecture, file paths — derivable from current project state
- Git history, recent changes — `git log` / `git blame` are authoritative
- Debugging solutions — the fix is in the code, the context is in the commit message
- Anything already in CLAUDE.md
- Ephemeral task details — current conversation context, in-progress work

These exclusions apply even when explicitly asked to save. If asked to save a PR list or activity summary, ask what was *surprising* or *non-obvious* about it — that is the part worth keeping.

## Memory vs Plans vs Tasks

Memory is for information useful across conversations. Don't use it for:
- **Plans** — use a plan file or plan mode for implementation strategies within a session
- **Tasks** — use the task system for tracking work steps within a session
- **Session state** — current conversation context belongs in the conversation, not memory
