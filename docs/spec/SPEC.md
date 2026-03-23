# SPEC.md — Claude Workflow CLI

## Product Overview

**claude-workflow** is a CLI tool that scaffolds a comprehensive Claude Code workflow system into any project. It installs agents, skills, slash commands, hooks, permissions, and configuration files derived from 53 tips by Boris Cherny (creator of Claude Code at Anthropic).

**Install:** `npm install -g claude-workflow`
**Usage:** `claude-workflow init` in any project directory

---

## Core Commands

| Command | Purpose |
|---|---|
| `claude-workflow init` | Scaffold workflow into a project (fresh or existing) |
| `claude-workflow upgrade` | Update universal components to latest version |
| `claude-workflow status` | Show current workflow state, version, customizations |
| `claude-workflow backup` | Manual backup of current Claude setup |
| `claude-workflow restore` | Restore from a backup |
| `claude-workflow diff` | Compare current setup vs latest workflow version |

---

## Three Scenarios

### Scenario A: Fresh Project
No `.claude/` directory or `CLAUDE.md` exists. Full interactive scaffold.

### Scenario B: Existing Project
Project has some Claude Code setup (CLAUDE.md, skills, hooks, etc.). Smart merge with backup.

### Scenario C: Upgrade
Project previously ran `claude-workflow init`. Update universal components without touching customizations.

**Detection logic:**
- No `.claude/` and no `CLAUDE.md` → Scenario A
- `.claude/` or `CLAUDE.md` exists but no `.claude/workflow-meta.json` → Scenario B
- `.claude/workflow-meta.json` exists → Scenario C

---

## Init Flow (Scenario A — Fresh Project)

### Step 1: Welcome & Project Info
```
$ claude-workflow init

  Claude Workflow v1.0.0
  ─────────────────────

? Project name: My Project
? One-line description: A web app for managing tasks
```

### Step 2: Project Type Selection
Multi-select with overlap warning.
```
? What type of project is this? (space to select)
  ◻ Full-stack web application
  ◻ Backend / API
  ◻ Frontend / UI
  ◻ CLI tool
  ◻ Data / ML / AI
  ◻ Library / Package
  ◻ DevOps / Infrastructure
```

If multiple types selected that share recommended agents, show:
```
  Note: 3 agents are recommended by multiple categories
  (api-designer, bug-fixer, database-analyst)
  They will appear once in the selection.
```

### Step 3: Tech Stack Selection
Based on project type. Determines permissions, hooks (formatter), and template content.
```
? Primary backend language:
  ◉ Python
  ○ Node.js / TypeScript
  ○ Rust
  ○ Go
  ○ Other / None

? Do you use Docker? (Y/n)
```

### Step 4: Agent Selection
Universal agents listed as already included. Optional agents pre-selected based on project type.
```
✓ Universal agents (always installed):
  ✓ plan-reviewer (Opus)
  ✓ code-simplifier (Sonnet, worktree)
  ✓ test-writer (Sonnet, worktree)
  ✓ build-validator (Haiku)
  ✓ verify-app (Sonnet, worktree)

? Recommended agents for "Backend / API" (space to toggle):
  ◼ api-designer — Reviews and designs API contracts
  ◼ database-analyst — Queries, analyzes data, validates schemas
  ◼ security-reviewer — Scans for vulnerabilities
  ◼ auth-auditor — Reviews auth flows
  ◼ bug-fixer — Investigates and fixes errors autonomously
  ◼ performance-auditor — Profiles and optimizes bottlenecks

? Additional agents available (space to select):
  ◻ ui-reviewer — Reviews UI for consistency and accessibility
  ◻ style-enforcer — Ensures design system compliance
  ◻ ci-fixer — Monitors and fixes CI/CD failures
  ◻ docker-helper — Manages containerization
  ◻ deploy-validator — Validates deployment readiness
  ◻ dependency-manager — Audits and resolves dependencies
  ◻ doc-writer — Updates docs from code changes
  ◻ changelog-generator — Generates changelogs from git history
  ◻ refactorer — Large-scale refactoring with isolation
  ◻ data-pipeline-reviewer — Reviews data flows
  ◻ ml-experiment-tracker — Tracks ML experiments
  ◻ prompt-engineer — Reviews and optimizes LLM prompts
```

### Step 5: Scaffold
Create all files. Show progress.
```
  Creating workflow structure...

  ✓ CLAUDE.md
  ✓ .claude/settings.json (permissions, hooks, sandbox)
  ✓ .claude/workflow-meta.json
  ✓ .claude/agents/ (5 universal + 6 selected)
  ✓ .claude/commands/ (9 universal)
  ✓ .claude/skills/ (9 universal + 3 templates)
  ✓ .mcp.json
  ✓ docs/spec/PROGRESS.md
  ✓ docs/spec/SPEC.md

  Done! Workflow installed successfully.

  Next steps:
  1. Fill in your Tech Stack and Commands in CLAUDE.md
  2. Fill in project-specific skill templates in .claude/skills/
  3. Write your SPEC.md
  4. Start a Claude Code session: claude --worktree --tmux
```

---

## Init Flow (Scenario B — Existing Project)

### Step 1: Detection & Backup
```
$ claude-workflow init

  Claude Workflow v1.0.0
  ─────────────────────

  Detected existing Claude Code setup:

  CLAUDE.md ................. exists (38 lines)
  .claude/settings.json ..... exists
  .claude/skills/ ........... 9 files found
  .claude/agents/ ........... not found
  .claude/commands/ ......... not found
  .mcp.json ................. exists

  A backup will be created before any changes.

? Proceed? (Y/n)
```

### Step 2: Backup
```
  Creating backup...
  ✓ Backed up to .claude-backup-20260323-143022/
```

### Step 3: Project Type & Tech Stack & Agents
Same interactive prompts as Scenario A.

### Step 4: Tiered Merge

**Tier 1 — Additive (automatic, no prompt):**
- Missing skills → add
- Missing agents → add (universal + selected optional)
- Missing commands → add all 9
- settings.json permissions → append new ones to existing list
- settings.json hooks → append new hooks (only if matcher doesn't conflict)
- .mcp.json → add missing servers
- docs/spec/PROGRESS.md → create if missing, skip if exists
- docs/spec/SPEC.md → create if missing, skip if exists
- .claude/workflow-meta.json → create

**Tier 2 — Safe alongside (notify, don't ask):**
- Conflicting skills → keep user's, save workflow version as `{name}.workflow-ref.md`
- Conflicting agents → same pattern
- Conflicting commands → same pattern

**Tier 3 — Interactive (ask user):**
- CLAUDE.md → special handling (see below)
- settings.json hook matcher conflicts → ask user

### Step 5: CLAUDE.md Special Handling
```
  Your CLAUDE.md (38 lines) was detected.

  The workflow recommends these additions:
  [+] Session Protocol section (Start/During/End)
  [+] Critical Rules: self-healing, subagent usage
  [+] Skills pointer section (progressive disclosure)
  [+] Gotchas section (empty, grows during development)

? How would you like to handle CLAUDE.md?
  ◉ Keep mine, save suggestions to CLAUDE.md.workflow-suggestions
  ○ Show me a side-by-side comparison
  ○ Merge interactively section by section
```

Default: keep user's, generate suggestions file.

### Step 6: Report
```
  Merge complete!

  Added:
  ✓ 5 universal agents + 4 selected optional agents
  ✓ 9 slash commands
  ✓ 6 universal skills (3 conflicts saved as .workflow-ref.md)
  ✓ 18 permission rules appended
  ✓ 3 hooks added

  Conflicts (saved alongside):
  ~ context-management.md → context-management.workflow-ref.md
  ~ git-conventions.md → git-conventions.workflow-ref.md
  ~ testing.md → testing.workflow-ref.md

  Suggestions:
  ~ CLAUDE.md.workflow-suggestions (review and merge manually)

  Next steps:
  1. Review .workflow-ref.md files and merge what's useful
  2. Review CLAUDE.md.workflow-suggestions
  3. Delete .workflow-ref.md and .workflow-suggestions files when done
```

---

## Upgrade Flow (Scenario C)

### Step 1: Version Check
```
$ claude-workflow upgrade

  Current version: 1.0.0
  Available version: 1.1.0
```

### Step 2: Change Detection
Uses hashes stored in workflow-meta.json to detect which files user has customized.
```
  Changes in 1.1.0:
  + New agent: incident-responder
  + Updated: context-management.md (improved compaction)
  ~ Modified: settings.json (new hook)

  Auto-update (unchanged since install):
    git-conventions.md, plan-reviewer.md, 12 more

  Needs review (you've customized these):
    context-management.md
```

### Step 3: Apply
Same tiered merge as Scenario B for conflicting files. Auto-update unchanged files. Create workflow-meta.json with new version and hashes.

---

## Status Command

```
$ claude-workflow status

  Claude Workflow v1.0.0
  Installed: 2026-03-23

  Project type: Backend / API
  Tech stack: Python

  Universal agents: 5/5 installed
  Optional agents: 6 installed (api-designer, database-analyst,
                    security-reviewer, auth-auditor, bug-fixer,
                    performance-auditor)
  Commands: 9/9 installed
  Skills: 9 universal + 3 templates

  Customized files (differ from installed version):
    .claude/skills/testing.md
    CLAUDE.md

  Hooks: 3 active (format, postcompact, notification)
  Sandbox: auto-allow
  Permissions: 47 rules
```

---

## Backup & Restore

### Backup
```
$ claude-workflow backup

  Creating backup...
  ✓ Backed up to .claude-backup-20260323-143022/

  Contents:
    CLAUDE.md
    .claude/ (full directory)
    .mcp.json
```

### Restore
```
$ claude-workflow restore

  Available backups:
  1. .claude-backup-20260323-143022 (2 hours ago)
  2. .claude-backup-20260320-091500 (3 days ago)

? Select backup to restore: 1

  ⚠ This will replace your current Claude setup.
? Confirm restore? (y/N)

  ✓ Restored from .claude-backup-20260323-143022/
```

### Diff
```
$ claude-workflow diff

  Comparing current setup to workflow v1.0.0:

  Modified (your changes):
  ~ CLAUDE.md (added 5 gotchas)
  ~ .claude/skills/testing.md (added pytest patterns)

  Missing (removed or never installed):
  - .claude/agents/doc-writer.md

  Extra (you added):
  + .claude/skills/my-custom-skill.md
  + .claude/agents/my-custom-agent.md
```

---

## File Templates

### CLAUDE.md Template
```markdown
# CLAUDE.md

{project_name} — {description}

## Key Files
- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth

## Tech Stack
{tech_stack_filled_during_init}

## Commands
{commands_filled_during_init}

## Skills (read on demand, not upfront)
See `.claude/skills/` — load only what's relevant:
- context-management.md — Session lifecycle
- git-conventions.md — Commits and branches
- planning-with-files.md — Implementation planning
- review-and-handoff.md — Session endings
- verification.md — How to verify work
- testing.md — Test philosophy and patterns
{project_specific_skills}

## Session Protocol
**Start:** Read PROGRESS.md. Read active implementation prompt if any.
**During:** One task at a time. Commit after each. Use subagents for side work.
**End:** Update PROGRESS.md. Write handoff if ending mid-task.

## Critical Rules
1. SPEC.md is source of truth. Do not invent features.
2. Test before moving on.
3. Ask if ambiguous. Do not guess.
4. Read source files before writing. Never assume.
5. Self-healing: same mistake twice → update CLAUDE.md.
6. Use subagents to keep main context clean.
7. Mediocre fix → scrap it, implement elegantly.

## Gotchas
[Grows during development]
```

### workflow-meta.json Template
```json
{
  "version": "1.0.0",
  "installedAt": "{timestamp}",
  "lastUpdated": "{timestamp}",
  "projectTypes": ["{selected_types}"],
  "techStack": "{selected_stack}",
  "universalAgents": [
    "plan-reviewer",
    "code-simplifier",
    "test-writer",
    "build-validator",
    "verify-app"
  ],
  "optionalAgents": ["{selected_agents}"],
  "fileHashes": {
    "agents/plan-reviewer.md": "{sha256}",
    "agents/code-simplifier.md": "{sha256}",
    "skills/context-management.md": "{sha256}",
    ...
  }
}
```

### settings.json Structure
```json
{
  "permissions": {
    "allow": [
      "// -- Read-only / Exploration --",
      "Bash(find:*)", "Bash(grep:*)", "Bash(cat:*)", "Bash(ls:*)",
      "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)", "Bash(which:*)",
      "Bash(tree:*)", "Bash(diff:*)", "Bash(sort:*)", "Bash(uniq:*)",
      "Bash(awk:*)", "Bash(sed:*)", "Bash(cut:*)", "Bash(jq:*)",
      "Bash(xargs:*)",
      "Bash(ps:*)", "Bash(du:*)", "Bash(df:*)",
      "Bash(env:*)", "Bash(printenv:*)",

      "// -- Git --",
      "Bash(git status:*)", "Bash(git log:*)", "Bash(git diff:*)",
      "Bash(git branch:*)", "Bash(git checkout:*)",
      "Bash(git add:*)", "Bash(git commit:*)", "Bash(git push:*)",
      "Bash(git pull:*)", "Bash(git fetch:*)", "Bash(git merge:*)",
      "Bash(git stash:*)", "Bash(git worktree:*)",
      "Bash(git rebase:*)", "Bash(git cherry-pick:*)", "Bash(git tag:*)",
      "Bash(gh:*)",

      "// -- Common Dev Tools --",
      "Bash(echo:*)", "Bash(mkdir:*)", "Bash(touch:*)",
      "Bash(cp:*)", "Bash(mv:*)",
      "Bash(curl:*)", "Bash(wget:*)",
      "Bash(tar:*)", "Bash(zip:*)", "Bash(unzip:*)",
      "Bash(make:*)",

      "// -- Edit Permissions --",
      "Edit(.claude/**)", "Edit(docs/**)",
      "Edit(src/**)", "Edit(tests/**)", "Edit(test/**)",
      "Edit(README*)", "Edit(*.md)",
      "Edit(package.json)", "Edit(pyproject.toml)",
      "Edit(Dockerfile*)", "Edit(docker-compose*)",
      "Edit(.github/**)"

      // Project-specific permissions appended based on tech stack
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "{formatter_command} || true"
        }]
      },
      {
        "matcher": "Stop",
        "hooks": [{
          "type": "command",
          "command": "{notification_command}"
        }]
      }
    ],
    "PostCompact": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "cat CLAUDE.md && cat docs/spec/PROGRESS.md 2>/dev/null || true"
        }]
      }
    ]
  }
}
```

**Formatter commands by stack:**
| Stack | Command |
|---|---|
| Python | `ruff format . \|\| true` |
| Node/TypeScript | `npx prettier --write . \|\| true` |
| Rust | `cargo fmt \|\| true` |
| Go | `gofmt -w . \|\| true` |

**Notification commands by OS:**
| OS | Command |
|---|---|
| Linux | `notify-send 'Claude Code' 'Session needs attention' 2>/dev/null \|\| true` |
| macOS | `osascript -e 'display notification "Session needs attention" with title "Claude Code"' 2>/dev/null \|\| true` |
| Windows | `powershell -command "New-BurntToastNotification -Text 'Claude Code','Session needs attention'" 2>/dev/null \|\| true` |

---

## Universal Agents

### plan-reviewer.md
```markdown
---
name: plan-reviewer
model: opus
isolation: none
---

You are a senior staff engineer reviewing an implementation plan.
Your job is to challenge assumptions, identify ambiguity, check
for missing verification steps, and ensure the plan is specific
enough for one-shot implementation.

Review the plan critically:
- Are there ambiguous requirements that could be interpreted multiple ways?
- Is there a clear verification strategy for each step?
- Are there edge cases not addressed?
- Is the scope realistic for a single implementation pass?
- Does it align with the project's SPEC.md?

Be direct. Flag problems. Suggest improvements. Do not approve
plans that are vague or missing verification steps.
```

### code-simplifier.md
```markdown
---
name: code-simplifier
model: sonnet
isolation: worktree
---

You are a code quality specialist. Review the recently changed
code and improve it:

- Find and eliminate duplication
- Identify reuse opportunities with existing code
- Simplify complex logic
- Ensure consistency with project patterns
- Check CLAUDE.md compliance

Make the changes directly. Run tests after each change to verify
nothing breaks. Commit improvements separately from feature work.
```

### test-writer.md
```markdown
---
name: test-writer
model: sonnet
isolation: worktree
---

You are a test specialist. Write comprehensive tests for the
recently changed code:

- Unit tests for individual functions and methods
- Integration tests for component interactions
- Edge case coverage (null, empty, boundary values)
- Error path testing

Follow the project's testing patterns from .claude/skills/testing.md.
Run all tests to verify they pass. Aim for meaningful coverage,
not 100% line coverage.
```

### build-validator.md
```markdown
---
name: build-validator
model: haiku
isolation: none
---

Validate the project builds and passes all checks:

1. Run the build command
2. Run the full test suite
3. Run the linter
4. Check for type errors (if applicable)

Report any failures with clear error messages. Do not fix
issues — report them so the main session can address them.
```

### verify-app.md
```markdown
---
name: verify-app
model: sonnet
isolation: worktree
---

You are a verification specialist. Test the actual running
application behavior, not just unit tests:

- Start the application
- Test the changed functionality end-to-end
- Verify the behavior matches the specification
- Check for regressions in related features
- Test error handling and edge cases in the running app

Report results with specific pass/fail for each verification step.
```

---

## Optional Agent Catalog

### Category Recommendations Map

| Project Type | Recommended Agents |
|---|---|
| Full-stack web | ui-reviewer, api-designer, database-analyst, security-reviewer, bug-fixer, doc-writer |
| Backend / API | api-designer, database-analyst, security-reviewer, auth-auditor, bug-fixer, performance-auditor |
| Frontend / UI | ui-reviewer, style-enforcer, performance-auditor, bug-fixer |
| CLI tool | bug-fixer, doc-writer, dependency-manager |
| Data / ML / AI | data-pipeline-reviewer, ml-experiment-tracker, prompt-engineer, database-analyst |
| Library / Package | doc-writer, dependency-manager, performance-auditor, refactorer, changelog-generator |
| DevOps / Infrastructure | ci-fixer, docker-helper, deploy-validator, dependency-manager |

### All Optional Agents

Each agent follows the same frontmatter format. Full content for each agent is in `templates/agents/optional/`. The key specifications:

| Agent | Model | Isolation | Category |
|---|---|---|---|
| ui-reviewer | sonnet | none | frontend |
| style-enforcer | haiku | none | frontend |
| api-designer | opus | none | backend |
| database-analyst | sonnet | none | backend |
| auth-auditor | opus | none | backend |
| dependency-manager | haiku | none | devops |
| ci-fixer | sonnet | worktree | devops |
| docker-helper | sonnet | none | devops |
| deploy-validator | sonnet | none | devops |
| bug-fixer | sonnet | worktree | quality |
| security-reviewer | opus | none | quality |
| performance-auditor | sonnet | none | quality |
| refactorer | sonnet | worktree | quality |
| doc-writer | sonnet | worktree | docs |
| changelog-generator | haiku | none | docs |
| data-pipeline-reviewer | sonnet | none | data |
| ml-experiment-tracker | sonnet | none | data |
| prompt-engineer | opus | none | data |

---

## Universal Slash Commands

All 9 are installed in every project. Files live in `.claude/commands/`.

### /start (start.md)
```markdown
Read docs/spec/PROGRESS.md to understand current state.
If an active implementation prompt exists, read it.
Report: what was last completed, what's next, any blockers.
```

### /end (end.md)
```markdown
Update docs/spec/PROGRESS.md with:
- What was completed this session
- What's in progress
- Any blockers or decisions needed
- Next steps

If ending mid-task, write a handoff document at
docs/handoffs/HANDOFF_{date}.md with enough context
for a fresh session to continue seamlessly.
```

### /commit-push-pr (commit-push-pr.md)
```markdown
1. Stage all changes: git add -A
2. Write a clear, conventional commit message
3. Push to the current branch
4. Create a PR with:
   - Clear title
   - Description of changes
   - Testing done
   - Any notes for reviewers
Use `gh pr create` for PR creation.
```

### /review-plan (review-plan.md)
```markdown
Send the current implementation plan to the plan-reviewer agent.
The plan-reviewer will act as a staff engineer and critically
review the plan for:
- Ambiguity
- Missing verification steps
- Unrealistic scope
- Edge cases
- SPEC.md alignment

Wait for the review and address all feedback before proceeding.
```

### /techdebt (techdebt.md)
```markdown
Scan the codebase for technical debt:
- Duplicated code
- Dead code (unused functions, imports, variables)
- TODO/FIXME/HACK comments
- Overly complex functions
- Missing tests for critical paths
- Inconsistent patterns

Report findings organized by severity. Fix quick wins directly.
```

### /verify (verify.md)
```markdown
Run full project verification:
1. Run the test suite
2. Run the build
3. Run the linter
4. Run type checking (if applicable)
5. Run any domain-specific verification

Report results clearly. Do not proceed if any check fails.
```

### /compact-safe (compact-safe.md)
```markdown
Run /compact to compress context.
The PostCompact hook will automatically re-read CLAUDE.md
and PROGRESS.md.

After compaction, briefly confirm:
- Current task
- Current branch
- What was just being worked on
```

### /status (status.md)
```markdown
Report current session state:
- Current task / what you're working on
- Git branch and recent commits
- Test status (last run results)
- Context usage estimate
- Any blockers or pending decisions
```

### /update-claude-md (update-claude-md.md)
```markdown
Based on this session's work, propose updates to CLAUDE.md:

Review what happened:
- Any mistakes that should become rules
- Any patterns discovered that should be documented
- Any gotchas encountered

Write the proposed additions to the Gotchas section or
Critical Rules section. Show the diff before applying.
```

---

## Universal Skills

All 9 universal skills live in `.claude/skills/`. Full content for each is in `templates/skills/universal/`. They follow Thariq's skill authoring standards:

- Skip the obvious
- Build a Gotchas section
- Progressive disclosure (folder structure when complex)
- Don't railroad — give info, let Claude adapt
- Description = trigger phrase for the model
- Include helper scripts where useful

### Skill Summaries

| Skill | Core Content |
|---|---|
| context-management.md | Context budget awareness, when to /compact, when to /clear, subagent offloading for context hygiene |
| git-conventions.md | Branch naming, commit message format, PR workflow, worktree conventions |
| planning-with-files.md | How to structure implementation plans as files, progressive implementation, plan review process |
| review-and-handoff.md | Session ending protocol, HANDOFF document format, what to include for seamless continuation |
| prompt-engineering.md | Effective prompting patterns, challenge Claude, demand elegance, write detailed specs |
| verification.md | Domain-specific verification beyond tests: browser, API, data, CLI. How to close the feedback loop |
| testing.md | Test philosophy, coverage strategy, test-first patterns, what to test vs what not to |
| claude-md-maintenance.md | How Claude writes rules for itself, when to update, how to keep CLAUDE.md lean |
| subagent-usage.md | When to use subagents, how many, context hygiene, worktree isolation patterns |

### Template Skills (project-specific placeholders)

| Skill | Purpose |
|---|---|
| backend-conventions.md | Stack-specific backend patterns. Placeholder with sections to fill. |
| frontend-design-system.md | Design system, components, styling. Placeholder with sections to fill. |
| project-patterns.md | Architectural patterns specific to this project. Placeholder with sections to fill. |

---

## Configuration Details

### Statusline
```
[Opus·High] 🏷 auth-refactor | 🌿 feature/auth | ████████░░ 78% | $0.12 | 🕐 12m
```
Elements: model+effort, session name, branch, context %, cost, time elapsed.

### Effort Level
Default: High. User escalates to max per session via `/effort max`.

### Output Style
Default: Concise. User switches to explanatory when exploring unfamiliar territory.

### Sandbox Mode
Default: Sandbox with auto-allow. Structural safety via file and network isolation.

---

## Tech Stack for the CLI Tool Itself

- **Runtime:** Node.js (cross-platform: Linux, macOS, Windows)
- **Package manager:** npm
- **CLI framework:** Commander.js
- **Interactive prompts:** Inquirer.js
- **Terminal styling:** Chalk
- **Spinners:** Ora
- **File operations:** fs-extra
- **Hashing:** Node.js crypto (built-in)
- **OS detection:** Node.js os (built-in)
- **Testing:** Vitest
- **Linting:** ESLint + Prettier

### package.json bin entry
```json
{
  "name": "claude-workflow",
  "version": "1.0.0",
  "bin": {
    "claude-workflow": "./src/index.js"
  }
}
```

---

## Project Structure

```
Claude-Workflow/
├── package.json
├── README.md
├── LICENSE
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   └── skills/
├── docs/
│   ├── spec/
│   │   ├── SPEC.md
│   │   └── PROGRESS.md
│   └── reference/
│       └── workflow-reference.docx
├── src/
│   ├── index.js                    # CLI entry point
│   ├── commands/
│   │   ├── init.js
│   │   ├── upgrade.js
│   │   ├── status.js
│   │   ├── backup.js
│   │   ├── restore.js
│   │   └── diff.js
│   ├── core/
│   │   ├── detector.js             # Scenario A/B/C detection
│   │   ├── merger.js               # Tiered merge logic
│   │   ├── scaffolder.js           # Template → project file creation
│   │   ├── backup.js               # Backup/restore logic
│   │   └── config.js               # workflow-meta.json management
│   ├── prompts/
│   │   ├── project-type.js
│   │   ├── agent-selection.js
│   │   ├── tech-stack.js
│   │   ├── conflict-resolution.js
│   │   └── claude-md-merge.js
│   └── utils/
│       ├── file.js
│       ├── git.js
│       ├── hash.js
│       └── display.js
├── templates/
│   ├── claude-md.md
│   ├── mcp-json.json
│   ├── workflow-meta.json
│   ├── progress-md.md
│   ├── spec-md.md
│   ├── settings/
│   │   ├── base.json
│   │   ├── python.json
│   │   ├── node.json
│   │   ├── rust.json
│   │   ├── go.json
│   │   └── docker.json
│   ├── agents/
│   │   ├── universal/
│   │   │   ├── plan-reviewer.md
│   │   │   ├── code-simplifier.md
│   │   │   ├── test-writer.md
│   │   │   ├── build-validator.md
│   │   │   └── verify-app.md
│   │   └── optional/
│   │       ├── frontend/ (ui-reviewer.md, style-enforcer.md)
│   │       ├── backend/ (api-designer.md, database-analyst.md, auth-auditor.md)
│   │       ├── devops/ (dependency-manager.md, ci-fixer.md, docker-helper.md, deploy-validator.md)
│   │       ├── quality/ (bug-fixer.md, security-reviewer.md, performance-auditor.md, refactorer.md)
│   │       ├── docs/ (doc-writer.md, changelog-generator.md)
│   │       └── data/ (data-pipeline-reviewer.md, ml-experiment-tracker.md, prompt-engineer.md)
│   ├── commands/
│   │   ├── start.md
│   │   ├── end.md
│   │   ├── commit-push-pr.md
│   │   ├── review-plan.md
│   │   ├── techdebt.md
│   │   ├── verify.md
│   │   ├── compact-safe.md
│   │   ├── status.md
│   │   └── update-claude-md.md
│   └── skills/
│       ├── universal/ (9 files)
│       └── templates/ (3 files)
└── tests/
    ├── commands/ (init.test.js, upgrade.test.js, status.test.js)
    ├── core/ (detector.test.js, merger.test.js, scaffolder.test.js)
    └── fixtures/
        ├── fresh-project/
        ├── existing-project/
        └── workflow-project/
```

---

## Implementation Phases

### Phase 1: Foundation
- Project setup (package.json, ESLint, Prettier, Vitest)
- CLI entry point with Commander.js
- All template files created
- Basic `init` command (Scenario A only — fresh project)

### Phase 2: Interactive Prompts
- Project type selection (multi-select with overlap warning)
- Tech stack selection
- Agent selection (category recommendations + manual override)
- Template variable substitution

### Phase 3: Smart Merge
- Detector (Scenario A/B/C detection)
- Backup system
- Tiered merge logic
- CLAUDE.md special handling
- Conflict resolution prompts
- Full Scenario B support

### Phase 4: Upgrade & Utilities
- workflow-meta.json with file hashes
- `upgrade` command (Scenario C)
- `status` command
- `backup` / `restore` commands
- `diff` command

### Phase 5: Polish & Testing
- Comprehensive tests for all scenarios
- Test fixtures for fresh, existing, and workflow projects
- Cross-platform testing (Linux, macOS, Windows)
- README with documentation
- npm publish preparation

---

## Design Decisions Reference

This spec is derived from 53 tips by Boris Cherny (creator of Claude Code). Key design decisions:

1. **Agents are task-specific, not role-based.** No "backend-engineer" agents. Domain knowledge lives in skills.
2. **CLAUDE.md must be lean.** Under 50 lines. Progressive disclosure via skills.
3. **Sandbox with auto-allow** as default. Safety through structural isolation.
4. **High effort default.** Max escalated per session for complex tasks.
5. **Concise output style default.** Explanatory when exploring.
6. **Auto-naming for sessions.** Manual --name only when user wants it.
7. **Three universal hooks.** Format on write, PostCompact re-injection, notification on stop.
8. **All slash commands universal.** They're lightweight — include all 9 everywhere.
9. **Skills use progressive disclosure.** CLAUDE.md points to skills, skills load on demand.
10. **The pipeline: Design → Review → Execute → Quality → Verify → PR.**
