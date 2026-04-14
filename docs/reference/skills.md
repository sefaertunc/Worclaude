# Skills

Skills are knowledge files installed to `.claude/skills/` using the **directory format** required by Claude Code. Each skill lives in its own directory as `skill-name/SKILL.md`. Flat `.md` files in the skills directory are silently ignored by Claude Code's runtime.

Unlike CLAUDE.md (which is always loaded), skills are loaded on demand -- Claude reads them only when the task at hand requires that knowledge. Some skills are **conditional**: they load automatically only when working on files matching specific path patterns. See [Claude Code Integration](/guide/claude-code-integration) for the full 16-field frontmatter reference.

## Skill File Format

Each `SKILL.md` starts with YAML frontmatter. The 3 most important fields for worclaude skills:

| Field         | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `description` | Short summary shown in `/skills` listing (required) |
| `when_to_use` | Tells Claude when to load this skill (required)     |
| `paths`       | Glob patterns for conditional activation            |

Additional runtime fields (`allowed-tools`, `model`, `context`, `agent`, `effort`, `shell`, `arguments`, `argument-hint`, `user-invocable`, `disable-model-invocation`, `hooks`, `version`, `name`) are documented in the [Claude Code Integration guide](/guide/claude-code-integration#skill-frontmatter).

## Universal Skills

12 skills installed with every project. These cover workflow mechanics that apply regardless of tech stack. Additionally, 1 generated skill (`agent-routing`) is dynamically built from your agent selections during init.

### context-management

|                 |                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/context-management/SKILL.md`                                              |
| **Description** | Context budget awareness, when to compact, when to clear, subagent offloading             |
| **When loaded** | Mid-session when context is growing large; before deciding to compact or spawn a subagent |

Teaches the 70% rule (act before running out of context), the three tools for managing context (/compact, /clear, subagents), and a decision matrix for choosing between them. Explains how the PostCompact hook automatically re-reads CLAUDE.md and PROGRESS.md.

### git-conventions

|                 |                                                                         |
| --------------- | ----------------------------------------------------------------------- |
| **File**        | `.claude/skills/git-conventions/SKILL.md`                               |
| **Description** | Branch naming, commit message format, PR workflow, worktree conventions |
| **When loaded** | Before creating branches, writing commits, or opening PRs               |

Covers branch naming patterns (`type/short-description`), conventional commit format (`type(scope): description`), when to commit, the PR workflow with `gh`, squash vs merge policy, and worktree conventions for agents. Includes rules on commit message quality.

### planning-with-files

|                 |                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/planning-with-files/SKILL.md`                                                   |
| **Description** | How to structure implementation plans as files, progressive implementation, plan review process |
| **When loaded** | Before starting multi-file changes or new features                                              |

Defines the IMPLEMENTATION-PROMPT pattern for writing plans as versioned Markdown files. Covers how to break tasks into independently testable phases, signs a phase is too big or too small, the plan-review workflow with the plan-reviewer agent, progressive implementation (one phase at a time), and when to plan vs just do it.

### review-and-handoff

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/review-and-handoff/SKILL.md`                                             |
| **Description** | Session ending protocol, HANDOFF document format, seamless continuation between sessions |
| **When loaded** | At session end or when ending mid-task. Triggered by the `/end` command.                 |

Defines the session ending protocol (commit, test, update PROGRESS.md, write handoff if mid-task). Specifies the PROGRESS.md update format and the HANDOFF document structure for mid-task endings. Includes the "fresh session test" for handoff quality: could a fresh session continue without asking questions?

### prompt-engineering

|                 |                                                                                        |
| --------------- | -------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/prompt-engineering/SKILL.md`                                           |
| **Description** | Effective prompting patterns for working with Claude, demanding quality, writing specs |
| **When loaded** | When crafting instructions for subagents or writing spec documents                     |

Covers how to demand quality and elegance from Claude, when to be specific vs delegate, writing detailed specs, using the IMPLEMENTATION-PROMPT as a prompt, and model-level guidance (Opus for judgment, Sonnet for implementation, Haiku for validation). Lists prompting anti-patterns to avoid.

### verification

|                 |                                                                                    |
| --------------- | ---------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/verification/SKILL.md`                                             |
| **Description** | Domain-specific verification beyond tests, closing the feedback loop               |
| **When loaded** | After implementing changes, before committing. Triggered by the `/verify` command. |

Covers verification strategies for web applications (dev server, manual testing), APIs (beyond happy path), CLIs (edge case arguments, exit codes), and data pipelines (schema checks, record counts). Defines the feedback loop pattern (change, verify, commit) and the full build verification suite.

### testing

|                 |                                                                                       |
| --------------- | ------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/testing/SKILL.md`                                                     |
| **Description** | Test philosophy, coverage strategy, test-first patterns, what to test and what not to |
| **When loaded** | When writing or reviewing tests. Used by the `test-writer` agent.                     |

Teaches test philosophy (behavior not implementation), meaningful coverage vs line coverage, edge cases worth testing, the test-first workflow, Arrange-Act-Assert structure, test naming as specifications, and testing anti-patterns (snapshot abuse, mock everything, testing the framework).

### claude-md-maintenance

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **File**        | `.claude/skills/claude-md-maintenance/SKILL.md`                               |
| **Description** | How Claude writes rules for itself, when to update CLAUDE.md, keeping it lean |
| **When loaded** | When updating CLAUDE.md. Triggered by the `/update-claude-md` command.        |

Explains the self-healing pattern (same mistake twice becomes a rule), the 50-line target for CLAUDE.md, what belongs in CLAUDE.md vs skills, Gotchas section format and maintenance, and when to prune. Distinguishes between CLAUDE.md (always loaded, instructions) and skills (loaded on demand, knowledge).

### coding-principles

|                 |                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/coding-principles/SKILL.md`                                                                    |
| **Description** | Core behavioral principles: when to ask, when to push back, when to simplify, how to make surgical changes     |
| **When loaded** | Always relevant. Load when starting substantive coding tasks, reviewing code, or when output feels off-target. |

Reference card consolidating four Karpathy-derived principles: (1) Think Before Coding — state assumptions, present multiple interpretations, push back when warranted; (2) Simplicity First — minimum code, no speculative abstractions, no error handling for impossible cases; (3) Surgical Changes — touch only what traces to the request, never mix cleanup with feature work; (4) Goal-Driven Execution — define success criteria up front, close the feedback loop before committing. Depth and examples live in linked skills; this file consolidates the rules.

### subagent-usage

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **File**        | `.claude/skills/subagent-usage/SKILL.md`                                      |
| **Description** | When to use subagents, how many, context hygiene, worktree isolation patterns |
| **When loaded** | Before spawning subagents for testing, code review, or parallel work          |

Covers when subagents help vs when they do not, context hygiene (offloading to keep the main session clean), parallel vs sequential subagents (limit to 2-3 parallel), worktree isolation mechanics, and how to give subagents good instructions. Emphasizes that subagents start with zero context and need explicit instructions.

### security-checklist

|                 |                                                                                       |
| --------------- | ------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/security-checklist/SKILL.md`                                          |
| **Description** | OWASP-based security checklist any agent can reference when reviewing or writing code |
| **When loaded** | When writing code that handles user input, authentication, or external data           |

A reference checklist (not an agent) covering the OWASP Top 10. Includes a quick 5-point scan for pre-commit checks (no hardcoded secrets, input validated, queries parameterized, output escaped, auth checked) and detailed guidance for each OWASP category. Also lists common false positives to avoid unnecessary flags. Any agent — code-simplifier, test-writer, verify-app, or the main session — can consult this checklist.

### coordinator-mode

|                 |                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/coordinator-mode/SKILL.md`                                                           |
| **Description** | Multi-agent orchestration patterns: when to use coordinator mode, worker prompts, parallel execution |
| **When loaded** | When working with multiple agents or terminals in parallel, or breaking large tasks into sub-tasks   |

Covers when to use multi-agent coordination (independent research + implementation, parallel file areas, verification alongside implementation), worker prompt best practices, the continue vs spawn decision framework, and parallel execution patterns. Explains how to structure coordinator prompts that break tasks into independently verifiable units.

---

## Generated Skill

1 skill dynamically generated during `worclaude init` based on the user's agent selections.

### agent-routing

|                 |                                                                                         |
| --------------- | --------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/agent-routing/SKILL.md`                                                 |
| **Description** | When and how to use each installed agent — decision matrix, triggers, and routing rules |
| **When loaded** | At the start of every session (referenced in Session Protocol)                          |

Dynamically generated based on which agents the user selects during `worclaude init`. Contains: a "How Agents Work" overview, automatic trigger agents (spawned without asking), manual trigger agents (spawned on request), a decision matrix mapping situations to agents, and general routing rules. Only includes agents that were actually installed — no noise from unused agents.

Unlike universal and template skills, this file is not copied from a template. It is programmatically assembled by `src/generators/agent-routing.js` using metadata from `src/data/agent-registry.js`.

---

## Template Skills

3 skills scaffolded with placeholder content during `worclaude init`. These contain HTML comments as prompts explaining what to fill in for each section. The `/setup` command interviews the user and populates them automatically.

### backend-conventions

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/backend-conventions/SKILL.md`                                            |
| **Description** | Stack-specific backend patterns, API design, database access, error handling conventions |

Placeholder sections: API Patterns, Database Access, Error Handling, Authentication, Logging, Configuration Management. Each section includes HTML comment prompts asking specific questions (e.g., "Which ORM/query builder/driver is used?", "What HTTP status codes map to which error types?").

### frontend-design-system

|                 |                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/frontend-design-system/SKILL.md`                                                  |
| **Description** | Design system, component library, styling approach, accessibility and responsive design standards |

Placeholder sections: Component Library, Styling Approach, State Management, Accessibility Standards, Responsive Design. Prompts cover topics like component naming, CSS methodology, state management solution, WCAG level, and breakpoint strategy.

### project-patterns

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| **File**        | `.claude/skills/project-patterns/SKILL.md`                                               |
| **Description** | Architectural patterns, naming conventions, file organization, error handling philosophy |

Placeholder sections: Architecture Overview, Naming Conventions, File Organization, Common Patterns, Error Handling Philosophy. Prompts cover high-level architecture, directory structure philosophy, design patterns in use, and error classification approach.

### Template Skill Lifecycle

1. `worclaude init` creates the files with placeholder sections containing HTML comment prompts.
2. User runs `/setup` in a Claude Code session.
3. Claude conducts a 7-section interview about the project.
4. Claude fills each template skill with real, project-specific content based on interview answers.
5. Skills are now loaded on demand for all future sessions.

Template skills can also be filled manually by editing the Markdown files directly and replacing the HTML comment placeholders with actual conventions. Sections that do not apply to the project can be deleted.

---

## Adding Custom Skills

Custom skills use the same directory format: create a `skill-name/SKILL.md` directory inside `.claude/skills/`. Include `description` and `when_to_use` frontmatter. Optionally add `paths` for conditional activation. Custom skills are not tracked by `worclaude diff` or `worclaude upgrade` -- they are fully user-managed.

```
.claude/skills/
  my-custom-skill/
    SKILL.md              ← your custom skill
```

::: warning
Flat `.md` files in `.claude/skills/` are silently ignored by Claude Code. Always use the `skill-name/SKILL.md` directory format.
:::

---

## Skill File Format

Every `SKILL.md` file uses YAML frontmatter followed by Markdown content:

```markdown
---
description: 'Brief description of what this skill teaches'
when_to_use: 'When this skill is relevant to the current task'
paths:
  - 'src/**'
  - 'lib/**'
---

# Skill Name

Content organized by topic with headers, lists, code examples,
tables, and a Gotchas section at the end.
```

| Field         | Required | Purpose                                                                                                 |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `description` | Yes      | Short summary shown in `/skills` listing                                                                |
| `when_to_use` | Yes      | Tells Claude when to load this skill                                                                    |
| `paths`       | No       | Glob patterns for [conditional activation](/guide/claude-code-integration#conditional-skill-activation) |

The `description` and `when_to_use` fields appear in Claude's skill listing, helping it decide which skill to load. The `paths` field, when present, restricts the skill to load only when working on matching files.

---

## Skill File Location

```
.claude/skills/
  context-management/SKILL.md       # universal (always loaded)
  git-conventions/SKILL.md          # universal (always loaded)
  planning-with-files/SKILL.md      # universal (always loaded)
  review-and-handoff/SKILL.md       # universal (always loaded)
  prompt-engineering/SKILL.md       # universal (always loaded)
  verification/SKILL.md             # universal (conditional: test/**)
  testing/SKILL.md                  # universal (conditional: test/**)
  claude-md-maintenance/SKILL.md    # universal (always loaded)
  coding-principles/SKILL.md        # universal (always loaded)
  subagent-usage/SKILL.md           # universal (always loaded)
  security-checklist/SKILL.md       # universal (conditional: auth/security/**)
  coordinator-mode/SKILL.md         # universal (always loaded)
  agent-routing/SKILL.md            # generated (dynamic, based on agent selection)
  backend-conventions/SKILL.md      # template (conditional: src/**)
  frontend-design-system/SKILL.md   # template (conditional: components/**)
  project-patterns/SKILL.md         # template (conditional: src/**)
```

Skills can be customized after installation. Additional custom skills can be added as new directories. The `worclaude diff` command tracks modifications to installed skills.

---

## Conditional vs Always-Loaded

| Skill                  | Loading     | Path Patterns                                                                                                    |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| context-management     | Always      | —                                                                                                                |
| git-conventions        | Always      | —                                                                                                                |
| planning-with-files    | Always      | —                                                                                                                |
| review-and-handoff     | Always      | —                                                                                                                |
| prompt-engineering     | Always      | —                                                                                                                |
| claude-md-maintenance  | Always      | —                                                                                                                |
| coding-principles      | Always      | —                                                                                                                |
| subagent-usage         | Always      | —                                                                                                                |
| coordinator-mode       | Always      | —                                                                                                                |
| agent-routing          | Always      | —                                                                                                                |
| verification           | Conditional | `test/**`, `tests/**`, `**/*.test.*`, `**/*.spec.*`                                                              |
| testing                | Conditional | `test/**`, `tests/**`, `**/*.test.*`, `**/*.spec.*`, `__tests__/**`                                              |
| security-checklist     | Conditional | `**/auth/**`, `**/security/**`, `**/*config*`, `**/*.env*`, `**/middleware/**`                                   |
| backend-conventions    | Conditional | `src/**`, `lib/**`, `server/**`, `api/**`                                                                        |
| frontend-design-system | Conditional | `src/components/**`, `src/pages/**`, `src/views/**`, `**/*.vue`, `**/*.tsx`, `**/*.jsx`, `**/*.css`, `**/*.scss` |
| project-patterns       | Conditional | `src/**`, `lib/**`                                                                                               |

See [Conditional Skill Activation](/guide/claude-code-integration#conditional-skill-activation) for details on how path-based loading works.

---

## See Also

- [Claude Code Integration](/guide/claude-code-integration) -- how skills register with Claude Code's runtime
- [CLAUDE.md Template](/reference/claude-md) -- how skills are referenced from CLAUDE.md
- [Slash Commands](/reference/slash-commands) -- `/setup` fills template skills automatically
- [Agents](/reference/agents) -- agents that rely on skills (e.g., test-writer uses testing/SKILL.md)
