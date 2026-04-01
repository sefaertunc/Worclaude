# Worclaude

> One command. Best practices baked in. Your Claude Code environment, production-ready.

[![npm version](https://img.shields.io/npm/v/worclaude.svg)](https://www.npmjs.com/package/worclaude)
[![license](https://img.shields.io/npm/l/worclaude.svg)](LICENSE)

<!-- GIF goes here once recorded -->
<!-- ![worclaude init demo](docs/public/demo.gif) -->

[Full Documentation](https://sefaertunc.github.io/Worclaude/) · [Interactive Demo](https://sefaertunc.github.io/Worclaude/demo/) · [npm](https://www.npmjs.com/package/worclaude)

Worclaude scaffolds a complete Claude Code workflow into any project in seconds. It implements all [tips by Boris Cherny](https://www.howborisusesclaudecode.com/) — the creator of Claude Code at Anthropic — as a reusable, upgradable scaffold. One `init` command gives you 25 agents, 16 slash commands, 14 skills, hooks, permissions, and a CLAUDE.md template tuned for your tech stack. Whether you're starting fresh or adding structure to an existing project, Worclaude handles the setup so you can focus on building.

---

## What You Get

`worclaude init` installs a production-ready Claude Code workflow:

**Agents (25 total)**

- 5 universal: plan-reviewer, code-simplifier, test-writer, build-validator, verify-app
- 20 optional across 6 categories: Backend, Frontend, DevOps, Quality, Documentation, Data/AI

**Slash Commands (16)**
`/start` `/end` `/commit-push-pr` `/review-plan` `/techdebt` `/verify` `/compact-safe` `/status` `/update-claude-md` `/setup` `/sync` `/conflict-resolver` `/review-changes` `/build-fix` `/refactor-clean` `/test-coverage`

**Skills (14)**

- 10 universal knowledge files (testing, git conventions, context management, security, and more)
- 3 project-specific templates filled in by `/setup`
- 1 generated agent routing guide (dynamically built from your agent selection)

**Hooks**

- SessionStart context injection (auto-loads CLAUDE.md, PROGRESS.md, and last session on launch)
- PostToolUse formatter (auto-formats on every write)
- PostCompact re-injection (re-reads key files after compaction)
- Stop notifications (desktop alert when Claude finishes)
- Hook profiles (`WORCLAUDE_HOOK_PROFILE`) — minimal, standard, or strict

**Configuration**

- Pre-configured permissions per tech stack (Node.js, Python, Go, Rust, and more)
- CLAUDE.md template with progressive disclosure
- Sandbox, effort, and output defaults ready out of the box

---

## Quick Start

```bash
npm install -g worclaude
cd your-project
worclaude init
```

Follow the interactive prompts to select your project type, tech stack, and agents. Then open Claude Code and run `/setup` to fill in your project-specific content.

For parallel tasks, run Claude with worktrees: `claude --worktree --tmux`

---

## Commands

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `worclaude init`    | Scaffold workflow into new or existing project |
| `worclaude upgrade` | Update universal components to latest version  |
| `worclaude status`  | Show current workflow state and version        |
| `worclaude backup`  | Create timestamped backup of workflow files    |
| `worclaude restore` | Restore from a previous backup                 |
| `worclaude diff`    | Compare current setup vs latest version        |
| `worclaude delete`  | Remove worclaude workflow from project         |
| `worclaude doctor`  | Validate workflow installation health          |

The `init` command detects existing setups and merges intelligently — no data is overwritten without your confirmation. Use `upgrade` to pull in new features while preserving your customizations.

See the [full command reference](https://sefaertunc.github.io/Worclaude/reference/commands) for detailed usage and options.

---

## Links

- [Full Documentation](https://sefaertunc.github.io/Worclaude/)
- [Interactive Demo](https://sefaertunc.github.io/Worclaude/demo/)
- [Contributing](CONTRIBUTING.md)
- [License: MIT](LICENSE)
