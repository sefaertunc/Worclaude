# Phase 5 — End-to-End Audit

## Context

You are working on **Worclaude** (`sefaertunc/Worclaude`). Phases 2, 3, and 4 are complete. You are on the `develop` branch. This phase is a comprehensive audit that validates everything works together, catches inconsistencies between files, and adds a few targeted refinements discovered during the research phases.

This phase is both **validation** (find and fix problems) and **refinement** (small, high-value additions that don't justify their own phase).

**Start by reading the current state:**

```bash
# Source of truth for what should exist
cat src/data/agents.js

# Templates that produce the scaffold
ls templates/commands/
ls templates/agents/universal/
ls templates/agents/optional/
ls templates/skills/universal/
ls templates/hooks/
cat templates/settings/base.json
cat templates/core/claude-md.md
cat templates/core/agents-md.md

# Scaffolder that wires it all
cat src/core/scaffolder.js

# Doctor that validates it
cat src/commands/doctor.js

# Tests
ls tests/
```

---

## Part A — Manifest Consistency Audit

**Goal:** Every file the scaffolder creates must be registered in the source manifests, and every manifest entry must have a corresponding template file.

### Task A1: Cross-reference all manifests against template files

1. Read `UNIVERSAL_AGENTS` from `src/data/agents.js` → verify each has a file in `templates/agents/universal/{name}.md`
2. Read `COMMAND_FILES` from `src/data/agents.js` → verify each has a file in `templates/commands/{name}.md`
3. Read `UNIVERSAL_SKILLS` from `src/data/agents.js` → verify each has a file in `templates/skills/universal/{name}.md` (or `{name}/SKILL.md` depending on current structure)
4. Read `TEMPLATE_SKILLS` → verify each has a corresponding template
5. Read `HOOK_FILES` → verify each has a file in `templates/hooks/{name}.cjs`
6. Read `AGENT_CATALOG` → verify each optional agent key has a file in `templates/agents/optional/{name}.md`

For each direction, check:
- **Forward:** manifest entry exists but template file is missing → FAIL
- **Reverse:** template file exists but isn't in any manifest → WARN (orphan file)

Document all mismatches. Fix any that are genuine errors (missing files, unregistered templates).

### Task A2: Cross-reference CLAUDE.md template references

1. Read `templates/core/claude-md.md`
2. It references skills, commands, and files by name. Verify every referenced name actually exists:
   - Skills listed under `## Skills` must exist in `UNIVERSAL_SKILLS` or `TEMPLATE_SKILLS`
   - Commands referenced must exist in `COMMAND_FILES`
   - File paths mentioned (e.g., `docs/spec/PROGRESS.md`, `.claude/learnings/`) must be created by the scaffolder

### Task A3: Cross-reference doctor checks against actual scaffold

1. Read `src/commands/doctor.js`
2. Every check that validates a file/directory must match what the scaffolder actually creates
3. Specifically verify: doctor checks for `.claude/learnings/`, `.claude/hooks/`, `.claude/sessions/`, `AGENTS.md` — does the scaffolder create all of these?
4. Doctor references `UNIVERSAL_AGENTS`, `COMMAND_FILES`, `UNIVERSAL_SKILLS` — are these the same arrays the scaffolder uses?

**Output:** List of all mismatches found, with fixes applied.

---

## Part B — Full Scaffold E2E Test

**Goal:** Run `worclaude init` in a clean directory and verify every expected file is created correctly.

### Task B1: Scaffold test for each project type

1. Create a temporary test directory: `/home/sefa/SEFA/tmp/audit-test/`
2. For each of these project type + tech stack combinations, run `worclaude init` (or simulate via the scaffolder directly if interactive prompts are problematic):
   - Node.js CLI tool
   - Python Backend/API
   - Full-stack web application (Node.js)

3. For each scaffolded project, verify:
   - `CLAUDE.md` exists and is under 200 lines
   - `AGENTS.md` exists
   - `.claude/settings.json` is valid JSON
   - `.claude/commands/` contains all `COMMAND_FILES` entries
   - `.claude/agents/` contains all `UNIVERSAL_AGENTS` entries
   - `.claude/skills/` contains all `UNIVERSAL_SKILLS` entries in directory format (`skill-name/SKILL.md`)
   - `.claude/hooks/` contains all `HOOK_FILES` entries
   - `.claude/sessions/` directory exists
   - `.claude/learnings/` directory exists
   - `docs/spec/PROGRESS.md` exists
   - `docs/spec/SPEC.md` exists
   - `workflow-meta.json` exists with correct fields

4. Run `worclaude doctor` on each scaffolded project — it should report 0 failures and minimal warnings.

### Task B2: Hook scripts validation

For each hook script in `templates/hooks/`:
1. Read the script
2. Verify it expects JSON on stdin (Claude Code hook contract)
3. Create a minimal test JSON input matching the hook's event type
4. If possible, run the script with piped test input and verify it doesn't crash:
   ```bash
   echo '{"session_id":"test","cwd":"/tmp","hook_event_name":"PreCompact","trigger":"auto"}' | node .claude/hooks/pre-compact-save.cjs
   ```
5. Verify exit code is 0 (no blocking)

### Task B3: Settings.json hook event validation

1. Read the generated `.claude/settings.json`
2. Verify all hook event names are valid Claude Code v2.1.101 events (use the list from Phase 3)
3. Verify no duplicate event entries
4. Verify `async: true` is set on notification and backup hooks
5. Verify hook profile system (`WORCLAUDE_HOOK_PROFILE`) is consistent across all entries

**Output:** Test results for each project type. Fix any failures found.

---

## Part C — CLAUDE.md Quality Audit

**Goal:** The generated CLAUDE.md must be under 200 lines, contain all critical sections, and not have stale or contradictory content.

### Task C1: Line count verification

1. For each scaffolded test project from Part B, count CLAUDE.md lines
2. FAIL if any exceed 200 lines
3. If close to limit (>180), identify what can be trimmed or moved to skills

### Task C2: Section completeness

Verify CLAUDE.md contains these sections (added across multiple phases):
- Key Files
- Tech Stack
- Commands
- Skills
- Session Protocol
- Critical Rules
- Memory Architecture
- Learnings
- Gotchas

### Task C3: Critical Rules completeness

Read the Critical Rules section. Verify it covers:
1. SPEC.md is source of truth ✓
2. Test before moving on ✓
3. Ask if ambiguous ✓
4. Read source files before writing ✓
5. Self-healing (same mistake twice → update CLAUDE.md) ✓
6. Use subagents ✓
7. Mediocre fix → scrap it ✓
8. Feature branches never modify shared-state files ✓
9. No AI attribution in commits ✓

**Add these if missing (Karpathy-derived, from research):**
10. Surgical changes only — every changed line must trace to the request. Don't "improve" adjacent code, comments, or formatting.
11. Push back when simpler approaches exist. Present alternatives, don't pick silently.
12. Transform tasks to success criteria. "Fix the bug" → "Write a failing test, then make it pass."

Verify the total CLAUDE.md still stays under 200 lines after additions.

---

## Part D — Behavioral Coverage: Coding Principles Skill (Karpathy Option A)

**Goal:** Create a unified behavioral principles skill that consolidates scattered guidance into one always-referenceable file.

### Task D1: Create `templates/skills/universal/coding-principles.md`

This skill unifies the 4 Karpathy-style principles with Worclaude's existing content. It should NOT duplicate CLAUDE.md rules — instead it provides the deeper "why" and "how" that doesn't fit in the 200-line budget.

```markdown
---
description: "Core behavioral principles for AI-assisted coding — when to ask, when to push back, when to simplify, how to make surgical changes"
when_to_use: "Always relevant. Load when starting substantive coding tasks, reviewing code, or when Claude's output feels overcomplicated or off-target."
version: "1.0.0"
---

# Coding Principles

## 1. Think Before Coding
[Pull from prompt-engineering.md assumptions section + add "present multiple interpretations"]

## 2. Simplicity First  
[Pull from prompt-engineering.md "if 200 lines could be 50" + code-simplifier's "when NOT to simplify"]

## 3. Surgical Changes
[Pull from git-conventions.md style matching + refactor-clean.md "never combine cleanup with feature work" + NEW: "every changed line traces to the request"]

## 4. Goal-Driven Execution
[Pull from verification.md closed loops + testing.md test-first + planning-with-files.md verifiable goals]
```

Each section should be 10-15 lines max. Total skill under 80 lines. It's a reference card, not a textbook.

### Task D2: Register the new skill

1. Add `'coding-principles'` to `UNIVERSAL_SKILLS` in `src/data/agents.js`
2. Create the skill directory: `templates/skills/universal/coding-principles/SKILL.md` (or match whatever format the other skills use — verify first)
3. Add a one-line pointer in `templates/core/claude-md.md` Skills section:
   ```
   - coding-principles/SKILL.md — Behavioral principles: assumptions, simplicity, surgical changes, verification
   ```
4. Verify CLAUDE.md still under 200 lines after adding this pointer

### Task D3: Reference from agent-routing

If an auto-generated agent-routing skill exists (check `src/core/scaffolder.js` for how it's built), add coding-principles to the "always relevant" section so it's surfaced for every task type.

If agent-routing is generated dynamically, add the reference in the generation logic.

---

## Part E — Template Content Quality Sweep

**Goal:** Quick scan of all template files for common problems.

### Task E1: Agent frontmatter consistency

For every agent in `templates/agents/universal/` and `templates/agents/optional/`:
1. Verify YAML frontmatter parses cleanly
2. Verify `name` matches the filename (without `.md`)
3. Verify `model` uses current values (`opus`, `sonnet`, `haiku` — not deprecated `opus-4`, `opus-4.1`)
4. Verify `description` is present and non-empty
5. Flag any agent missing `description` (invisible to Claude Code's routing)

### Task E2: Skill format consistency

For every skill in `templates/skills/universal/`:
1. Verify it's in directory format (`skill-name/SKILL.md`), not flat `.md`
2. Verify frontmatter has `description` (required for activation)
3. Verify frontmatter has `version` field (added in Phase 2)
4. Flag any skill without a `when_to_use` or `description` field

### Task E3: Command template consistency

For every command in `templates/commands/`:
1. Verify YAML frontmatter has `description`
2. Verify the file has a `## Trigger Phrases` section (added in Phase 2)
3. Verify commands that accept arguments mention `$ARGUMENTS` (added in Phase 2 for start, end, verify, refactor-clean)
4. Flag any command missing trigger phrases

### Task E4: Hook script consistency

For every hook in `templates/hooks/`:
1. Verify the file extension matches what `base.json` references (`.cjs` vs `.js` vs `.mjs`)
2. Verify the script reads from stdin (not from arguments)
3. Verify `stop_hook_active` check exists in Stop hooks
4. Verify `WORCLAUDE_HOOK_PROFILE` check exists where expected

**Output:** List of all issues found, with fixes applied.

---

## Part F — Test Suite Verification

### Task F1: Run all tests

```bash
npm test
```

Fix any failures. Every test must pass.

### Task F2: Lint check

```bash
npm run lint
```

Fix any lint errors.

### Task F3: Format check

```bash
npm run format
```

Apply formatting.

### Task F4: Test coverage assessment

Look at the test suite and identify untested areas introduced in Phases 2-4:
- Hook scripts (correction-detect, learn-capture, pre-compact-save, skill-hint)
- `/learn` command behavior
- AGENTS.md generation
- Plugin.json generation (if Phase 4 implemented it)
- Doctor new checks (Phase 3)

For each untested area, either add a test or document it as a testing gap in the backlog.

---

## Part G — Final Cleanup

### Task G1: Update backlog

Read `docs/spec/BACKLOG-v2.1.md` and update:
- Mark any newly completed items with ✅
- Add any new items discovered during audit
- Remove obsolete items

### Task G2: Update PROGRESS.md

Update `docs/spec/PROGRESS.md` to reflect current state after all phases.

### Task G3: Clean up diagnosis artifacts

- Remove cloned repos from `/home/sefa/SEFA/tmp/` if they're still there (pro-workflow, everything-claude-code, get-shit-done, mempalace, karpathy-cc)
- These were for diagnosis only and shouldn't persist

### Task G4: Final verification

Run the full validation sequence:
```bash
npm test
npm run lint
worclaude doctor  # Run on a fresh scaffold
```

Everything must pass.

---

## Execution Order

1. **Part A** (manifest consistency) — catches broken references before testing
2. **Part B** (e2e scaffold test) — validates the full pipeline
3. **Part C** (CLAUDE.md quality) — verifies the most important generated file
4. **Part D** (coding-principles skill) — the Karpathy Option A addition
5. **Part E** (template content sweep) — catches format inconsistencies
6. **Part F** (test suite) — ensures code quality
7. **Part G** (cleanup) — housekeeping

## Critical Rules

- **Fix as you go** — when you find a problem in Parts A-E, fix it immediately, don't just report it
- **Read files before claiming they're correct** — source verification, always
- **CLAUDE.md 200-line hard limit** — if any addition pushes past this, move content to skills instead
- **Don't break existing tests** — `npm test` must pass after every fix
- **Commit after each Part** — don't batch everything into one giant commit. Use conventional commits: `audit:`, `fix:`, `feat:`, `test:`
- **If Part B scaffolding requires interactive input**, use the scaffolder programmatically or create a test harness that simulates choices. Check how existing tests handle this.
- **The coding-principles skill (Part D) must be concise** — under 80 lines. It's a reference card that consolidates scattered content, not new documentation.
