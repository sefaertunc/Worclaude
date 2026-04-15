# Claude Code Integration

Worclaude v2.0.0 generates files that integrate directly with Claude Code's runtime systems. This page explains how skills, agents, and memory work at the runtime level -- and how to customize them.

## How Claude Code Loads Skills

Claude Code loads skills from `.claude/skills/` as **directories**, not flat files. Each skill must follow this structure:

```
.claude/skills/
  skill-name/
    SKILL.md          ← Claude Code reads this file
```

A flat file like `.claude/skills/testing.md` is **silently ignored** by Claude Code. Only the `skill-name/SKILL.md` directory format is recognized.

### Skill Frontmatter

Each `SKILL.md` file starts with YAML frontmatter. Claude Code's runtime parses 16 fields:

```yaml
---
description: 'One-line summary of what this skill teaches'
when_to_use: 'When this skill is relevant'
paths:
  - 'src/**'
  - 'lib/**'
version: '2.2.6'
---
```

| Field                      | Required | Applies To | Purpose                                                            |
| -------------------------- | -------- | ---------- | ------------------------------------------------------------------ |
| `description`              | Yes      | Both       | Short summary shown in `/skills` listing                           |
| `when_to_use`              | Yes      | Both       | Tells Claude when to load this skill                               |
| `paths`                    | No       | Both       | Glob patterns for conditional activation                           |
| `version`                  | No       | Both       | Version tracking for upgrades                                      |
| `name`                     | No       | Both       | Display name (defaults to directory name)                          |
| `allowed-tools`            | No       | Both       | Restrict which tools the skill can use when invoked                |
| `arguments`                | No       | Both       | Named arguments as array or space-separated string                 |
| `argument-hint`            | No       | Both       | Usage hint displayed for arguments                                 |
| `model`                    | No       | Both       | Model override (`haiku`, `sonnet`, `opus`, `inherit`)              |
| `context`                  | No       | Skills     | Execution context: `inline` (default) or `fork` (run as sub-agent) |
| `agent`                    | No       | Skills     | Route to a specific agent type when `context: fork`                |
| `effort`                   | No       | Both       | Effort level (`low`, `medium`, `high`, or integer)                 |
| `shell`                    | No       | Both       | Shell override (`bash`, `zsh`, `sh`, `pwsh`)                       |
| `user-invocable`           | No       | Both       | Whether users can type `/skill-name` directly (default: true)      |
| `disable-model-invocation` | No       | Both       | Prevent Claude from auto-invoking this skill                       |
| `hooks`                    | No       | Both       | Per-skill hook registration (activates when skill is invoked)      |

"Both" means the field applies to both skills (`.claude/skills/`) and legacy commands (`.claude/commands/`).

After the frontmatter, the rest of the file is markdown content that Claude reads when the skill is loaded.

## How Claude Code Loads Agents

Claude Code loads agents from `.claude/agents/` as markdown files:

```
.claude/agents/
  plan-reviewer.md
  test-writer.md
  build-validator.md
  ...
```

### Agent Frontmatter

Each agent file starts with YAML frontmatter containing configuration that Claude Code uses to control agent behavior:

```yaml
---
name: plan-reviewer
description: 'Reviews implementation plans for specificity, gaps, and executability'
model: opus
isolation: none
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
maxTurns: 30
omitClaudeMd: true
---
```

| Field             | Required | Values                                                           | Purpose                                               |
| ----------------- | -------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| `name`            | Yes      | string                                                           | Agent identifier used for routing                     |
| `description`     | Yes      | string                                                           | What the agent does -- **required for visibility**    |
| `model`           | Yes      | `opus`, `sonnet`, `haiku`, `inherit`                             | Which Claude model powers the agent                   |
| `isolation`       | No       | `none`, `worktree`                                               | Git isolation mode                                    |
| `disallowedTools` | No       | string[]                                                         | Tools the agent cannot use                            |
| `tools`           | No       | string[]                                                         | Tool **allowlist** (alternative to `disallowedTools`) |
| `background`      | No       | boolean                                                          | Run without blocking the user                         |
| `maxTurns`        | No       | number                                                           | Maximum conversation turns                            |
| `omitClaudeMd`    | No       | boolean                                                          | Skip loading CLAUDE.md for this agent                 |
| `memory`          | No       | `project`                                                        | Memory scope for cross-session learning               |
| `effort`          | No       | `low`, `medium`, `high`, or integer                              | Controls token spend for the agent                    |
| `color`           | No       | string                                                           | Agent color in the UI (e.g., `orange`, `red`)         |
| `permissionMode`  | No       | `acceptEdits`, `bypassPermissions`, `default`, `dontAsk`, `plan` | Per-agent permission override                         |
| `mcpServers`      | No       | string[] or object[]                                             | MCP servers this agent needs                          |
| `hooks`           | No       | object                                                           | Per-agent hooks that register when the agent starts   |

::: tip tools vs disallowedTools
For read-only agents, a `tools` allowlist is often cleaner than `disallowedTools`. Instead of listing every tool to deny, specify only what the agent needs: `tools: ['Read', 'Bash', 'Glob', 'Grep']`. Claude Code's own built-in agents use both patterns.
:::

**Critical:** Without a `description` field, agents are invisible to Claude Code. They will not appear in `/agents` and cannot be routed to. This is the most common issue when agents appear to be missing.

## Conditional Skill Activation

The `paths` frontmatter field makes skills context-aware. When Claude is working on files that match the glob patterns, the skill is automatically loaded. Skills without `paths` are always available.

This matters for **context budget**. Every loaded skill consumes context window space. Conditional activation ensures Claude only carries knowledge that is relevant to the current task -- security knowledge when touching auth code, testing knowledge when working on tests, frontend conventions when editing components.

### Conditional Skills

| Skill                    | Path Patterns                                                                                                    | Loads When                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `verification`           | `test/**`, `tests/**`, `**/*.test.*`, `**/*.spec.*`                                                              | Working on test files           |
| `testing`                | `test/**`, `tests/**`, `**/*.test.*`, `**/*.spec.*`, `__tests__/**`                                              | Working on test files           |
| `security-checklist`     | `**/auth/**`, `**/security/**`, `**/*config*`, `**/*.env*`, `**/middleware/**`                                   | Working on auth/security/config |
| `backend-conventions`    | `src/**`, `lib/**`, `server/**`, `api/**`                                                                        | Working on backend code         |
| `frontend-design-system` | `src/components/**`, `src/pages/**`, `src/views/**`, `**/*.vue`, `**/*.tsx`, `**/*.jsx`, `**/*.css`, `**/*.scss` | Working on UI components        |
| `project-patterns`       | `src/**`, `lib/**`                                                                                               | Working on source code          |

### Always-Loaded Skills

These skills have no `paths` field and are available in every context:

- `context-management` -- Context budget awareness and compaction decisions
- `git-conventions` -- Branch naming, commit format, PR workflow
- `planning-with-files` -- Structuring implementation plans as files
- `review-and-handoff` -- Session ending protocol and handoff documents
- `prompt-engineering` -- Effective prompting patterns
- `claude-md-maintenance` -- How and when to update CLAUDE.md
- `coding-principles` -- Core behavioral principles: when to ask, when to push back, when to simplify
- `subagent-usage` -- When and how to spawn subagents
- `coordinator-mode` -- Multi-agent orchestration patterns
- `agent-routing` -- Dynamic routing guide built from your agent selections

### Making Your Own Skills Conditional

Add a `paths` field to any custom skill's frontmatter:

```yaml
---
description: 'GraphQL schema conventions'
when_to_use: 'When working on GraphQL schemas or resolvers'
paths:
  - '**/*.graphql'
  - '**/resolvers/**'
  - '**/schema/**'
---
```

Use gitignore-style glob patterns. Multiple patterns are OR-matched -- the skill loads if any pattern matches the current file context.

## Agent Tool Restrictions

The `disallowedTools` field prevents agents from using specific tools at the system level. This is stronger than prompt instructions -- an agent with `disallowedTools: [Edit, Write]` physically cannot modify files, regardless of what its prompt says.

This matters because prompt-level instructions ("do not edit files") can be overridden by sufficiently complex conversations or ambiguous requests. Tool restrictions enforce the constraint architecturally.

### Read-Only Agents

These agents have `disallowedTools` that prevent file modifications. They analyze and report, but never change code:

| Agent                    | Disallowed Tools                 | Purpose                                  |
| ------------------------ | -------------------------------- | ---------------------------------------- |
| `plan-reviewer`          | Edit, Write, NotebookEdit, Agent | Reviews plans without modifying them     |
| `api-designer`           | Edit, NotebookEdit, Agent        | Reviews API design without changing code |
| `database-analyst`       | Edit, Write, NotebookEdit, Agent | Analyzes schemas without modifying them  |
| `ui-reviewer`            | Edit, Write, NotebookEdit, Agent | Reviews UI without making changes        |
| `performance-auditor`    | Edit, Write, NotebookEdit, Agent | Audits performance without fixing        |
| `security-reviewer`      | Edit, Write, NotebookEdit, Agent | Reviews security without modifying code  |
| `dependency-manager`     | Edit, Write, NotebookEdit, Agent | Reviews dependencies without updating    |
| `deploy-validator`       | Edit, Write, NotebookEdit, Agent | Validates deployment readiness           |
| `changelog-generator`    | Edit, NotebookEdit, Agent        | Generates changelog entries              |
| `data-pipeline-reviewer` | Edit, Write, NotebookEdit, Agent | Reviews pipelines without modifying      |
| `ml-experiment-tracker`  | Edit, Write, NotebookEdit, Agent | Reviews experiments without changing     |

## Background Agents

The `background: true` field enables agents to run asynchronously. When you invoke a background agent, Claude continues working while the agent runs its checks in parallel.

| Agent             | Model  | What It Does in Background                                   |
| ----------------- | ------ | ------------------------------------------------------------ |
| `build-validator` | Haiku  | Runs build, tests, and linter. Reports pass/fail.            |
| `verify-app`      | Sonnet | Tests the running application end-to-end.                    |
| `e2e-runner`      | Sonnet | Writes and runs end-to-end tests for critical user journeys. |

Background agents are ideal for validation tasks that do not need user oversight. They run, collect results, and report back when finished.

## Memory System

Claude Code has a built-in memory system that persists across sessions. It is enabled by default and requires no scaffolding -- Worclaude does not create or manage memory files.

**Where memory lives:** `~/.claude/projects/<project>/memory/` -- outside your repository, per-user, never committed to git.

**How it works:** Claude Code automatically injects memory instructions into the system prompt and loads `MEMORY.md` (the index file in the memory directory) into context at session start. A background agent can also extract memories from your conversation automatically.

**Four memory types:** user (your role and preferences), feedback (how you want Claude to work), project (ongoing work context), reference (pointers to external systems).

### Per-Agent Memory

Agents with `memory: project` in their frontmatter load project-scoped memory. This enables cross-session learning -- for example, `test-writer` remembers your project's testing patterns across sessions.

Agents with project memory:

- `test-writer` -- Learns your test patterns and conventions
- `security-reviewer` -- Remembers your project's security context
- `doc-writer` -- Learns your documentation style

### Memory vs Plans vs Tasks

Memory is for information useful across conversations. Don't use it for:

- **Plans** -- use a plan file or plan mode for implementation strategies within a session
- **Tasks** -- use the task system for tracking work steps within a session
- **Session state** -- current conversation context belongs in the conversation, not memory

## CLAUDE.md @include Directive

CLAUDE.md and all other memory files support `@include` directives for splitting large content across files. This works in CLAUDE.md, `.claude/CLAUDE.md`, `.claude/rules/*.md`, and `CLAUDE.local.md`.

```markdown
# CLAUDE.md

## Key Files

@./docs/spec/PROGRESS.md
@./docs/conventions.md
```

Syntax:

- `@path` or `@./relative` -- relative to the file containing the directive
- `@~/path` -- relative to home directory
- `@/absolute/path` -- absolute path

Rules:

- Works in leaf text nodes only (not inside code blocks)
- Circular references are prevented automatically
- Non-existent files are silently ignored
- Each included file consumes context budget -- use judiciously

This is the recommended way to keep CLAUDE.md lean while still loading relevant context. See the [claude-md-maintenance](/reference/skills#claude-md-maintenance) skill for guidelines on CLAUDE.md size.

## CLAUDE.md Loading Hierarchy

Claude Code loads instruction files from multiple locations in priority order (later = higher priority):

1. **Managed** -- `/etc/claude-code/CLAUDE.md` (enterprise policy)
2. **User** -- `~/.claude/CLAUDE.md` (personal defaults)
3. **Project** -- `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md` (per-project, at each directory level up to home)
4. **Local** -- `CLAUDE.local.md` (gitignored, personal overrides)

Files closer to the current working directory have higher priority. The total budget for all loaded instruction files is approximately 40,000 characters.

## AGENTS.md (Cross-Tool Compatibility)

Worclaude scaffolds an `AGENTS.md` file at the project root alongside `CLAUDE.md`. It mirrors the same instructions in the conventions that other AI coding tools expect. This lets you switch between Claude Code, Cursor, Codex, GitHub Copilot, and others without maintaining parallel rule files.

| Tool           | File it reads                 |
| -------------- | ----------------------------- |
| Claude Code    | `CLAUDE.md`                   |
| Cursor         | `AGENTS.md` or `.cursorrules` |
| OpenAI Codex   | `AGENTS.md`                   |
| GitHub Copilot | `AGENTS.md`                   |

`worclaude init` writes both files from the same source template, so they start in sync. `worclaude upgrade` and `/sync` regenerate `AGENTS.md` whenever `CLAUDE.md` changes. If you edit either file by hand, the other is not auto-updated — keep them in sync manually or re-run `worclaude upgrade`.

`worclaude doctor` checks that `AGENTS.md` exists and flags drift between the two files.

## Learnings System

Worclaude's learnings system complements Claude Code's native memory system. The two have complementary strengths:

| Store               | Location                               | Scope                        | Loaded when                                          |
| ------------------- | -------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| Claude Code memory  | `~/.claude/projects/<project>/memory/` | Cross-session, cross-machine | On demand, via agent frontmatter `memory: project`   |
| Worclaude learnings | `.claude/learnings/` (gitignored)      | Per-developer, per-project   | Every session (SessionStart hook reads `index.json`) |

Learnings are captured by two hooks: `correction-detect.cjs` (UserPromptSubmit — detects correction signals in your prompts) and `learn-capture.cjs` (Stop — extracts `[LEARN]` blocks from the transcript). The `/learn` slash command is the explicit capture path. See [Learnings reference](/reference/learnings) for the full flow, file format, and why they are gitignored.

## Verifying Integration

After running `worclaude init` or `worclaude upgrade`, verify that everything registered correctly:

### Check Skills

Run `/skills` in Claude Code. You should see all installed skills with their descriptions. Conditional skills appear only when working on matching files.

### Check Agents

Run `/agents` in Claude Code. All agents should be listed with their descriptions. If an agent is missing, check that its file has both `name` and `description` in the frontmatter.

### Run Health Checks

```bash
worclaude doctor
```

Doctor validates:

- **Skill format** -- Detects flat `.md` files that should be in directory format
- **Agent description** -- Verifies all agents have `name` and `description` frontmatter
- **CLAUDE.md size** -- Warns if CLAUDE.md is too large for effective context use

See the [Commands reference](/reference/commands#worclaude-doctor) for the full list of health checks.
