# Introduction

## The Problem

Claude Code is incredibly powerful, but getting the most out of it requires a lot of up-front configuration. You need agents for different review tasks, skills that teach Claude your project's conventions, slash commands for session management, hooks for auto-formatting, and a carefully structured `CLAUDE.md` that keeps Claude focused without overwhelming its context.

Most people skip all of this. They open Claude Code, type a prompt, and get decent results. But "decent" leaves a lot on the table. Boris Cherny, the creator of Claude Code at Anthropic, published [a collection of tips](https://www.howborisusesclaudecode.com) for using Claude Code professionally. Those tips cover everything from session lifecycle to subagent orchestration to context management. Implementing them all by hand takes hours of careful setup work.

## The Solution

Worclaude automates that setup. Run one command, answer a few questions about your project, and you get a complete professional workflow installed in your repository. Every file it generates is derived from Boris Cherny's tips.

Worclaude is a Node.js CLI tool that you install globally and run in any project directory. It examines your project, asks what kind of software you are building, and scaffolds the right combination of agents, skills, commands, hooks, and permissions. As of v2.0.0, all generated files integrate directly with Claude Code's runtime systems -- skills support conditional activation via file path patterns, and agents support tool restrictions, background execution, and persistent memory.

## What You Get

When you run `worclaude init`, the following components are installed into your project:

### Agents (25 total)

Agents are specialized Claude instances, each with a specific model and purpose. You always get the 6 **universal agents**:

- **plan-reviewer** (Opus) -- Reviews implementation plans like a staff engineer. Challenges assumptions and finds gaps.
- **code-simplifier** (Sonnet, worktree) -- Eliminates duplication, simplifies complex logic, enforces consistency.
- **test-writer** (Sonnet, worktree) -- Writes comprehensive tests: unit, integration, edge cases, error paths.
- **build-validator** (Haiku) -- Runs the build, tests, and linter. Reports failures without fixing them.
- **verify-app** (Sonnet, worktree) -- Tests the running application end-to-end against the specification.
- **upstream-watcher** (Sonnet) -- Cross-references new Anthropic upstream changes (Claude Code releases, SDK changelogs, docs, blog) against your scaffolded agents, commands, hooks, and skills. Reserved for the scheduled `.github/workflows/upstream-check.yml` workflow; the in-session `/upstream-check` slash command was retired in Phase 2.

On top of these, you choose from 19 **optional agents** across 6 categories (Backend, Frontend, DevOps, Quality, Documentation, Data/AI). Worclaude recommends agents based on your project type, so you do not have to guess.

### Skills (17 total)

Skills are knowledge files that Claude loads on demand, stored in directory format (`skill-name/SKILL.md`). They teach Claude how your project works without bloating the main context. You get 13 **universal skills** covering context management, git conventions, planning, session handoffs, prompt engineering, verification, testing, CLAUDE.md maintenance, coding principles, subagent usage, security, coordinator mode, and the five-layer memory architecture (added in Phase 4). You also get 3 **template skills** (backend-conventions, frontend-design-system, project-patterns) that serve as placeholders for your project-specific details. Finally, you get 1 **generated skill** — `agent-routing` — a dynamic routing guide that tells Claude exactly when and how to use each installed agent, built from your specific agent selections.

Some skills are **conditional** — they load automatically only when working on files matching specific path patterns (e.g., testing skills load only when touching test files). See [Claude Code Integration](/guide/claude-code-integration) for details.

### Slash Commands (16 total)

Commands give you a session lifecycle. `/start` reads your progress file, detects drift since the last session, and orients Claude. `/end` writes a handoff document for mid-task stops. `/commit-push-pr` stages, commits, pushes, prompts for the `Version bump:` declaration, and opens a pull request. `/verify` runs the read-only test + lint pipeline. `/setup` interviews you about your project and fills in all the template files automatically. `/learn` persists a correction or convention into `.claude/learnings/` so it replays at the start of future sessions. `/observability` aggregates per-project signals (skill loads, command invocations, agent timings) into a Markdown report. The full set: `/start`, `/end`, `/commit-push-pr`, `/review-plan`, `/verify`, `/compact-safe`, `/update-claude-md`, `/learn`, `/setup`, `/sync`, `/conflict-resolver`, `/review-changes`, `/build-fix`, `/refactor-clean`, `/test-coverage`, `/observability`.

### Hooks (11 events, 7 hook scripts, 14 entries)

Worclaude scaffolds hooks across 11 Claude Code lifecycle events:

- **SessionStart** -- Auto-loads CLAUDE.md, PROGRESS.md, last session summary, branch name, and recent learnings from `.claude/learnings/index.json`.
- **PostToolUse (Write/Edit)** -- Auto-formats code after every file change, using the right formatter for your tech stack. The strict profile adds an additional TypeScript check entry.
- **PostCompact** -- Re-reads `CLAUDE.md` and `PROGRESS.md` after context compaction, so Claude never loses orientation.
- **PreCompact** -- Emergency git context snapshot before auto-compaction (`pre-compact-save.cjs`), so nothing is lost if compaction truncates state.
- **UserPromptSubmit** -- Three handlers run in sequence: `correction-detect.cjs` flags learnable moments, `skill-hint.cjs` suggests relevant skills based on token overlap, `obs-command-invocations.cjs` records `/`-prefixed prompts for observability.
- **Stop** -- `learn-capture.cjs` scans the session transcript for `[LEARN]` blocks and persists them to `.claude/learnings/`.
- **InstructionsLoaded** -- `obs-skill-loads.cjs` records each skill load to `.claude/observability/skill-loads.jsonl` (Phase 6a).
- **SubagentStart / SubagentStop** -- `obs-agent-events.cjs` records start + stop events to `.claude/observability/agent-events.jsonl`; the aggregator pairs them on session+agent for duration metrics.
- **SessionEnd** -- Runs on session close. Sends an OS notification by default.
- **Notification** -- Desktop alerts for tool-use decisions and long-running tasks.

Hook profiles (`WORCLAUDE_HOOK_PROFILE`) let you control strictness: `minimal` (session-context hooks only — observability and notifications are disabled), `standard` (all hooks, the default), or `strict` (all hooks plus TypeScript checking on every edit). See the [Hooks reference](/reference/hooks) for the full event-to-script mapping.

### Observability (Phase 6a)

A privacy-first per-project signal layer captures skill loads, command invocations, and agent timings to `.claude/observability/*.jsonl` (gitignored). The `worclaude observability` CLI and `/observability` slash command aggregate the signals into a Markdown report — top skills, top commands, agent failure rates, and anomalies. Zero data leaves the machine. Opt out via `WORCLAUDE_HOOK_PROFILE=minimal` or by deleting the folder.

### GitHub Action Integration (Phase 7)

When `worclaude init` finishes it offers to surface Claude Code's `/install-github-action` flow. If installed, `@claude` mentions in PR comments will automatically propose CLAUDE.md updates, slotting cleanly into the `/sync`-driven release flow. Worclaude itself never shells out to the install command — it just points you at it. See the [Claude Code Integration guide](/guide/claude-code-integration#github-action-integration-claude-pattern) for details.

### Learnings System

A personal, gitignored store at `.claude/learnings/` captures corrections and rules Claude picks up during a session and replays them at the start of future sessions. The UserPromptSubmit hook detects correction signals, the Stop hook extracts `[LEARN]` blocks from the transcript, and the SessionStart hook reloads the most recent entries. Unlike CLAUDE.md (shared across contributors), learnings are yours — useful for personal conventions that need not leak into the repo. See [Learnings reference](/reference/learnings) for the full flow.

### Cross-Tool Compatibility

`AGENTS.md` is scaffolded at the project root as a single source of truth for Claude Code, Cursor, Codex, and other AI coding tools. It mirrors the instructions in CLAUDE.md in the conventions those tools expect, so switching between them does not require maintaining parallel rule files.

### Doctor

`worclaude doctor` runs a four-category health check: core files (workflow-meta.json, CLAUDE.md, settings.json), components (agents, commands, skills, agent-routing), documentation (PROGRESS.md, SPEC.md), and integrity (file hashes vs. workflow-meta, hook event validity, deprecated models, CLAUDE.md line budget, learnings index validity, gitignore coverage). Each check reports PASS/WARN/FAIL with actionable diagnostics.

### Permissions and Sandbox

A comprehensive `settings.json` with pre-approved permissions for common development tools (git, build tools, formatters, file operations) so Claude does not constantly ask for permission. Claude Code's permission model is three-tier — `allow`, `ask`, and `deny` — and users can add `ask` or `deny` rules for sensitive commands on top of worclaude's default `allow` list. Sandbox mode is enabled with auto-allow for structural safety.

### CLAUDE.md

A lean, structured `CLAUDE.md` (target ≤200 lines, matching Claude Code's official guidance) that follows the progressive disclosure pattern. It points to skills for detail instead of trying to contain everything. Includes sections for Key Files, Tech Stack, Commands, Skills, Session Protocol, Memory Architecture, Critical Rules, and Gotchas. The `worclaude doctor` line-budget check warns at 30K characters and fails at 38K (hard limit 40K).

## For Experienced Claude Code Users

If you already know Boris Cherny's tips or have read [howborisusesclaudecode.com](https://www.howborisusesclaudecode.com), Worclaude codifies those patterns into installable files. You can think of it as a starter kit that gives you a solid baseline. After installation, you customize everything to fit your specific project.

The agents follow Anthropic's recommended model assignments. Skills follow Thariq's skill authoring standards (skip the obvious, build gotchas sections, use progressive disclosure). Commands implement the session lifecycle pattern that Boris describes.

## What Worclaude Is NOT

Worclaude is a **scaffolding tool**. It is not a replacement for Claude Code itself. It does not run Claude, manage sessions, or interact with the AI in any way. What it does is set up the configuration files that make Claude Code work at its best.

After Worclaude finishes, you still need to:

1. Launch Claude Code yourself (`claude --worktree --tmux`)
2. Run `/setup` to fill in project-specific details through a guided interview
3. Write your `SPEC.md` with your project's requirements
4. Do the actual development work with Claude

Worclaude handles the boilerplate so you can focus on building.

## Next Steps

- [Getting Started](/guide/getting-started) -- Full walkthrough of installing and running Worclaude
- [Existing Projects](/guide/existing-projects) -- How Worclaude handles projects that already have Claude Code configured
- [Upgrading](/guide/upgrading) -- Keeping your workflow up to date
- [Workflow Tips](/guide/workflow-tips) -- Best practices for working with Claude Code after setup
