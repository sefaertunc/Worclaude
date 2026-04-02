# Phase 2: Skill & Command Frontmatter Enrichment

**Items:** #3, #4, #5
**Branch:** `feat/v2-phase-2-skill-frontmatter`
**Depends on:** Phase 1 merged (skills are now in directory format `skill-name/SKILL.md`)
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-2-skill-frontmatter

/start                          # Load context, read this prompt
Plan                            # Design the approach from tasks below
/review-plan                    # Send plan to plan-reviewer
Execute                         # Implement Tasks A + B + C
/refactor-clean                 # Clean up changed code
/verify                         # npm test && npm run lint
/commit-push-pr                 # PR to develop
```

---

## Background

Claude Code's skill system uses two frontmatter fields beyond `description`:

- **`when_to_use`** — Tells Claude WHEN to auto-invoke a skill without the user explicitly calling it. This is separate from `description` (which is what the skill IS). The built-in `/skillify` command generates both fields. Without `when_to_use`, skills only activate when manually invoked or when Claude happens to search for them.

- **`paths`** — Gitignore-style patterns that make a skill conditional. The skill only loads into context when files matching these patterns are touched (read/write/edit) during the session. Skills without `paths` are always loaded. This saves context window budget by keeping domain-specific guidance out of unrelated work.

Source evidence (from `loadSkillsDir.ts`):

```typescript
// Skills with paths frontmatter start as conditional — stored but NOT loaded
const newConditionalSkills: Command[] = [];
for (const skill of deduplicatedSkills) {
  if (skill.type === 'prompt' && skill.paths && skill.paths.length > 0) {
    newConditionalSkills.push(skill);
  } else {
    unconditionalSkills.push(skill);
  }
}
```

---

## Task A: Add `when_to_use` to All Skill Templates

**Files to modify:** All 13 templates in `templates/skills/universal/` and `templates/skills/templates/`.

Add `when_to_use` as a new frontmatter field after `description`. The content should describe the CONDITIONS under which Claude should consult this skill — not repeat what the skill is.

### Universal skills — `templates/skills/universal/`

**context-management.md:**

```yaml
---
description: 'Context budget awareness, when to compact, when to clear, subagent offloading'
when_to_use: 'When context is running low, before compaction decisions, when deciding whether to use subagents for context hygiene'
---
```

**git-conventions.md:**

```yaml
---
description: 'Branch naming, commit message format, PR workflow, worktree conventions, versioning policy'
when_to_use: 'When creating branches, writing commit messages, creating PRs, or making versioning decisions'
---
```

**planning-with-files.md:**

```yaml
---
description: 'How to structure implementation plans as files, progressive implementation, plan review process'
when_to_use: 'When starting a multi-step task that needs a written plan, or when reviewing an existing implementation plan'
---
```

**review-and-handoff.md:**

```yaml
---
description: 'Session ending protocol, HANDOFF document format, seamless continuation between sessions'
when_to_use: 'When ending a session, writing handoff documents, or updating PROGRESS.md'
---
```

**prompt-engineering.md:**

```yaml
---
description: 'Effective prompting patterns for working with Claude, demanding quality, writing specs'
when_to_use: 'When writing or editing prompts, skills, agent definitions, or CLAUDE.md instructions'
---
```

**verification.md:**

```yaml
---
description: 'Domain-specific verification beyond tests, closing the feedback loop for web, API, CLI, data'
when_to_use: 'When verifying that implemented changes work correctly, after running automated tests, before committing'
---
```

**testing.md:**

```yaml
---
description: 'Test philosophy, coverage strategy, test-first patterns, what to test and what not to'
when_to_use: 'When writing, modifying, or reviewing tests, or when making decisions about test strategy and coverage'
---
```

**claude-md-maintenance.md:**

```yaml
---
description: 'How Claude writes rules for itself, when to update CLAUDE.md, keeping it lean and effective'
when_to_use: 'When considering updates to CLAUDE.md, when the same mistake has happened twice, when CLAUDE.md is getting too long'
---
```

**subagent-usage.md:**

```yaml
---
description: 'When to use subagents, how many, context hygiene, worktree isolation patterns'
when_to_use: 'When deciding whether to spawn a subagent, choosing between parallel and sequential execution, or giving subagent instructions'
---
```

**security-checklist.md:**

```yaml
---
description: 'OWASP-based security checklist any agent can reference when reviewing or writing code'
when_to_use: 'When writing code that handles user input, authentication, authorization, file uploads, or external data'
---
```

### Template skills — `templates/skills/templates/`

**backend-conventions.md:**

```yaml
---
description: 'CLI-specific conventions: npm registry interaction, filesystem operations, JSON handling, settings merge, and configuration patterns for worclaude'
when_to_use: 'When working on backend logic, data access patterns, configuration management, or filesystem operations'
---
```

**frontend-design-system.md:**

```yaml
---
description: 'Component architecture, styling conventions, responsive patterns, accessibility requirements'
when_to_use: 'When building, modifying, or reviewing UI components, styling, layouts, or frontend architecture'
---
```

**project-patterns.md:**

```yaml
---
description: 'Project-specific code patterns, naming conventions, and architectural decisions'
when_to_use: 'When writing new code that should follow established project patterns, or when reviewing code for consistency'
---
```

---

## Task B: Add `paths` to Conditional Skills

6 of the 13 skills should become conditional — they only load when matching files are touched. The remaining 7 stay always-loaded because their guidance applies regardless of what files are being worked on.

**Files to modify:** 6 skill templates. Add `paths` as a new frontmatter field.

### Skills that become conditional

**testing.md** — only needed when working on test files:

```yaml
---
description: 'Test philosophy, coverage strategy, test-first patterns, what to test and what not to'
when_to_use: 'When writing, modifying, or reviewing tests, or when making decisions about test strategy and coverage'
paths:
  - 'test/**'
  - 'tests/**'
  - '**/*.test.*'
  - '**/*.spec.*'
  - '__tests__/**'
---
```

**verification.md** — only needed when verifying test-related work:

```yaml
---
description: 'Domain-specific verification beyond tests, closing the feedback loop for web, API, CLI, data'
when_to_use: 'When verifying that implemented changes work correctly, after running automated tests, before committing'
paths:
  - 'test/**'
  - 'tests/**'
  - '**/*.test.*'
  - '**/*.spec.*'
---
```

**security-checklist.md** — only needed when touching security-relevant code:

```yaml
---
description: 'OWASP-based security checklist any agent can reference when reviewing or writing code'
when_to_use: 'When writing code that handles user input, authentication, authorization, file uploads, or external data'
paths:
  - '**/auth/**'
  - '**/security/**'
  - '**/*config*'
  - '**/*.env*'
  - '**/middleware/**'
---
```

**backend-conventions.md** — only needed when working on source code:

```yaml
---
description: 'CLI-specific conventions: npm registry interaction, filesystem operations, JSON handling, settings merge, and configuration patterns for worclaude'
when_to_use: 'When working on backend logic, data access patterns, configuration management, or filesystem operations'
paths:
  - 'src/**'
  - 'lib/**'
  - 'server/**'
  - 'api/**'
---
```

**frontend-design-system.md** — only needed when working on frontend:

```yaml
---
description: 'Component architecture, styling conventions, responsive patterns, accessibility requirements'
when_to_use: 'When building, modifying, or reviewing UI components, styling, layouts, or frontend architecture'
paths:
  - 'src/components/**'
  - 'src/pages/**'
  - 'src/views/**'
  - '**/*.vue'
  - '**/*.tsx'
  - '**/*.jsx'
  - '**/*.css'
  - '**/*.scss'
---
```

**project-patterns.md** — only needed when working on source code:

```yaml
---
description: 'Project-specific code patterns, naming conventions, and architectural decisions'
when_to_use: 'When writing new code that should follow established project patterns, or when reviewing code for consistency'
paths:
  - 'src/**'
  - 'lib/**'
---
```

### Skills that stay always-loaded (NO `paths`)

These 7 skills + agent-routing apply regardless of which files are being touched. Do NOT add `paths` to them:

- `context-management` — meta-guidance about context window management
- `git-conventions` — applies to every commit, branch, and PR
- `planning-with-files` — applies when planning any task
- `review-and-handoff` — applies at session boundaries
- `prompt-engineering` — applies when writing any instructions
- `claude-md-maintenance` — applies when maintaining CLAUDE.md
- `subagent-usage` — applies when deciding about subagents
- `agent-routing` (generated) — always needed for routing decisions

---

## Task C: Add `description` Frontmatter to Command Templates

**Files to modify:** All 16 templates in `templates/commands/`.

Commands currently have no frontmatter at all — they're raw markdown. The legacy `/commands/` loader auto-generates descriptions from content, but explicit `description` frontmatter is cleaner and gives better display in `/skills`.

Add a YAML frontmatter block to the top of each command template with just `description`. Do NOT add `when_to_use` (commands are user-invoked, not auto-invoked).

### All 16 commands

**start.md:**

```yaml
---
description: 'Load session context, check for handoff files, detect drift since last session'
---
```

**end.md:**

```yaml
---
description: 'Mid-task stop — writes handoff file and session summary for next session'
---
```

**commit-push-pr.md:**

```yaml
---
description: 'Commit, push, and create PR — branch-aware with session summary'
---
```

**sync.md:**

```yaml
---
description: 'Update PROGRESS.md, SPEC.md, and version after merging PRs on develop'
---
```

**conflict-resolver.md:**

```yaml
---
description: 'Resolve merge conflicts on develop branch'
---
```

**verify.md:**

```yaml
---
description: 'Run full project verification — tests, build, lint, type checking'
---
```

**review-changes.md:**

```yaml
---
description: 'Code review — reports findings as prioritized table without modifying files'
---
```

**review-plan.md:**

```yaml
---
description: 'Send implementation plan to plan-reviewer agent for staff-level review'
---
```

**simplify.md** (if it exists as a command, otherwise skip):

```yaml
---
description: 'Review changed code and fix issues found via code-simplifier agent'
---
```

**refactor-clean.md:**

```yaml
---
description: 'Focused cleanup pass on recently changed code'
---
```

**build-fix.md:**

```yaml
---
description: 'Fix current build failures via build-fixer agent'
---
```

**test-coverage.md:**

```yaml
---
description: 'Analyze test coverage and fill gaps in recently changed code'
---
```

**techdebt.md:**

```yaml
---
description: 'Scan codebase for technical debt and report findings'
---
```

**status.md:**

```yaml
---
description: 'Report current session state — branch, recent changes, pending work'
---
```

**setup.md:**

```yaml
---
description: 'Project setup interview — fills in CLAUDE.md, skills, and configuration'
---
```

**compact-safe.md:**

```yaml
---
description: 'Compress context via /compact with safety checks'
---
```

**update-claude-md.md:**

```yaml
---
description: 'Propose updates to CLAUDE.md based on session work and recurring patterns'
---
```

For each file: add the `---` frontmatter block at the very top, before the existing content. The existing markdown body stays unchanged.

---

## Verification Checklist

### Automated

```bash
npm test        # All tests must pass
npm run lint    # Must pass
```

### Manual — Scenario A

```bash
rm -rf /tmp/test-phase2 && mkdir /tmp/test-phase2 && cd /tmp/test-phase2 && git init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
```

Verify:

- [ ] Every `SKILL.md` in `.claude/skills/*/` has both `description` and `when_to_use` in frontmatter
- [ ] 6 conditional skills have `paths` in frontmatter: testing, verification, security-checklist, backend-conventions, frontend-design-system, project-patterns
- [ ] 7 always-loaded skills do NOT have `paths`: context-management, git-conventions, planning-with-files, review-and-handoff, prompt-engineering, claude-md-maintenance, subagent-usage
- [ ] All commands in `.claude/commands/` have `description` frontmatter
- [ ] Existing command content is unchanged (frontmatter added above it)

### Manual — Claude Code Integration

In the scaffolded test project, start Claude Code:

- [ ] `/skills` shows skills with their `description` text (not auto-generated)
- [ ] Conditional skills appear in `/skills` only after touching matching files (e.g., edit a test file, then check if `testing` appears)
- [ ] Commands still work as before (`/start`, `/verify`, etc.)

---

## Do NOT Change in This Phase

- Skill or command markdown body content (only frontmatter additions)
- Source code files (`init.js`, `merger.js`, etc.) — unless a test needs updating for frontmatter assertions
- Agent templates (those are Phase 3)
- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files)
