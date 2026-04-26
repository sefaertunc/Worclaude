# Slash Commands

Worclaude installs 18 slash commands as Markdown files in `.claude/commands/`. These are invoked inside a Claude Code session by typing the command name (e.g., `/start`). Each command gives Claude a specific instruction set for that task.

## Command Reference

### /start

**Load session context, check for handoff files, detect drift since last session.**

|                  |                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/start.md`                                                                                                                                                                                                                                                                                                                         |
| **When to use**  | At the start of every Claude Code session                                                                                                                                                                                                                                                                                                           |
| **What it does** | The SessionStart hook has already loaded CLAUDE.md, PROGRESS.md, and the last session summary. This command supplements that with drift detection (commits since last session), handoff file checks matching the current branch, active implementation prompts, and agent routing. Reports what was last completed, what is next, and any blockers. |
| **Key behavior** | Read-only. Does not modify files.                                                                                                                                                                                                                                                                                                                   |

---

### /end

**Mid-task stop -- writes handoff file and session summary for next session.**

|                  |                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/end.md`                                                                                                                                                                                                                                                                                                                                                         |
| **When to use**  | When stopping mid-task (unfinished work)                                                                                                                                                                                                                                                                                                                                          |
| **What it does** | Writes two artifacts with **disjoint content**: a forward-looking handoff at `docs/handoffs/HANDOFF-{branch}-{date}.md` (what's left, decisions pending, where to pick up) and a backward-looking session summary at `.claude/sessions/` (what got done, files modified, observability). Commits the WIP, then **prompts via `AskUserQuestion` for push consent** before pushing. |
| **Key behavior** | Default is **local-only** if push is declined. Does NOT update PROGRESS.md — that is handled by `/sync` on develop after merging.                                                                                                                                                                                                                                                 |

---

### /commit-push-pr

**Commit, push, and create PR -- branch-aware with session summary.**

|                  |                                                                                                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/commit-push-pr.md`                                                                                                                                                                                                                                              |
| **When to use**  | When a feature or fix is ready for review                                                                                                                                                                                                                                         |
| **What it does** | Writes a session summary to `.claude/sessions/` first. On feature branches: skips shared-state files, stages, commits, pushes, then **prompts via `AskUserQuestion` for the `Version bump:` declaration (`major`/`minor`/`patch`/`none`)** before opening a PR to develop.        |
| **Key behavior** | Refuses to open a PR without an explicit `Version bump:` declaration. Feature branches never touch shared-state files — that prevents merge conflicts during parallel work. On develop: stages, commits, pushes, PRs to main (after `/sync` has pre-written the release PR body). |

---

### /review-plan

**Send implementation plan to plan-reviewer agent for staff-level review.**

|                  |                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/review-plan.md`                                                                                                                                                |
| **When to use**  | After writing an implementation plan, before starting implementation                                                                                                             |
| **What it does** | Sends the current plan to the `plan-reviewer` agent (Opus). The reviewer checks for ambiguity, missing verification steps, unrealistic scope, edge cases, and SPEC.md alignment. |
| **Key behavior** | Blocks implementation until all feedback is addressed. The plan should be updated with revisions before proceeding.                                                              |

---

### /verify

**Run fast read-only verification — tests + lint (and optional `prettier --check`).**

|                  |                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `.claude/commands/verify.md`                                                                                                                                                                                       |
| **When to use**  | Before committing, before opening a PR, after major changes                                                                                                                                                        |
| **What it does** | Runs the test suite and the linter. Optionally runs `prettier --check` (read-only format drift). Build, type checking, and domain-specific verification are intentionally **out of scope**.                        |
| **Key behavior** | **Read-only contract — never modifies files.** No `--fix` flags, no formatter auto-fix. Blocks further work if any check fails. For build/type errors use `/build-fix`; for end-to-end use the `verify-app` agent. |

---

### /compact-safe

**Compress context via /compact with safety checks.**

|                  |                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/compact-safe.md`                                                                                                                                                                                                                                                                                                                        |
| **When to use**  | When context is running low (~70% used) and you need to keep working                                                                                                                                                                                                                                                                                      |
| **What it does** | Runs **four pre-flight safety checks** before triggering `/compact`: (1) uncommitted changes (offers commit/stash via `AskUserQuestion`), (2) in-flight work signals (failing tests, mid-implementation TODOs), (3) recent destructive operations, (4) PostCompact hook verification. After compaction, recaps current task / branch / scratch artifacts. |
| **Key behavior** | Halts if the PostCompact hook is missing — compacting without it silently strips Claude's session orientation. Each safety check that trips requires explicit user acknowledgment.                                                                                                                                                                        |

---

### /update-claude-md

**Propose updates to CLAUDE.md based on session work and recurring patterns.**

|                  |                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/update-claude-md.md`                                                                                                                                                                                                                                                                                                                  |
| **When to use**  | At session end, after encountering a repeated mistake, or to promote stable learnings from `.claude/learnings/` into CLAUDE.md                                                                                                                                                                                                                          |
| **What it does** | Surfaces promotion candidates from three sources: `.claude/learnings/` (recurring entries), this session's repeated mistakes, and confirmed discoveries. Runs **size and dedup pre-checks** (block additions past doctor's WARN/ERROR; offer in-place update for dedup hits). **Prompts via `AskUserQuestion` per proposed change** — no batched apply. |
| **Key behavior** | Refuses to apply any change without explicit per-change consent. Refuses to push past the 200-line threshold without explicit acceptance. Follows the self-healing pattern described in the [claude-md-maintenance skill](/reference/skills).                                                                                                           |

---

### /learn

**Capture a correction or convention as a persistent learning.**

|                  |                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/learn.md`                                                                                                                                                                                                                                                                                                |
| **When to use**  | When you want to persist a **team-relevant** rule, correction, or convention across future sessions. Also triggered by phrases like "remember this", "learn this", "save this rule". For personal preferences, leave to Claude Code's auto-memory instead.                                                                 |
| **What it does** | Writes a `[LEARN]` block to `.claude/learnings/{category-slug}.md` with YAML frontmatter (`created`, `category`, `project`). **Regenerates** `.claude/learnings/index.json` from the directory contents — never hand-maintained. The SessionStart hook loads recent learnings at the start of future sessions.             |
| **Key behavior** | When `correction-detect.cjs` flags a correction, Claude follows the **semi-auto path**: drafts a generalizable rule and prompts via `AskUserQuestion` (`yes` / `yes, let me edit` / `no`) before saving. The `times_applied` field was removed in Phase 2 (2026-04). Learnings are gitignored — personal to the developer. |

See [Learnings](/reference/learnings) for the full learnings system documentation.

---

### /setup

**Project setup interview -- fills in CLAUDE.md, skills, and configuration.**

|                  |                                                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/setup.md`                                                                                                                                                                                                 |
| **When to use**  | Once, after initial `worclaude init`, to configure the project                                                                                                                                                              |
| **What it does** | Runs a 7-section interview: Project Story, Architecture & Structure, Tech Stack Details, Core Features, Development Workflow, Coding Conventions, Verification Strategy. Users can type "skip" or "back" at any point.      |
| **Key behavior** | After the interview, updates 6 files with real project content: CLAUDE.md (tech stack and commands), SPEC.md (full specification), backend-conventions.md, frontend-design-system.md, project-patterns.md, and PROGRESS.md. |

**Interview sections:**

| Section                     | Topics Covered                                                                   |
| --------------------------- | -------------------------------------------------------------------------------- |
| 1. Project Story            | Purpose, users, problem it solves, existing docs or PRDs                         |
| 2. Architecture & Structure | Architecture type, directory layout, database, external services, deployment     |
| 3. Tech Stack Details       | Frameworks and versions, package manager, ORM, testing tools, linting            |
| 4. Core Features            | Main features, built vs planned, priority order, business logic, edge cases      |
| 5. Development Workflow     | Start commands, test commands, build commands, env vars, CI/CD, setup steps      |
| 6. Coding Conventions       | Design patterns, error handling, logging, API format, naming, project rules      |
| 7. Verification Strategy    | Verification approach, test commands, manual testing, browser testing, CI checks |

---

### /sync

**Update PROGRESS.md, SPEC.md, and version after merging PRs on develop.**

|                  |                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/sync.md`                                                                                                                                                                        |
| **When to use**  | On the develop branch after merging feature PRs                                                                                                                                                   |
| **What it does** | Checks for unresolved conflicts first. Updates PROGRESS.md (stats, completed items), SPEC.md (if features changed), bumps version in package.json. Runs tests/lint, commits, pushes, PRs to main. |
| **Key behavior** | Refuses to run if conflict markers are detected — tells the user to run `/conflict-resolver` first.                                                                                               |

---

### /conflict-resolver

**Resolve merge conflicts on develop branch.**

|                  |                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/conflict-resolver.md`                                                                                                                                                                                                 |
| **When to use**  | On develop after `git pull` when merge conflicts are present                                                                                                                                                                            |
| **What it does** | Detects conflicts, understands each side's intent, resolves them (keeping both sides where possible). For truly contradictory changes uses **`AskUserQuestion`** with `keep A` / `keep B` / `combine`. Then runs `/verify` and commits. |
| **Key behavior** | Single canonical test path: `/verify` (no parenthetical fallback). ONLY resolves conflicts; does not update PROGRESS.md, SPEC.md, or bump versions — that is `/sync`'s job. Does not push or create PRs.                                |

---

### /review-changes

**Code review -- reports findings as prioritized table without modifying files.**

|                  |                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/review-changes.md`                                                                                                                                |
| **When to use**  | After implementing changes, before committing                                                                                                                       |
| **What it does** | Reads recent git diff. Checks for duplication, complexity, pattern inconsistency, CLAUDE.md compliance. Reports as prioritized table with Fix/Skip recommendations. |
| **Key behavior** | Strictly read-only. Never edits, stages, or commits. For automated fixes, use `/refactor-clean` which runs a focused inline cleanup pass.                           |

---

### /build-fix

**Fix current build failures via build-fixer agent.**

|                  |                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/build-fix.md`                                                                                                                                                                                            |
| **When to use**  | Build is broken after a merge, rebase, or dependency update                                                                                                                                                                |
| **What it does** | Step 1 delegates to `/verify` (test + lint), then runs the build and type checker separately to capture compilation errors. Categorizes errors by type and fixes one category at a time, re-running checks after each fix. |
| **Key behavior** | **3-attempt escalation:** after 3 failed fixes on the same error category, delegates to the `bug-fixer` agent (worktree-isolated). The user is the last resort, not the third. Never silences tests or weakens lint rules. |

---

### /refactor-clean

**Focused cleanup pass on recently changed code.**

|                  |                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/refactor-clean.md`                                                                                                                             |
| **When to use**  | After implementing a feature, before `/verify` and `/commit-push-pr`                                                                                             |
| **What it does** | Reads uncommitted changes. Removes dead code, extracts duplicated logic, reduces complexity, and enforces naming consistency. Runs tests after every change.     |
| **Key behavior** | Runs inline (not in a worktree). Leaves changes uncommitted for `/commit-push-pr`. Reverts immediately if tests fail. Only changes with >80% confidence applied. |

---

### /test-coverage

**Analyze test coverage and fill gaps in recently changed code.**

|                  |                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/test-coverage.md`                                                                                                                            |
| **When to use**  | Before a release, after a large feature, or when coverage drops below project threshold                                                                        |
| **What it does** | Measures current coverage, identifies gaps prioritized by risk (auth > business logic > formatting), writes missing tests following existing project patterns. |
| **Key behavior** | Reports a before/after table per file. Tests behavior, not implementation. Flags bugs found during testing without fixing them in this pass.                   |

---

## Command File Location

```
.claude/commands/
  start.md
  end.md
  commit-push-pr.md
  review-plan.md
  verify.md
  compact-safe.md
  update-claude-md.md
  learn.md
  setup.md
  sync.md
  conflict-resolver.md
  review-changes.md
  build-fix.md
  refactor-clean.md
  test-coverage.md
```

Commands can be customized after installation. Additional custom commands can be added to the same directory.

---

## See Also

- [Agents](/reference/agents) -- agents invoked by commands (e.g., `/review-plan` uses `plan-reviewer`)
- [Skills](/reference/skills) -- knowledge loaded by commands (e.g., `/end` follows `review-and-handoff`)
- [Hooks](/reference/hooks) -- hooks triggered by commands (e.g., `/compact-safe` triggers PostCompact)
