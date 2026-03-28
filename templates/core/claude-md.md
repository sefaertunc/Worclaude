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
- claude-md-maintenance.md — CLAUDE.md self-healing
- git-conventions.md — Commits, branches, versioning
- planning-with-files.md — Implementation planning
- prompt-engineering.md — Prompting patterns and quality
- review-and-handoff.md — Session endings
- verification.md — How to verify work
- testing.md — Test philosophy and patterns
- subagent-usage.md — When and how to use subagents
- agent-routing.md — When and how to use each installed agent (READ EVERY SESSION)
{project_specific_skills}

## Session Protocol
**Start:** Read PROGRESS.md → Read `.claude/skills/agent-routing.md` → Read active implementation prompt if any.
**During:** One task at a time. Commit after each. Use subagents per routing guide.
**Feature branch:** /start → work → /verify → /commit-push-pr
**After merging PRs:** git checkout develop → git pull → /conflict-resolver (if needed) → /sync
**Mid-task stop:** /end (writes handoff file)

## Critical Rules
1. SPEC.md is source of truth. Do not invent features.
2. Test before moving on.
3. Ask if ambiguous. Do not guess.
4. Read source files before writing. Never assume.
5. Self-healing: same mistake twice → update CLAUDE.md.
6. Use subagents to keep main context clean.
7. Mediocre fix → scrap it, implement elegantly.
8. Feature branches NEVER modify shared-state files. Those are updated only on develop via /sync after merging PRs. See git-conventions.md Shared-State Files for the canonical list.

## Gotchas
[Grows during development]
