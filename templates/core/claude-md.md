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
- agent-routing.md — When and how to use each installed agent (READ EVERY SESSION)
{project_specific_skills}

## Session Protocol
**Start:** Read PROGRESS.md → Read `.claude/skills/agent-routing.md` → Read active implementation prompt if any.
**During:** One task at a time. Commit after each. Use subagents per routing guide.
**End:** Use /commit-push-pr (updates PROGRESS.md, commits, pushes, creates PR). Use /end only if stopping mid-task.

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
