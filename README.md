# claude-workflow

A CLI tool that scaffolds a comprehensive Claude Code workflow into any project — derived from 53 tips by Boris Cherny, the creator of Claude Code at Anthropic.

[![npm version](https://img.shields.io/npm/v/claude-workflow.svg)](https://www.npmjs.com/package/claude-workflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Quick Start

```bash
npm install -g claude-workflow
cd your-project
claude-workflow init
```

That's it. The `init` command walks you through project setup interactively.

## What It Does

Claude Code is powerful out of the box, but it gets dramatically better with structured guidance. `claude-workflow` installs a complete workflow system — agents, slash commands, skills, hooks, and configuration — that turns Claude Code into a disciplined engineering partner. It's the difference between a capable assistant and a well-organized team.

The workflow is based on [53 tips by Boris Cherny](https://www.howborisusesclaudecode.com/), the creator of Claude Code at Anthropic, distilled into a reusable scaffold that works with any tech stack.

## What Gets Installed

```
your-project/
├── CLAUDE.md                        # Project-specific guidance for Claude
├── .claude/
│   ├── settings.json                # Permissions, hooks, sandbox config
│   ├── workflow-meta.json           # Version tracking and file hashes
│   ├── agents/
│   │   ├── universal/               # 5 always-installed agents
│   │   └── optional/                # Selected agents by category
│   ├── commands/                    # 10 slash commands
│   └── skills/
│       ├── universal/               # 9 knowledge files
│       └── templates/               # 3 project-specific placeholders
├── .mcp.json                        # MCP server configuration
└── docs/spec/
    ├── PROGRESS.md                  # Session-to-session tracking
    └── SPEC.md                      # Project specification template
```

- **CLAUDE.md** — Lean (<50 lines) project config that Claude reads every session. Points to skills for deeper guidance.
- **Agents** — Autonomous specialist workers that run in isolation (worktrees) for focused tasks.
- **Commands** — Slash commands (`/start`, `/end`, `/verify`, etc.) for common workflows.
- **Skills** — Knowledge files Claude loads on demand — testing philosophy, git conventions, context management, and more.
- **Settings** — Permissions, hooks, and sandbox configuration tuned for your tech stack.

## Commands

| Command | Purpose |
|---|---|
| `claude-workflow init` | Set up workflow in a new or existing project |
| `claude-workflow upgrade` | Update workflow to latest version |
| `claude-workflow status` | Show current installation status |
| `claude-workflow backup` | Create a backup of Claude setup |
| `claude-workflow restore` | Restore from a backup |
| `claude-workflow diff` | Compare current setup vs installed version |

## Three Scenarios

`init` detects your project state and adapts:

### 1. Fresh project — full interactive scaffold

No existing `.claude/` directory or `CLAUDE.md`. You get the full setup flow: choose project type, tech stack, languages, and optional agents. Everything is scaffolded from scratch.

### 2. Existing project — smart merge

You already have a `CLAUDE.md` or `.claude/` directory. The tool creates a timestamped backup, then merges intelligently:

- **Missing files** (agents, commands, skills) are added directly
- **Conflicting files** are saved as `.workflow-ref.md` alongside yours
- **CLAUDE.md** is analyzed for missing sections — merge interactively or save suggestions to a separate file
- **Hooks and permissions** offer keep/replace/chain options for conflicts

### 3. Upgrade — update to latest version

You already have `workflow-meta.json` from a previous install. The tool compares file hashes to detect what changed, auto-updates unmodified files, and prompts for files you've customized.

## Agents

### Universal Agents (always installed)

| Agent | Purpose |
|---|---|
| plan-reviewer | Reviews plans for ambiguity, missing verification, and scope |
| code-simplifier | Finds duplication, simplifies complexity, ensures consistency |
| test-writer | Writes comprehensive unit, integration, and edge case tests |
| build-validator | Validates build, tests, linting, and type checking |
| verify-app | Tests actual running application behavior end-to-end |

### Optional Agent Catalog

During `init`, you choose from 18 optional agents across 6 categories. The tool pre-selects categories based on your project type:

| Project Type | Recommended Categories |
|---|---|
| Full-stack web | Frontend, Backend, Quality, Documentation |
| Backend / API | Backend, Quality |
| Frontend / UI | Frontend, Quality |
| CLI tool | Quality, Documentation |
| Data / ML / AI | Data/AI, Backend |
| Library / Package | Documentation, Quality |
| DevOps / Infrastructure | DevOps |

**Available categories:**

| Category | Agents |
|---|---|
| Frontend | ui-reviewer, style-enforcer |
| Backend | api-designer, database-analyst, auth-auditor |
| DevOps | dependency-manager, ci-fixer, docker-helper, deploy-validator |
| Quality | bug-fixer, security-reviewer, performance-auditor, refactorer |
| Documentation | doc-writer, changelog-generator |
| Data / AI | data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer |

After selecting categories, you can fine-tune by adding or removing individual agents.

## Slash Commands

All 10 commands are installed in every project:

| Command | Purpose |
|---|---|
| `/start` | Read PROGRESS.md, report current state and what's next |
| `/end` | Update PROGRESS.md with session work, blockers, next steps |
| `/commit-push-pr` | Stage, commit, push, and create PR with description |
| `/review-plan` | Send implementation plan to plan-reviewer agent |
| `/techdebt` | Scan for duplicated code, dead code, TODOs, complexity |
| `/verify` | Run full verification: tests, build, lint, type checks |
| `/compact-safe` | Compress context; PostCompact hook re-reads key files |
| `/status` | Report current task, branch, test status, context usage |
| `/update-claude-md` | Propose CLAUDE.md updates based on session learnings |
| `/setup` | **Post-install interview** — fills in all project-specific content |

`/setup` is the key post-install action. After running `claude-workflow init`, open Claude Code and run `/setup`. It interviews you about your project and fills in CLAUDE.md, skills, SPEC.md, and configuration files with real content.

## Skills

Skills are knowledge files that Claude loads on demand. They keep CLAUDE.md lean while providing deep guidance when needed.

### Universal Skills (9)

| Skill | What it teaches |
|---|---|
| context-management | Context budget, compaction timing, subagent offloading |
| git-conventions | Branch naming, commits, PR workflow, worktrees |
| planning-with-files | Implementation plan structure and review process |
| review-and-handoff | Session endings, handoff format, progress tracking |
| prompt-engineering | Effective prompting patterns for Claude |
| verification | Domain-specific verification beyond running tests |
| testing | Test philosophy, coverage strategy, test structure |
| claude-md-maintenance | Writing and maintaining rules in CLAUDE.md |
| subagent-usage | When and how to delegate work to subagents |

### Template Skills (3)

These are project-specific placeholders filled in by `/setup`:

- **backend-conventions** — Stack-specific backend patterns and conventions
- **frontend-design-system** — Design system, components, styling approach
- **project-patterns** — Architectural patterns specific to your codebase

## The Pipeline

The workflow follows a 6-stage pipeline for every significant task:

```
Design → Review → Execute → Quality → Verify → PR
```

1. **Design** — Write an implementation plan in a plan file
2. **Review** — Send plan to `plan-reviewer` agent for critical review
3. **Execute** — Implement the plan, one step at a time
4. **Quality** — Run `code-simplifier`, `test-writer` agents
5. **Verify** — Run `build-validator`, `verify-app` agents, then `/verify`
6. **PR** — Use `/commit-push-pr` to stage, commit, push, and create a pull request

## Configuration

### Permissions

Settings include allow-lists for common tools, tuned per tech stack:

```json
{
  "permissions": {
    "allow": [
      "Read(*)", "Glob(*)", "Grep(*)",
      "Bash(git *)", "Bash(npm test)", "Bash(npx prettier *)"
    ]
  }
}
```

### Hooks

Three universal hooks are installed:

1. **Format on write** — Auto-formats files after every Write/Edit (prettier, ruff, cargo fmt, gofmt — based on your stack)
2. **Notification on stop** — Desktop notification when Claude finishes a long task (Linux, macOS, Windows)
3. **PostCompact re-inject** — Automatically re-reads CLAUDE.md and PROGRESS.md after context compaction

### Sandbox

Default: `auto-allow` mode. Safety comes from structural isolation (worktrees, focused agents) rather than restrictive permissions.

### Effort & Output

- **Effort:** `high` by default, escalate to `max` per session for complex tasks
- **Output:** `concise` by default, switch to `explanatory` when exploring unfamiliar territory

## After Install — `/setup`

After running `claude-workflow init`, start Claude Code in your project and run:

```
/setup
```

This launches an interactive interview that:
- Asks about your project's purpose, architecture, and conventions
- Fills in CLAUDE.md with real project context
- Populates SPEC.md with your actual tech stack and requirements
- Configures template skills with your specific patterns
- Sets up PROGRESS.md with your current state

This is the single most important step after installation. The scaffold provides structure; `/setup` fills it with your project's substance.

## Customization

### Adding custom agents

Create a `.md` file in `.claude/agents/` with a task description and instructions. Agents run autonomously — give them clear scope, success criteria, and verification steps.

### Adding custom commands

Create a `.md` file in `.claude/commands/`. Commands are invoked as `/command-name` in Claude Code. Keep them focused on a single workflow.

### Adding custom skills

Create a `.md` file in `.claude/skills/`. Skills are loaded on demand when Claude needs domain knowledge. Reference them from CLAUDE.md with `See .claude/skills/your-skill.md`.

### Settings

`settings.json` controls permissions, hooks, and sandbox. Edit directly or use `claude-workflow upgrade` to merge in new defaults while preserving your customizations.

### CLAUDE.md

CLAUDE.md grows naturally during development. Use `/update-claude-md` to propose additions based on patterns and gotchas discovered during sessions. Keep it under 50 lines — move detailed guidance to skills.

## Philosophy

Six principles guide the workflow design:

1. **Be a dispatcher, not an operator** — Use agents for focused tasks. The main session coordinates; specialists execute.
2. **Compounding improvement** — CLAUDE.md, skills, and PROGRESS.md accumulate project knowledge over time. Every session makes the next one better.
3. **Verification multiplies quality** — Tests alone aren't enough. Verify the running application, review plans before executing, validate builds after changes.
4. **Reduce friction, maintain safety** — Auto-allow sandbox, permissive tool access, auto-formatting. Safety comes from structure (worktrees, focused agents), not restrictions.
5. **Progressive disclosure** — CLAUDE.md is lean. Skills load on demand. Agents activate when needed. Complexity is available but not imposed.
6. **Plan before you build** — Write implementation plans in files. Review them with `plan-reviewer`. Execute step by step. This prevents wasted work and catches issues early.

## Why?

Boris Cherny published [53 tips for using Claude Code effectively](https://www.howborisusesclaudecode.com/). They cover everything from CLAUDE.md structure to agent design to session management. The tips are excellent — but implementing them manually in every project is tedious and error-prone.

`claude-workflow` packages all 53 tips into a single `init` command. You get the full workflow in seconds, customized for your tech stack, with upgrade support to pick up improvements over time.

## Credits

This project is derived from the [53 tips by Boris Cherny](https://www.howborisusesclaudecode.com/), the creator of Claude Code at Anthropic. The tips were analyzed, systematized, and packaged into a reusable CLI tool.

## License

MIT
