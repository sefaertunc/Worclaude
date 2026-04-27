# CLAUDE.md

{project_name} — {description}

## Key Files
- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth

## Tech Stack
{tech_stack_filled_during_init}

## Commands

<!-- references package.json (or equivalent for non-Node stacks) -->
The verification commands below are filled during init from the project's
package manager scripts. Reference them by script name; do not restate the
underlying tool invocations.

{commands_filled_during_init}

## Skills (read on demand, not upfront)
See `.claude/skills/` — load only what's relevant:
- context-management/SKILL.md — Session lifecycle
- claude-md-maintenance/SKILL.md — CLAUDE.md self-healing
- coding-principles/SKILL.md — Behavioral principles: assumptions, simplicity, surgical changes, verification
- git-conventions/SKILL.md — Commits, branches, versioning
- planning-with-files/SKILL.md — Implementation planning
- prompt-engineering/SKILL.md — Prompting patterns and quality
- review-and-handoff/SKILL.md — Session endings
- verification/SKILL.md — How to verify work
- testing/SKILL.md — Test philosophy and patterns
- subagent-usage/SKILL.md — When and how to use subagents
- security-checklist/SKILL.md — Security review checklist
- coordinator-mode/SKILL.md — Multi-agent orchestration
- agent-routing/SKILL.md — When and how to use each installed agent (READ EVERY SESSION)
{project_specific_skills}

## Session Protocol
**Start:** Read PROGRESS.md → Read `.claude/skills/agent-routing/SKILL.md` → Read active implementation prompt if any.
**During:** One task at a time. Commit after each. Use subagents per routing guide.
**Feature branch:** /start → work → /verify → /commit-push-pr
**After merging PRs:** git checkout develop → git pull → /conflict-resolver (if needed) → /sync
**Mid-task stop:** /end (writes handoff file)
**Trigger discipline:** /commit-push-pr and /sync execute only when the human types them. They do not run autonomously after work "feels done."

## Critical Rules
1. SPEC.md is source of truth. Do not invent features.
2. Test before moving on.
3. Ask if ambiguous. Do not guess.
4. Read source files before writing. Never assume.
5. Self-healing: same mistake twice → update CLAUDE.md.
6. Use subagents to keep main context clean.
7. Mediocre fix → scrap it, implement elegantly.
8. Feature branches NEVER modify shared-state files. Those are updated only on develop via /sync after merging PRs. See git-conventions.md Shared-State Files for the canonical list.
9. Never add Co-Authored-By trailers, AI attribution footers, or "Generated with" signatures to commits or PRs.
10. Surgical changes only — every changed line must trace to the request. Don't "improve" adjacent code, comments, or formatting.
11. Push back when simpler approaches exist. Present alternatives, don't pick silently.
12. Transform tasks to success criteria. "Fix the bug" → "Write a failing test, then make it pass."
13. Commit, push, and PR only when the human explicitly invokes /commit-push-pr or /sync. Never run git commit, git push, or gh pr create on your own initiative, never invoke those slash commands without an explicit human trigger, and never auto-answer the Version bump: question — refuse to proceed without a human-selected option.

## Memory Architecture

- This file: static project rules. Keep under 200 lines.
- Native memory (`/memory`): auto-captured project knowledge.
- Persistent corrections: `.claude/learnings/` via [LEARN] blocks or `/learn`.
- Path-scoped rules: `.claude/rules/` with YAML frontmatter.
- Session state: `.claude/sessions/` (gitignored).{memory_architecture_extras}
- Do NOT write session learnings or auto-captured patterns here.
- If your repository has the Claude Code GitHub Action installed (run `/install-github-action`), `@claude` mentions in PR comments will automatically propose CLAUDE.md updates.

## Learnings

Corrections captured via [LEARN] blocks live in `.claude/learnings/`. SessionStart loads recent ones automatically.

## Gotchas
[Grows during development]
