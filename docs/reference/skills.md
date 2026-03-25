# Skills

Skills are knowledge files installed to `.claude/skills/`. They teach Claude how to perform specific types of work. Unlike CLAUDE.md (which is always loaded), skills are loaded on demand -- Claude reads them only when the task at hand requires that knowledge.

CLAUDE.md contains pointers to each skill so Claude knows they exist. When working on git operations, Claude loads `git-conventions.md`. When writing tests, Claude loads `testing.md`. This keeps the active context focused.

## Universal Skills

9 skills installed with every project. These cover workflow mechanics that apply regardless of tech stack.

### context-management

| | |
|---|---|
| **File** | `.claude/skills/context-management.md` |
| **Description** | Context budget awareness, when to compact, when to clear, subagent offloading |
| **When loaded** | Mid-session when context is growing large; before deciding to compact or spawn a subagent |

Teaches the 70% rule (act before running out of context), the three tools for managing context (/compact, /clear, subagents), and a decision matrix for choosing between them. Explains how the PostCompact hook automatically re-reads CLAUDE.md and PROGRESS.md.

### git-conventions

| | |
|---|---|
| **File** | `.claude/skills/git-conventions.md` |
| **Description** | Branch naming, commit message format, PR workflow, worktree conventions |
| **When loaded** | Before creating branches, writing commits, or opening PRs |

Covers branch naming patterns (`type/short-description`), conventional commit format (`type(scope): description`), when to commit, the PR workflow with `gh`, squash vs merge policy, and worktree conventions for agents. Includes rules on commit message quality.

### planning-with-files

| | |
|---|---|
| **File** | `.claude/skills/planning-with-files.md` |
| **Description** | How to structure implementation plans as files, progressive implementation, plan review process |
| **When loaded** | Before starting multi-file changes or new features |

Defines the IMPLEMENTATION-PROMPT pattern for writing plans as versioned Markdown files. Covers how to break tasks into independently testable phases, signs a phase is too big or too small, the plan-review workflow with the plan-reviewer agent, progressive implementation (one phase at a time), and when to plan vs just do it.

### review-and-handoff

| | |
|---|---|
| **File** | `.claude/skills/review-and-handoff.md` |
| **Description** | Session ending protocol, HANDOFF document format, seamless continuation between sessions |
| **When loaded** | At session end or when ending mid-task. Triggered by the `/end` command. |

Defines the session ending protocol (commit, test, update PROGRESS.md, write handoff if mid-task). Specifies the PROGRESS.md update format and the HANDOFF document structure for mid-task endings. Includes the "fresh session test" for handoff quality: could a fresh session continue without asking questions?

### prompt-engineering

| | |
|---|---|
| **File** | `.claude/skills/prompt-engineering.md` |
| **Description** | Effective prompting patterns for working with Claude, demanding quality, writing specs |
| **When loaded** | When crafting instructions for subagents or writing spec documents |

Covers how to demand quality and elegance from Claude, when to be specific vs delegate, writing detailed specs, using the IMPLEMENTATION-PROMPT as a prompt, and model-level guidance (Opus for judgment, Sonnet for implementation, Haiku for validation). Lists prompting anti-patterns to avoid.

### verification

| | |
|---|---|
| **File** | `.claude/skills/verification.md` |
| **Description** | Domain-specific verification beyond tests, closing the feedback loop |
| **When loaded** | After implementing changes, before committing. Triggered by the `/verify` command. |

Covers verification strategies for web applications (dev server, manual testing), APIs (beyond happy path), CLIs (edge case arguments, exit codes), and data pipelines (schema checks, record counts). Defines the feedback loop pattern (change, verify, commit) and the full build verification suite.

### testing

| | |
|---|---|
| **File** | `.claude/skills/testing.md` |
| **Description** | Test philosophy, coverage strategy, test-first patterns, what to test and what not to |
| **When loaded** | When writing or reviewing tests. Used by the `test-writer` agent. |

Teaches test philosophy (behavior not implementation), meaningful coverage vs line coverage, edge cases worth testing, the test-first workflow, Arrange-Act-Assert structure, test naming as specifications, and testing anti-patterns (snapshot abuse, mock everything, testing the framework).

### claude-md-maintenance

| | |
|---|---|
| **File** | `.claude/skills/claude-md-maintenance.md` |
| **Description** | How Claude writes rules for itself, when to update CLAUDE.md, keeping it lean |
| **When loaded** | When updating CLAUDE.md. Triggered by the `/update-claude-md` command. |

Explains the self-healing pattern (same mistake twice becomes a rule), the 50-line target for CLAUDE.md, what belongs in CLAUDE.md vs skills, Gotchas section format and maintenance, and when to prune. Distinguishes between CLAUDE.md (always loaded, instructions) and skills (loaded on demand, knowledge).

### subagent-usage

| | |
|---|---|
| **File** | `.claude/skills/subagent-usage.md` |
| **Description** | When to use subagents, how many, context hygiene, worktree isolation patterns |
| **When loaded** | Before spawning subagents for testing, code review, or parallel work |

Covers when subagents help vs when they do not, context hygiene (offloading to keep the main session clean), parallel vs sequential subagents (limit to 2-3 parallel), worktree isolation mechanics, and how to give subagents good instructions. Emphasizes that subagents start with zero context and need explicit instructions.

---

## Template Skills

3 skills scaffolded with placeholder content during `worclaude init`. These contain HTML comments as prompts explaining what to fill in for each section. The `/setup` command interviews the user and populates them automatically.

### backend-conventions

| | |
|---|---|
| **File** | `.claude/skills/backend-conventions.md` |
| **Description** | Stack-specific backend patterns, API design, database access, error handling conventions |

Placeholder sections: API Patterns, Database Access, Error Handling, Authentication, Logging, Configuration Management. Each section includes HTML comment prompts asking specific questions (e.g., "Which ORM/query builder/driver is used?", "What HTTP status codes map to which error types?").

### frontend-design-system

| | |
|---|---|
| **File** | `.claude/skills/frontend-design-system.md` |
| **Description** | Design system, component library, styling approach, accessibility and responsive design standards |

Placeholder sections: Component Library, Styling Approach, State Management, Accessibility Standards, Responsive Design. Prompts cover topics like component naming, CSS methodology, state management solution, WCAG level, and breakpoint strategy.

### project-patterns

| | |
|---|---|
| **File** | `.claude/skills/project-patterns.md` |
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

Custom skills can be added by creating new `.md` files in `.claude/skills/`. They follow the same format as universal skills. Custom skills are not tracked by `worclaude diff` or `worclaude upgrade` -- they are fully user-managed.

To make Claude aware of a custom skill, add a pointer to CLAUDE.md's Skills section:

```markdown
## Skills (read on demand, not upfront)
See `.claude/skills/` — load only what's relevant:
...existing skills...
- my-custom-skill.md — Description of when to use it
```

---

## Skill File Format

Every skill file uses YAML frontmatter with a `description` field, followed by Markdown content:

```markdown
---
description: "Brief description of what this skill teaches"
---

# Skill Name

Content organized by topic with headers, lists, code examples,
tables, and a Gotchas section at the end.
```

The `description` field appears in Claude's skill listing, helping it decide which skill to load.

---

## Skill File Location

```
.claude/skills/
  context-management.md       # universal
  git-conventions.md          # universal
  planning-with-files.md      # universal
  review-and-handoff.md       # universal
  prompt-engineering.md       # universal
  verification.md             # universal
  testing.md                  # universal
  claude-md-maintenance.md    # universal
  subagent-usage.md           # universal
  backend-conventions.md      # template
  frontend-design-system.md   # template
  project-patterns.md         # template
```

Skills can be customized after installation. Additional custom skills can be added to the same directory. The `worclaude diff` command tracks modifications to installed skills.

---

## See Also

- [CLAUDE.md Template](/reference/claude-md) -- how skills are referenced from CLAUDE.md
- [Slash Commands](/reference/slash-commands) -- `/setup` fills template skills automatically
- [Agents](/reference/agents) -- agents that rely on skills (e.g., test-writer uses testing.md)
