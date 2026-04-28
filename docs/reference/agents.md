# Agents

Worclaude installs Claude Code agent definitions as Markdown files in `.claude/agents/`. Each agent has a specific model, isolation mode, and purpose. Universal agents are always installed. Optional agents are selected during `worclaude init` based on project type. See [Claude Code Integration](/guide/claude-code-integration) for details on how agents register with the runtime.

## Agent Properties

Every agent file includes a YAML frontmatter block. The `name` and `description` fields are **required** -- without `description`, agents are invisible to Claude Code and will not appear in `/agents` or be available for routing.

| Property          | Required | Values                                                           | Purpose                                                |
| ----------------- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `name`            | Yes      | string                                                           | Agent identifier used for routing                      |
| `description`     | Yes      | string                                                           | What the agent does -- required for visibility         |
| `model`           | Yes      | `opus`, `sonnet`, `haiku`, `inherit`                             | Which Claude model the agent uses                      |
| `isolation`       | No       | `none`, `worktree`                                               | Whether the agent works in a git worktree              |
| `disallowedTools` | No       | string[]                                                         | Tools the agent cannot use (enforced by runtime)       |
| `tools`           | No       | string[]                                                         | Tool **allowlist** -- alternative to `disallowedTools` |
| `background`      | No       | boolean                                                          | Run asynchronously without blocking the user           |
| `maxTurns`        | No       | number                                                           | Maximum conversation turns before auto-stop            |
| `omitClaudeMd`    | No       | boolean                                                          | Skip loading CLAUDE.md for this agent                  |
| `memory`          | No       | `project`                                                        | Memory scope for cross-session learning                |
| `effort`          | No       | `low`, `medium`, `high`, or integer                              | Controls token spend for the agent                     |
| `color`           | No       | string                                                           | Agent color in the UI (e.g., `orange`, `red`)          |
| `permissionMode`  | No       | `acceptEdits`, `bypassPermissions`, `default`, `dontAsk`, `plan` | Per-agent permission mode override                     |
| `mcpServers`      | No       | string[] or object[]                                             | MCP servers this agent requires                        |
| `hooks`           | No       | object                                                           | Per-agent hooks that register when the agent starts    |

::: tip tools vs disallowedTools
Use `tools` (allowlist) when you know exactly which tools an agent needs: `tools: ['Read', 'Bash', 'Glob', 'Grep']`. Use `disallowedTools` (denylist) when the agent needs most tools but should be blocked from a few: `disallowedTools: ['Edit', 'Write']`. Both are enforced by the runtime — the agent physically cannot access restricted tools.
:::

::: warning
Without a `description` field, agents are invisible to Claude Code. They will not appear in `/agents` and cannot be routed to. Run `worclaude doctor` to detect agents with missing descriptions.
:::

### Model Selection

Each agent is assigned a model based on the complexity and nature of its task:

| Model      | Token Cost | Best For                                                  | Agents Using It                                                                                                                                                                                                                        |
| ---------- | ---------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Opus**   | Highest    | Deep judgment, architectural decisions, security analysis | plan-reviewer, api-designer, auth-auditor, security-reviewer, prompt-engineer                                                                                                                                                          |
| **Sonnet** | Medium     | Implementation, code changes, testing, documentation      | code-simplifier, test-writer, verify-app, database-analyst, ui-reviewer, ci-fixer, docker-helper, deploy-validator, performance-auditor, bug-fixer, refactorer, build-fixer, doc-writer, data-pipeline-reviewer, ml-experiment-tracker |
| **Haiku**  | Lowest     | Narrow validation, formatting, simple checks              | build-validator, style-enforcer, dependency-manager, changelog-generator                                                                                                                                                               |

### Isolation Modes

| Mode         | How It Works                                                                                                                                   | When Used                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **none**     | Agent works in the current working directory alongside the user. Changes are made directly to the working tree.                                | Read-only review tasks, validation, analysis. No risk of conflicting with user changes.                                                                            |
| **worktree** | Agent creates an isolated git worktree from the current branch. All changes happen in the worktree. User reviews and merges results afterward. | Code modification tasks (writing tests, fixing bugs, refactoring). Prevents conflicts with uncommitted user work. Requires clean git state to create the worktree. |

Agents with worktree isolation: code-simplifier, test-writer, verify-app, ci-fixer, bug-fixer, refactorer, build-fixer, doc-writer.

---

## Universal Agents

These 6 agents are installed with every Worclaude project. They cover the core development workflow: planning, coding, testing, building, verifying, and tracking upstream changes.

### plan-reviewer

|                     |                                  |
| ------------------- | -------------------------------- |
| **Model**           | opus                             |
| **Isolation**       | none                             |
| **Invoked by**      | `/review-plan` slash command     |
| **disallowedTools** | Edit, Write, NotebookEdit, Agent |
| **omitClaudeMd**    | true                             |

Acts as a senior staff engineer reviewing an implementation plan. Challenges assumptions, identifies ambiguity, checks for missing verification steps, and ensures the plan is specific enough for one-shot implementation. Validates alignment with `SPEC.md`. Does not approve plans that are vague or lack verification. Read-only: cannot modify files.

### code-simplifier

|               |          |
| ------------- | -------- |
| **Model**     | sonnet   |
| **Isolation** | worktree |

Reviews recently changed code and improves it. Finds and eliminates duplication, identifies reuse opportunities with existing code, simplifies complex logic, and ensures consistency with project patterns. Makes changes directly in a worktree and runs tests after each change. Commits improvements separately from feature work.

### test-writer

|               |          |
| ------------- | -------- |
| **Model**     | sonnet   |
| **Isolation** | worktree |
| **memory**    | project  |

Writes comprehensive tests for recently changed code. Covers unit tests for individual functions, integration tests for component interactions, edge cases (null, empty, boundary values), and error paths. Follows the project's testing patterns from `.claude/skills/testing/SKILL.md`. Aims for meaningful coverage rather than 100% line coverage. Has project memory for learning test patterns across sessions.

### build-validator

|                |       |
| -------------- | ----- |
| **Model**      | haiku |
| **Isolation**  | none  |
| **background** | true  |

Validates that the project builds and passes all checks: build command, full test suite, linter, and type checker (if applicable). Reports failures with clear error messages. Does not fix issues -- reports them so the main session can address them. Runs in the background so you can continue working while it validates.

### verify-app

|                |                                      |
| -------------- | ------------------------------------ |
| **Model**      | sonnet                               |
| **Isolation**  | worktree                             |
| **Invoked by** | `/verify` slash command (indirectly) |
| **background** | true                                 |

Tests the actual running application behavior, not just unit tests. Starts the application, tests changed functionality end-to-end, verifies behavior matches the specification, checks for regressions in related features, and tests error handling and edge cases in the running app. Reports specific pass/fail for each verification step. Runs in the background.

### upstream-watcher

|                |                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model**      | sonnet                                                                                                                                                                                |
| **Isolation**  | none                                                                                                                                                                                  |
| **Invoked by** | `.github/workflows/upstream-check.yml` (scheduled cron). The in-session `/upstream-check` slash command was retired in Phase 2; the agent definition is preserved for future revival. |
| **Read-only**  | `disallowedTools: Edit, Write, NotebookEdit`                                                                                                                                          |
| **Memory**     | project                                                                                                                                                                               |

Cross-references new Anthropic upstream changes (Claude Code releases, Agent SDK changelogs, Anthropic docs, the engineering blog, the status page, and community signal — source count is dynamic; read `summary.sourcesChecked` from the feed report) against the project's scaffolded `.claude/` infrastructure. Fetches feeds via [`@sefaertunc/anthropic-watch-client`](https://www.npmjs.com/package/@sefaertunc/anthropic-watch-client) — composite-key dedup, version-gated, typed errors. Produces a three-part report: direct-impact items (which scaffolded agent, command, hook, or skill is affected and why), informational items, and concrete recommended actions. Treats `sourceCategory: community` items as informational-only per anthropic-watch's contract. Read-only by enforcement — reports findings, never edits files.

---

## Optional Agents

19 optional agents organized into 6 categories. During `worclaude init`, categories are recommended based on the selected project type.

### Backend

| Agent              | Model  | Isolation | Purpose                                                                     |
| ------------------ | ------ | --------- | --------------------------------------------------------------------------- |
| `api-designer`     | opus   | none      | Reviews API design for RESTful conventions, consistency, and completeness.  |
| `database-analyst` | sonnet | none      | Reviews database schemas, queries, migrations, and indexing strategies.     |
| `auth-auditor`     | opus   | none      | Audits authentication and authorization implementations for security flaws. |

### Frontend

| Agent            | Model  | Isolation | Purpose                                                                    |
| ---------------- | ------ | --------- | -------------------------------------------------------------------------- |
| `ui-reviewer`    | sonnet | none      | Reviews UI for visual consistency, accessibility, and responsive behavior. |
| `style-enforcer` | haiku  | none      | Ensures design system compliance across components and styles.             |

### DevOps

| Agent                | Model  | Isolation | Purpose                                                                                    |
| -------------------- | ------ | --------- | ------------------------------------------------------------------------------------------ |
| `ci-fixer`           | sonnet | worktree  | Diagnoses and fixes CI/CD pipeline failures.                                               |
| `docker-helper`      | sonnet | none      | Reviews Docker configurations for best practices and optimization.                         |
| `deploy-validator`   | sonnet | none      | Validates deployment readiness including configs, environment variables, and dependencies. |
| `dependency-manager` | haiku  | none      | Reviews dependency health, outdated packages, and security advisories.                     |

### Quality

| Agent                 | Model  | Isolation | Purpose                                                                          |
| --------------------- | ------ | --------- | -------------------------------------------------------------------------------- |
| `bug-fixer`           | sonnet | worktree  | Diagnoses root causes and implements fixes for reported bugs.                    |
| `security-reviewer`   | opus   | none      | Reviews code for security vulnerabilities, injection risks, and unsafe patterns. |
| `performance-auditor` | sonnet | none      | Analyzes code for performance bottlenecks, memory leaks, and inefficiencies.     |
| `refactorer`          | sonnet | worktree  | Refactors code to improve maintainability, readability, and structure.           |
| `build-fixer`         | sonnet | worktree  | Diagnoses and fixes build failures, test failures, lint errors, and type errors. |

### Documentation

| Agent                 | Model  | Isolation | Purpose                                                                           |
| --------------------- | ------ | --------- | --------------------------------------------------------------------------------- |
| `doc-writer`          | sonnet | worktree  | Writes and updates project documentation including READMEs, guides, and API docs. |
| `changelog-generator` | haiku  | none      | Generates changelog entries from commit history.                                  |

### Data / AI

| Agent                    | Model  | Isolation | Purpose                                                                             |
| ------------------------ | ------ | --------- | ----------------------------------------------------------------------------------- |
| `data-pipeline-reviewer` | sonnet | none      | Reviews data pipeline correctness, schema consistency, and transformation logic.    |
| `ml-experiment-tracker`  | sonnet | none      | Reviews ML experiment reproducibility, hyperparameter tracking, and result logging. |
| `prompt-engineer`        | opus   | none      | Reviews and improves LLM prompts for clarity, specificity, and effectiveness.       |

---

## Category Recommendations by Project Type

During `worclaude init`, agent categories are pre-selected based on the chosen project type. Users can override these selections.

| Project Type               | Recommended Categories                    |
| -------------------------- | ----------------------------------------- |
| Full-stack web application | Backend, Frontend, Quality, Documentation |
| Backend / API              | Backend, Quality                          |
| Frontend / UI              | Frontend, Quality                         |
| CLI tool                   | Quality, Documentation                    |
| Data / ML / AI             | Data / AI, Backend                        |
| Library / Package          | Quality, Documentation                    |
| DevOps / Infrastructure    | DevOps                                    |

### Recommended Agents per Project Type

The following table shows the specific agents recommended for each project type:

| Project Type               | Recommended Agents                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Full-stack web application | ui-reviewer, api-designer, database-analyst, security-reviewer, bug-fixer, doc-writer                        |
| Backend / API              | api-designer, database-analyst, security-reviewer, auth-auditor, bug-fixer, performance-auditor, build-fixer |
| Frontend / UI              | ui-reviewer, style-enforcer, performance-auditor, bug-fixer                                                  |
| CLI tool                   | bug-fixer, doc-writer, dependency-manager, build-fixer                                                       |
| Data / ML / AI             | data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer, database-analyst                             |
| Library / Package          | doc-writer, dependency-manager, performance-auditor, refactorer, changelog-generator                         |
| DevOps / Infrastructure    | ci-fixer, docker-helper, deploy-validator, dependency-manager                                                |

---

## Summary Table (All 25 Agents)

| Agent                  | Category      | Model  | Isolation | Description                                                         |
| ---------------------- | ------------- | ------ | --------- | ------------------------------------------------------------------- |
| plan-reviewer          | Universal     | opus   | none      | Reviews implementation plans as a staff engineer                    |
| code-simplifier        | Universal     | sonnet | worktree  | Eliminates duplication, simplifies logic                            |
| test-writer            | Universal     | sonnet | worktree  | Writes comprehensive tests for changed code                         |
| build-validator        | Universal     | haiku  | none      | Validates build, tests, lint without fixing                         |
| verify-app             | Universal     | sonnet | worktree  | End-to-end application testing                                      |
| upstream-watcher       | Universal     | sonnet | none      | Cross-references upstream changes against scaffolded infrastructure |
| api-designer           | Backend       | opus   | none      | Reviews API design for RESTful conventions                          |
| database-analyst       | Backend       | sonnet | none      | Reviews database schemas and queries                                |
| auth-auditor           | Backend       | opus   | none      | Audits authentication and authorization                             |
| ui-reviewer            | Frontend      | sonnet | none      | Reviews UI for consistency and accessibility                        |
| style-enforcer         | Frontend      | haiku  | none      | Ensures design system compliance                                    |
| ci-fixer               | DevOps        | sonnet | worktree  | Diagnoses and fixes CI/CD failures                                  |
| docker-helper          | DevOps        | sonnet | none      | Reviews Docker configs for best practices                           |
| deploy-validator       | DevOps        | sonnet | none      | Validates deployment readiness                                      |
| dependency-manager     | DevOps        | haiku  | none      | Reviews dependency health and updates                               |
| bug-fixer              | Quality       | sonnet | worktree  | Diagnoses and fixes bugs                                            |
| security-reviewer      | Quality       | opus   | none      | Reviews code for security vulnerabilities                           |
| performance-auditor    | Quality       | sonnet | none      | Analyzes code for performance issues                                |
| refactorer             | Quality       | sonnet | worktree  | Refactors code to improve maintainability                           |
| build-fixer            | Quality       | sonnet | worktree  | Diagnoses and fixes build failures                                  |
| doc-writer             | Documentation | sonnet | worktree  | Writes and updates documentation                                    |
| changelog-generator    | Documentation | haiku  | none      | Generates changelog from commits                                    |
| data-pipeline-reviewer | Data / AI     | sonnet | none      | Reviews data pipeline correctness                                   |
| ml-experiment-tracker  | Data / AI     | sonnet | none      | Reviews ML experiment reproducibility                               |
| prompt-engineer        | Data / AI     | opus   | none      | Reviews and improves LLM prompts                                    |

### Runtime Properties

The following table shows which agents have special runtime properties beyond the standard model/isolation fields:

| Agent                  | Read-Only | Background | Memory  | omitClaudeMd |
| ---------------------- | --------- | ---------- | ------- | ------------ |
| plan-reviewer          | Yes       |            |         | Yes          |
| test-writer            |           |            | project |              |
| build-validator        |           | Yes        |         |              |
| verify-app             |           | Yes        |         |              |
| upstream-watcher       | Yes       |            | project |              |
| api-designer           | Yes       |            |         |              |
| database-analyst       | Yes       |            |         |              |
| ui-reviewer            | Yes       |            |         |              |
| security-reviewer      |           |            | project | Yes          |
| performance-auditor    |           |            |         | Yes          |
| dependency-manager     | Yes       |            |         |              |
| deploy-validator       | Yes       |            |         |              |
| doc-writer             |           |            | project |              |
| changelog-generator    | Yes       |            |         | Yes          |
| data-pipeline-reviewer | Yes       |            |         |              |
| ml-experiment-tracker  | Yes       |            |         |              |

**Read-Only** = has `disallowedTools` preventing file modifications. **Background** = runs asynchronously via `background: true`. **Memory** = has cross-session learning via `memory` field. **omitClaudeMd** = does not load CLAUDE.md (narrower focus).

Agents not listed have no special runtime properties beyond model and isolation.

---

## Agent File Location

All agent files are installed to `.claude/agents/` as flat Markdown files:

```
.claude/agents/
  plan-reviewer.md          # universal
  code-simplifier.md        # universal
  test-writer.md            # universal
  build-validator.md        # universal
  verify-app.md             # universal
  upstream-watcher.md       # universal
  api-designer.md           # optional (if selected)
  bug-fixer.md              # optional (if selected)
  ...
```

Agent files can be customized after installation. The `worclaude diff` command tracks modifications, and `worclaude upgrade` preserves customizations by saving new versions under `.claude/workflow-ref/agents/<name>.md` — the live agent at `.claude/agents/<name>.md` is never overwritten, and the reference copy is kept out of Claude Code's agent-discovery path so it cannot register as a phantom agent.

---

## See Also

- [Claude Code Integration](/guide/claude-code-integration) -- how agents register with Claude Code's runtime
- [Slash Commands](/reference/slash-commands) -- commands that invoke agents (e.g., `/review-plan`)
- [Skills](/reference/skills) -- knowledge files that complement agent behavior
- [CLAUDE.md Template](/reference/claude-md) -- how agents integrate with the session protocol
