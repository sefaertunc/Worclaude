# Phase 6: New Content & Templates

**Items:** #16, #17, #18, #19, #20
**Branch:** `feat/v2-phase-6-new-content`
**Depends on:** Phase 1 merged (skill directory format must be in place)
**Can run in parallel with:** Phases 2, 3, 4
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-6-new-content

/start
Plan
/review-plan
Execute
/refactor-clean
/verify
/commit-push-pr
```

---

## Item 16: Scaffold MEMORY.md Template

Claude Code uses a three-layer memory architecture with a `MEMORY.md` index file (200-line / 25KB cap). Worclaude can scaffold a starter template.

### Create template file

**New file:** `templates/core/memory-md.md`

```markdown
# MEMORY.md

> This file is an index of pointers, not storage. Each entry should be under ~200 characters.
> Limit: 200 lines / 25KB. Move detail into topic files in `.claude/memory/`.
> Claude Code reads this at session start — keep it lean.

## User
<!-- Role, preferences, expertise — helps Claude tailor responses -->

## Feedback
<!-- What to do and what to avoid — both corrections AND confirmed approaches -->
<!-- Format: rule, then **Why:** and **How to apply:** -->

## Project
<!-- Ongoing work, goals, deadlines — convert relative dates to absolute -->
<!-- Format: fact/decision, then **Why:** and **How to apply:** -->

## Reference
<!-- Pointers to external systems — Linear boards, Slack channels, dashboards -->

---

## What NOT to save here

- Code patterns, architecture, file paths — derivable from current project state
- Git history, recent changes — `git log` / `git blame` are authoritative
- Debugging solutions — the fix is in the code, the context is in the commit message
- Anything already in CLAUDE.md
- Ephemeral task details — current conversation context, in-progress work
```

### Integration into init flow

In `src/commands/init.js`, add an optional prompt during Scenario A:

```javascript
const { useMemory } = await inquirer.prompt([{
  type: 'confirm',
  name: 'useMemory',
  message: 'Scaffold a MEMORY.md template? (experimental — for Claude Code memory system)',
  default: false,
}]);

if (useMemory) {
  await scaffoldFile('core/memory-md.md', 'MEMORY.md', {}, projectRoot);
  spinner.text = 'Created MEMORY.md template';
}
```

This is optional and defaults to `false` — it's experimental and not all users will want it.

### Scenario B handling

In `merger.js`, if MEMORY.md already exists, don't overwrite. If it doesn't exist, don't add it either (the user didn't opt in during their original init). Only fresh Scenario A init offers the option.

---

## Item 17: Upgrade `verify-app` Agent

Rewrite `templates/agents/universal/verify-app.md` to incorporate patterns from Claude Code's production verification agent.

### Key additions to the agent body (keep existing frontmatter from Phases 1+3):

**Structured verdict output:**
Replace the current "Verdict" section with:
```markdown
## Output Format (REQUIRED)

Every check MUST follow this structure:

### Check: [what you're verifying]
**Command run:** [exact command executed]
**Output observed:** [actual terminal output — copy-paste, not paraphrased]
**Result: PASS** (or **FAIL** with Expected vs Actual)

End with exactly one of:
- VERDICT: PASS
- VERDICT: FAIL
- VERDICT: PARTIAL (environmental limitations only — not "I'm unsure")
```

**Anti-rationalization section:**
Add after the process section:
```markdown
## Recognize Your Own Rationalizations

You will feel the urge to skip checks. These are the excuses — recognize them:
- "The code looks correct based on my reading" — reading is not verification. Run it.
- "The tests already pass" — the implementer is an LLM. Verify independently.
- "This is probably fine" — probably is not verified. Run it.
- "I don't have a browser" — did you check for available MCP tools?
- If you catch yourself writing an explanation instead of a command, stop. Run the command.
```

**Type-specific strategies:**
Add a section with strategies for different change types:
```markdown
## Verification by Change Type

- **Frontend**: start dev server → navigate to affected page → check console errors → test responsive
- **Backend/API**: start server → curl endpoints → verify response shapes → test error handling
- **CLI**: run with typical args → run with edge cases → verify exit codes → test piping
- **Config/Infrastructure**: validate syntax → dry-run where possible → check env vars
- **Bug fixes**: reproduce original bug → verify fix → run regression tests
- **Refactoring**: existing test suite must pass unchanged → diff public API surface
```

**Adversarial probe requirement:**
```markdown
## Before Issuing PASS

Your report must include at least one adversarial probe (boundary value, concurrent request,
idempotency check, or orphan operation) and its result. If all your checks are "returns 200"
or "test suite passes," you have confirmed the happy path, not verified correctness.
```

Keep the existing report table format, verification process steps, and rules. Enhance, don't replace.

---

## Item 18: Worktree Safety in Cleanup Commands

The Claude Code source shows `ExitWorktreeTool` checks for uncommitted changes before removing a worktree. Worclaude's commands that interact with worktrees should follow this pattern.

### Check `/end` command template

**File:** `templates/commands/end.md`

If the command references worktree cleanup or session ending, add a safety check:
```markdown
Before ending a worktree session:
1. Check for uncommitted changes: `git status --porcelain`
2. If changes exist, commit or stash before proceeding
3. Never discard uncommitted work without explicit confirmation
```

### Check `/commit-push-pr` command template

**File:** `templates/commands/commit-push-pr.md`

Should already commit before any cleanup. Verify the template includes a check that all changes are committed before any PR or branch operations.

This is a light touch — add safety guidance to existing command templates, don't create new commands.

---

## Item 19: Scaffold Coordinator-Mode Skill

Create a new universal skill based on Claude Code's coordinator system prompt patterns.

### Create template file

**New file:** `templates/skills/universal/coordinator-mode.md`

```markdown
---
description: "Multi-agent orchestration patterns: when to use coordinator mode, worker prompts, parallel execution"
when_to_use: "When working with multiple agents or terminals in parallel, or when deciding how to break a large task into coordinated sub-tasks"
---

# Coordinator Mode

## When to Use Multi-Agent Coordination

Use coordinator patterns when:
- A task has independent research + implementation phases
- Multiple file areas can be worked on in parallel
- Verification should run alongside implementation
- You need to synthesize findings before directing follow-up work

Don't use coordinator patterns when:
- The task is small enough for one session
- Steps are strictly sequential with no parallelism
- The overhead of coordination exceeds the work itself

## Worker Prompt Best Practices

Workers cannot see your conversation. Every prompt must be self-contained:

**Good — synthesized spec:**
"Fix the null pointer in src/auth/validate.ts:42. The user field is undefined when
sessions expire but the token is still cached. Add a null check before user.id access.
Commit and report the hash."

**Bad — lazy delegation:**
"Based on your findings, fix the auth bug."
"The worker found an issue. Please fix it."

### Purpose Statement

Include a brief purpose so workers calibrate depth:
- "This research will inform a PR description — focus on user-facing changes."
- "I need this to plan an implementation — report file paths, line numbers, and type signatures."
- "This is a quick check before we merge — just verify the happy path."

## Continue vs Spawn Decision

| Situation | Action | Why |
|---|---|---|
| Research explored exactly the files that need editing | Continue existing worker | Worker has files in context |
| Research was broad, implementation is narrow | Spawn fresh worker | Avoid context noise |
| Correcting a failure | Continue existing worker | Worker has error context |
| Verifying code a different worker wrote | Spawn fresh worker | Fresh eyes, no implementation bias |
| Wrong approach entirely | Spawn fresh worker | Clean slate avoids anchoring |

## Parallel Execution

**Parallelism is the primary advantage.** Launch independent workers concurrently:
- Read-only tasks (research) — run in parallel freely
- Write-heavy tasks (implementation) — one at a time per set of files
- Verification can sometimes run alongside implementation on different file areas

## Scratchpad Pattern

For durable cross-worker knowledge, use a shared scratchpad file:
- Workers write findings to a known location
- Other workers read from it when they need context
- Structure files by topic, not by worker

## Multi-Terminal Workflow

When running multiple Claude Code terminals (Boris Mode):
- Each terminal works on a separate feature branch or file area
- Use /sync on develop after merging to reconcile shared-state files
- Use /conflict-resolver if merges produce conflicts
- Shared-state files (PROGRESS.md, SPEC.md, package.json version) are ONLY modified on develop
```

### Register the new skill

In `src/data/agents.js`, add `'coordinator-mode'` to the `UNIVERSAL_SKILLS` array.

Update the `init.js` skill count display and any references to skill counts.

---

## Item 20: Optimize Permission Presets Per Tech Stack

Review `templates/settings/*.json` (16 language-specific + 1 base) and add smarter per-stack permissions to reduce permission fatigue.

### Additions per stack

**`templates/settings/python.json`** — add:
```json
"Bash(pytest:*)", "Bash(python:*)", "Bash(pip:*)", "Bash(python3:*)",
"Bash(pip3:*)", "Bash(mypy:*)", "Bash(ruff:*)", "Bash(black:*)",
"Bash(isort:*)", "Bash(flake8:*)", "Bash(pylint:*)"
```

**`templates/settings/rust.json`** — add:
```json
"Bash(cargo:*)", "Bash(rustc:*)", "Bash(rustup:*)", "Bash(clippy:*)"
```

**`templates/settings/go.json`** — add:
```json
"Bash(go:*)", "Bash(golint:*)", "Bash(gofmt:*)"
```

**`templates/settings/java.json`** — add:
```json
"Bash(mvn:*)", "Bash(gradle:*)", "Bash(javac:*)"
```

**`templates/settings/kotlin.json`** — add:
```json
"Bash(gradle:*)", "Bash(kotlinc:*)"
```

**`templates/settings/ruby.json`** — add:
```json
"Bash(bundle:*)", "Bash(rake:*)", "Bash(ruby:*)", "Bash(rspec:*)", "Bash(rubocop:*)"
```

**`templates/settings/php.json`** — add:
```json
"Bash(composer:*)", "Bash(php:*)", "Bash(phpunit:*)", "Bash(phpstan:*)"
```

**`templates/settings/swift.json`** — add:
```json
"Bash(swift:*)", "Bash(swiftc:*)", "Bash(xcodebuild:*)"
```

**`templates/settings/dart.json`** — add:
```json
"Bash(dart:*)", "Bash(flutter:*)", "Bash(pub:*)"
```

**`templates/settings/elixir.json`** — add:
```json
"Bash(mix:*)", "Bash(elixir:*)", "Bash(iex:*)"
```

**`templates/settings/scala.json`** — add:
```json
"Bash(sbt:*)", "Bash(scala:*)", "Bash(scalac:*)"
```

**`templates/settings/zig.json`** — add:
```json
"Bash(zig:*)"
```

**`templates/settings/csharp.json`** — add:
```json
"Bash(dotnet:*)", "Bash(nuget:*)"
```

**`templates/settings/cpp.json`** — add:
```json
"Bash(cmake:*)", "Bash(g++:*)", "Bash(gcc:*)", "Bash(clang:*)", "Bash(clang++:*)"
```

Check which permissions already exist in each file and only add what's missing. Don't duplicate existing entries.

The philosophy from the Claude Code source: "When Claude Code asks for permission, clicking yes is a configuration failure." These additions pre-approve safe, expected commands.

---

## Verification Checklist

### Automated
```bash
npm test && npm run lint
```

### Manual
```bash
rm -rf /tmp/test-phase6 && mkdir /tmp/test-phase6 && cd /tmp/test-phase6 && git init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
```

- [ ] MEMORY.md offered during init (confirm No, verify not created; confirm Yes, verify created)
- [ ] Coordinator-mode skill scaffolded as `.claude/skills/coordinator-mode/SKILL.md`
- [ ] Verify-app agent body has structured VERDICT output, anti-rationalization section, type-specific strategies
- [ ] `/end` command mentions worktree safety check
- [ ] Selected stack permissions include stack-specific commands (e.g., Python → pytest, cargo for Rust)
- [ ] `worclaude doctor` passes all checks

---

## Do NOT Change in This Phase

- Existing skill/agent frontmatter (done in Phases 2-3)
- `doctor.js` (done in Phase 4)
- `upgrade.js` (done in Phase 5)
- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files)
