# CLAUDE.md Template

Worclaude generates a `CLAUDE.md` file at the project root during `worclaude init`. This file is the primary instruction set Claude reads at the start of every session and after every context compaction. It is deliberately kept short.

## Why ~40 Lines

Claude reads CLAUDE.md on every session start and after every `/compact`. Every line consumes context budget on every interaction. The template targets roughly 40 lines of actual content to balance completeness with economy.

Detailed knowledge is pushed to skill files, which are loaded on demand. CLAUDE.md contains just enough for Claude to orient itself and pointers to deeper knowledge.

## Template Structure

The generated CLAUDE.md has 7 sections:

### Header

```markdown
# CLAUDE.md

{project_name} — {description}
```

The project name and one-line description from the `worclaude init` prompts. Gives Claude immediate project identity.

### Key Files

```markdown
## Key Files

- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth
```

Points Claude to the two most important documents. PROGRESS.md tracks session-to-session state. SPEC.md defines what the project should do. These are always listed first because the Session Protocol references them.

### Tech Stack

```markdown
## Tech Stack

- Python
- Node.js / TypeScript
- Docker
```

Populated from the tech stack selections during init. Tells Claude what languages and tools are in play so it writes appropriate code and commands.

### Commands

````markdown
## Commands

```bash
# Python
python -m pytest                # Run tests
ruff check .                    # Lint
ruff format .                   # Format
```
````

````

Populated from the tech stack selections. Provides exact commands for testing, linting, and formatting so Claude does not guess or use incorrect tool names.

### Skills

```markdown
## Skills (read on demand, not upfront)
See `.claude/skills/` — load only what's relevant:
- context-management/SKILL.md — Session lifecycle
- claude-md-maintenance/SKILL.md — CLAUDE.md self-healing
- coding-principles/SKILL.md — Core behavioral principles (think, simplify, surgical, goal-driven)
- git-conventions/SKILL.md — Commits, branches, versioning
- planning-with-files/SKILL.md — Implementation planning
- prompt-engineering/SKILL.md — Prompting patterns and quality
- review-and-handoff/SKILL.md — Session endings
- verification/SKILL.md — How to verify work
- testing/SKILL.md — Test philosophy and patterns
- subagent-usage/SKILL.md — When and how to use subagents
- security-checklist/SKILL.md — Security review checklist
- coordinator-mode/SKILL.md — Multi-agent orchestration
- agent-routing/SKILL.md — When and how to use each installed agent (READ EVERY SESSION)
- backend-conventions/SKILL.md — Run /setup to fill automatically
- frontend-design-system/SKILL.md — Run /setup to fill automatically
- project-patterns/SKILL.md — Run /setup to fill automatically
````

Lists all 12 universal skills, 1 generated skill (agent-routing), and 3 template skills. The "read on demand, not upfront" instruction tells Claude not to load every skill at session start -- only when the current task needs it. This is the progressive disclosure pattern. The exception is `agent-routing/SKILL.md`, which is marked "READ EVERY SESSION" because Claude needs to know which agents to use from the start.

### Session Protocol

```markdown
## Session Protocol

**Start:** Read PROGRESS.md → Read `.claude/skills/agent-routing/SKILL.md` → Read active implementation prompt if any.
**During:** One task at a time. Commit after each. Use subagents per routing guide.
**End:** Update PROGRESS.md. Write handoff if ending mid-task.
```

Three-line workflow protocol. Covers the full session lifecycle. Each phase has a corresponding slash command (`/start`, `/end`) and skill file for detailed guidance. The Start phase now includes reading the agent routing guide so Claude knows which agents to use from the beginning of every session.

### Critical Rules

```markdown
## Critical Rules

1. SPEC.md is source of truth. Do not invent features.
2. Test before moving on.
3. Ask if ambiguous. Do not guess.
4. Read source files before writing. Never assume.
5. Self-healing: same mistake twice → update CLAUDE.md.
6. Use subagents to keep main context clean.
7. Mediocre fix → scrap it, implement elegantly.
```

Seven rules that apply to every task. These prevent the most common failure modes: feature drift (rule 1), untested code (rule 2), silent assumptions (rules 3-4), repeated mistakes (rule 5), context bloat (rule 6), and low-quality patches (rule 7).

### Gotchas

```markdown
## Gotchas

[Grows during development]
```

Starts empty. Grows organically as the project encounters problems. This is the self-healing mechanism -- when Claude makes the same mistake twice, a gotcha is added here to prevent it from happening again. The `/update-claude-md` command helps maintain this section.

## How Skills Are Referenced

CLAUDE.md lists skills by filename with a brief description, but does not inline their content. This is the pointer pattern:

- CLAUDE.md says: `context-management.md — Session lifecycle`
- Claude sees the pointer and knows the skill exists
- When working on context management, Claude reads the full skill file
- The skill's detailed content only enters context when needed

This keeps CLAUDE.md small while making deep knowledge accessible.

## The "Never Auto-Merge" Philosophy

CLAUDE.md is never automatically overwritten by `worclaude init` (Scenario B) or `worclaude upgrade`. When merging into a project that already has CLAUDE.md:

- **Scenario B (init with existing setup):** Worclaude generates a `CLAUDE.md.workflow-suggestions` file with proposed content. The user decides what to adopt.
- **Upgrade:** CLAUDE.md is not touched at all.

This is intentional. CLAUDE.md is expected to diverge from the template as the project evolves. Auto-merging would destroy project-specific rules, gotchas, and customizations.

## Customization

After installation, users should:

1. Run `/setup` to fill in tech stack details and commands with real project data.
2. Add project-specific critical rules as they emerge.
3. Let the Gotchas section grow naturally from development experience.
4. Keep the file under ~50 lines. Move detailed guidance to skill files.
5. Prune regularly -- remove rules for deleted code, consolidate duplicates.

---

## See Also

- [Skills](/reference/skills) -- the knowledge files referenced from CLAUDE.md
- [Slash Commands](/reference/slash-commands) -- `/setup` populates CLAUDE.md, `/update-claude-md` maintains it
- [Getting Started](/guide/getting-started) -- the init workflow that generates CLAUDE.md
