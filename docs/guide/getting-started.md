# Getting Started

This guide walks you through installing Worclaude and scaffolding a complete Claude Code workflow into a project from scratch.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20 or later** -- Worclaude is a Node.js CLI tool. Check your version with `node --version`.
- **Claude Code installed** -- Worclaude generates configuration files for Claude Code. You will need Claude Code to actually use the workflow. See [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code) for installation.

## Installation

Install Worclaude globally from npm:

```bash
npm install -g worclaude
```

Verify it installed correctly:

```bash
worclaude --version
```

You should see output like:

```
2.2.6
```

## Creating Your Project

Navigate to an existing project directory, or create a new one:

```bash
mkdir my-project
cd my-project
git init
```

Worclaude works with any project -- it does not require a specific language, framework, or structure. It works equally well in a brand new empty directory or in an existing codebase.

## Running `worclaude init`

Start the interactive setup:

```bash
worclaude init
```

You will see the Worclaude header and the first prompt:

```
  Worclaude v2.2.6
  ─────────────────────

? Project name: my-project
? One-line description: A web app for managing tasks
```

The project name defaults to the current directory name. The description is used in generated files like `CLAUDE.md` and `SPEC.md`.

## Step 1: Project Type

Next, you select what kind of project you are building. This is a multi-select prompt -- use **Space** to toggle options and **Enter** to confirm:

```
? What type of project is this? (space to toggle, enter to confirm)
  ◻ Full-stack web application — Frontend + backend in one repo
  ◻ Backend / API              — Server, REST/GraphQL, no frontend
  ◻ Frontend / UI              — Client-side app, no backend
  ◻ CLI tool                   — Command-line application
  ◻ Data / ML / AI             — Data pipelines, ML models, LLM apps
  ◻ Library / Package          — Reusable module published to npm/PyPI
  ◻ DevOps / Infrastructure    — Infrastructure, CI/CD, deployment

  ℹ Not sure? Pick what's closest. You can add or remove
    agents later with `worclaude upgrade`.
```

You can select multiple types. If you pick "Full-stack web application" along with "Backend / API" or "Frontend / UI", Worclaude will warn you about the overlap since full-stack already includes both.

Your project type selection determines which agent categories are pre-selected in the next step. For example, selecting "Backend / API" pre-selects the Backend and Quality agent categories.

## Step 2: Tech Stack

Select your primary languages and runtimes. Again, this is a multi-select:

```
? Primary language(s) / runtime: (space to toggle, enter to confirm)
  ◻ Python
  ◻ Node.js / TypeScript
  ◻ Java
  ◻ C# / .NET
  ◻ C / C++
  ◻ Go
  ◻ PHP
  ◻ Ruby
  ◻ Kotlin
  ◻ Swift
  ◻ Rust
  ◻ Dart / Flutter
  ◻ Scala
  ◻ Elixir
  ◻ Zig
  ◻ Other / None
```

After selecting languages, you will be asked about Docker:

```
? Do you use Docker in this project currently? (y/N)
```

Your tech stack selection determines:

- **Permissions** in `settings.json` (e.g., Python projects get `Bash(pip:*)` and `Bash(python:*)`)
- **Formatter hooks** (e.g., Python uses `ruff format .`, Node.js uses `npx prettier --write .`)
- **Commands block** in `CLAUDE.md` (test, lint, and format commands for your stack)

When you select multiple languages, all permissions are merged and formatters are chained together.

## Step 3: Agent Selection

This is a two-step process. First, you select agent **categories**. The categories are pre-selected based on your project type:

```
✓ Universal agents (always installed):
  ✓ plan-reviewer
  ✓ code-simplifier
  ✓ test-writer
  ✓ build-validator
  ✓ verify-app

? Which agent categories do you need? (space to toggle)
  ◼ Backend         — api-designer, database-analyst, auth-auditor
  ◻ Frontend        — ui-reviewer, style-enforcer
  ◻ DevOps          — ci-fixer, docker-helper, deploy-validator, dependency-manager
  ◼ Quality         — bug-fixer, security-reviewer, performance-auditor, refactorer, build-fixer
  ◻ Documentation   — doc-writer, changelog-generator
  ◻ Data / AI       — data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer
```

The 6 universal agents are always installed. Then, for each category you selected, you can fine-tune which specific agents to include:

```
? Fine-tune Backend agents? (space to toggle, enter to accept defaults)
  ◼ api-designer       — Reviews API design for RESTful conventions
  ◼ database-analyst    — Reviews database schemas and queries
  ◼ auth-auditor        — Audits authentication and authorization
```

Press **Enter** to accept all the defaults, or toggle individual agents off if you do not need them.

## Step 4: Confirmation

Before anything is written to disk, Worclaude shows a review summary:

```
  ─── Review Your Selections ───

  Project:    my-project — A web app for managing tasks
  Type:       Backend / API
  Stack:      Python, Docker
  Agents:     6 universal + 6 optional (12 total)

? Everything look right?
  ◉ Yes, install the workflow
  ○ No, let me start over
  ○ Let me adjust a specific step
```

If you choose "Let me adjust a specific step", you can go back and change just one part (project info, project type, tech stack, or agents) without redoing everything.

## Step 5: Scaffolding

Once you confirm, Worclaude creates all the files:

```
  Creating workflow structure...

  ✓ CLAUDE.md
  ✓ AGENTS.md
  ✓ .claude/settings.json
  ✓ .claude/workflow-meta.json
  ✓ .claude/agents/ (6 universal + 6 optional)
  ✓ .claude/commands/ (16)
  ✓ .claude/skills/ (13 universal + 3 templates + 1 generated)
  ✓ .claude/hooks/ (7 lifecycle scripts: 4 core + 3 observability)
  ✓ .claude/observability/ (gitignored signal capture)
  ✓ .claude/learnings/ (gitignored store for personal rules)
  ✓ .mcp.json
  ✓ docs/spec/PROGRESS.md
  ✓ docs/spec/SPEC.md

  Workflow installed successfully!

  What to do next:

  1. Start a Claude Code session in this project
  2. Run /setup — Claude will interview you about your project
     and fill in all configuration files automatically
  3. Review CLAUDE.md and adjust if needed
  4. Start building!

  Tip: The /setup command is the fastest way to configure
  your project. It takes about 5 minutes.
```

If `docs/spec/PROGRESS.md` or `docs/spec/SPEC.md` already exist in your project, Worclaude skips them rather than overwriting your content.

### GitHub Action prompt (Phase 7)

Toward the end of the interview, Worclaude offers to surface Claude Code's `/install-github-action` flow:

```
? Install Claude Code's GitHub Action for the @claude
  "compounding engineering" workflow?
  ❯ Yes — show me the install instructions now
    No — I'll do it later
```

Picking **Yes** prints the next step (run `/install-github-action` inside Claude Code). Worclaude itself never shells out to the install command — it only points you at it. The action enables the `@claude` pattern from Boris Cherny's "compounding engineering" recipe: mention `@claude` in PR comments and the action automatically proposes CLAUDE.md updates. See [Claude Code Integration → GitHub Action](/guide/claude-code-integration#github-action-integration-claude-pattern).

## Understanding the Output

Here is what was created:

| File / Directory             | Purpose                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                  | Main instruction file for Claude Code. Under 200 lines, with progressive disclosure via skills.                                             |
| `AGENTS.md`                  | Cross-tool compatibility file — mirrors CLAUDE.md for Cursor, Codex, Copilot, and other AI coding tools.                                    |
| `.claude/settings.json`      | Permissions, hooks (auto-format, context injection, learning capture, notification), and sandbox configuration.                             |
| `.claude/workflow-meta.json` | Internal metadata: version, selected options, file hashes for upgrade detection.                                                            |
| `.claude/agents/`            | Agent definition files. Each agent specifies a model (Opus/Sonnet/Haiku) and isolation mode.                                                |
| `.claude/commands/`          | Slash command files. Used as `/start`, `/end`, `/verify`, `/learn`, etc. inside Claude Code.                                                |
| `.claude/skills/`            | Knowledge files Claude loads on demand. Universal skills plus templates for your project.                                                   |
| `.claude/hooks/`             | Node.js scripts fired on Claude Code lifecycle events (PreCompact, UserPromptSubmit, Stop).                                                 |
| `.claude/learnings/`         | Personal, gitignored store for corrections and rules captured mid-session. Replayed at SessionStart. See [Learnings](/reference/learnings). |
| `.mcp.json`                  | MCP (Model Context Protocol) server configuration.                                                                                          |
| `docs/spec/PROGRESS.md`      | Session progress tracking. Claude reads this at the start of every session.                                                                 |
| `docs/spec/SPEC.md`          | Project specification template. Your source of truth for features and requirements.                                                         |

## Launching Claude Code

With the workflow installed, start Claude Code:

```bash
claude --worktree --tmux
```

The flags are recommended by Boris Cherny's workflow:

- `--worktree` enables git worktree isolation, so agents like code-simplifier and test-writer can work in parallel without conflicts.
- `--tmux` runs Claude in a tmux session, so you can detach and reattach without losing your session.

## Running `/setup`

The first thing you should do in your new Claude Code session is run the `/setup` command:

```
> /setup
```

This starts a conversational interview where Claude asks you about your project across 7 sections: Project Story, Architecture, Tech Stack Details, Core Features, Development Workflow, Coding Conventions, and Verification Strategy.

Based on your answers, `/setup` automatically fills in:

- `CLAUDE.md` with your real tech stack, commands, and project description
- `SPEC.md` with your features and requirements
- `backend-conventions.md` with your backend patterns
- `frontend-design-system.md` with your design system details
- `project-patterns.md` with your architectural patterns
- `PROGRESS.md` with your current state

The whole process takes about 5 minutes and replaces all the placeholder content with real, project-specific configuration.

## Verifying Everything Works

After `/setup` completes, verify the workflow is functioning:

1. Run `/skills` in Claude Code to verify skills are loaded with descriptions
2. Run `/agents` in Claude Code to verify agents are visible and routable
3. Run `/status` to see your current session state
4. Run `/verify` to confirm your build and tests pass
5. Check that `CLAUDE.md` contains your actual project details
6. Check that auto-formatting works by making a small edit
7. Run `worclaude doctor` to validate skill format, agent descriptions, and file integrity

If everything looks good, you are ready to start building. See the [Workflow Tips](/guide/workflow-tips) guide for best practices, or [Claude Code Integration](/guide/claude-code-integration) for details on how skills and agents register with the runtime.

## Next Steps

- [Existing Projects](/guide/existing-projects) -- If you already have Claude Code configured, read this instead
- [Upgrading](/guide/upgrading) -- How to update when new Worclaude versions are released
- [Workflow Tips](/guide/workflow-tips) -- Best practices for getting the most out of your workflow
