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

Each `SKILL.md` file starts with YAML frontmatter:

```yaml
---
description: 'One-line summary of what this skill teaches'
when_to_use: 'When this skill is relevant'
paths:
  - 'src/**'
  - 'lib/**'
---
```

| Field         | Required | Purpose                                  |
| ------------- | -------- | ---------------------------------------- |
| `description` | Yes      | Short summary shown in `/skills` listing |
| `when_to_use` | Yes      | Tells Claude when to load this skill     |
| `paths`       | No       | Glob patterns for conditional activation |

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

| Field             | Required | Values                    | Purpose                                            |
| ----------------- | -------- | ------------------------- | -------------------------------------------------- |
| `name`            | Yes      | string                    | Agent identifier used for routing                  |
| `description`     | Yes      | string                    | What the agent does -- **required for visibility** |
| `model`           | Yes      | `opus`, `sonnet`, `haiku` | Which Claude model powers the agent                |
| `isolation`       | No       | `none`, `worktree`        | Git isolation mode                                 |
| `disallowedTools` | No       | string[]                  | Tools the agent cannot use                         |
| `background`      | No       | boolean                   | Run without blocking the user                      |
| `maxTurns`        | No       | number                    | Maximum conversation turns                         |
| `omitClaudeMd`    | No       | boolean                   | Skip loading CLAUDE.md for this agent              |
| `memory`          | No       | `project`                 | Memory scope for cross-session learning            |

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
| `security-reviewer`      | _none (read-only by prompt)_     | Reviews security via prompt instruction  |
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

MEMORY.md is an optional file at your project root that provides persistent memory across Claude Code sessions. It serves as an **index** -- each entry is a one-line pointer to a detailed memory file.

### Four Memory Types

| Type        | What It Stores                    | Example                                            |
| ----------- | --------------------------------- | -------------------------------------------------- |
| `user`      | Your role, preferences, expertise | "Senior backend engineer, prefers Go over Python"  |
| `feedback`  | How you want Claude to work       | "Never mock the database in integration tests"     |
| `project`   | Ongoing work context, decisions   | "Auth rewrite driven by compliance, not tech debt" |
| `reference` | Pointers to external systems      | "Pipeline bugs tracked in Linear project INGEST"   |

### Per-Agent Memory

Agents with `memory: project` in their frontmatter load project-scoped memory. This enables cross-session learning -- for example, `test-writer` remembers your project's testing patterns across sessions.

Agents with project memory:

- `test-writer` -- Learns your test patterns and conventions
- `security-reviewer` -- Remembers your project's security context
- `doc-writer` -- Learns your documentation style

### Limits

- MEMORY.md: 200 lines maximum, 25KB size limit
- Each entry: one line, under 150 characters
- Individual memory files: stored in `.claude/memory/` directory

### What NOT to Store

- Code patterns or architecture (derive from the code itself)
- Git history or who-changed-what (use `git log`)
- Debugging solutions (the fix is in the code)
- Anything already in CLAUDE.md
- Ephemeral task details

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
