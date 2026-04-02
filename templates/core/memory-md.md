# MEMORY.md

> This file is an index of pointers, not storage. Each entry should be under ~200 characters.
> Limit: 200 lines / 25KB. Move detail into topic files in `.claude/memory/`.
> Claude Code reads this at session start — keep it lean.

## User

<!-- Role, preferences, expertise — helps Claude tailor responses -->

## Feedback

<!-- What to do and what to avoid — both corrections AND confirmed approaches -->
<!-- Format: rule, then **Why:** and **How to apply:** -->

## Project

<!-- Ongoing work, goals, deadlines — convert relative dates to absolute -->
<!-- Format: fact/decision, then **Why:** and **How to apply:** -->

## Reference

<!-- Pointers to external systems — Linear boards, Slack channels, dashboards -->

---

## What NOT to save here

- Code patterns, architecture, file paths — derivable from current project state
- Git history, recent changes — `git log` / `git blame` are authoritative
- Debugging solutions — the fix is in the code, the context is in the commit message
- Anything already in CLAUDE.md
- Ephemeral task details — current conversation context, in-progress work
