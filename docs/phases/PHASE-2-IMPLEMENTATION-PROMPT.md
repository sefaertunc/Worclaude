# Phase 2 — Next Release Implementation

## Context

You are working on **Worclaude** (`sefaertunc/Worclaude`), a Node.js CLI scaffolding tool at **v2.2.6**. You are on the `develop` branch. This phase implements new features informed by the Phase 1 diagnosis report.

**Before starting ANY implementation**, read these files to understand the current state:

```bash
# Diagnosis report (your implementation guide)
cat docs/research/PHASE-1-DIAGNOSIS-REPORT.md

# Current source architecture
cat src/data/agents.js
cat src/data/agent-registry.js
cat src/core/scaffolder.js
cat src/core/merger.js

# Current templates to understand patterns
cat templates/settings/base.json
cat templates/core/claude-md.md
ls templates/commands/
ls templates/agents/universal/
ls templates/skills/universal/

# Current tests
ls tests/
```

Also read the Claude Code hooks documentation to verify current hook event names, handler types, and JSON schemas before implementing:

```bash
# If you have web access or the leaked source:
cat /home/sefa/SEFA/GIT/claude-code-files/src/hooks/*.ts 2>/dev/null | head -200
# Otherwise search the project for existing hook patterns:
grep -r "hook" templates/settings/ --include="*.json"
```

## Implementation Plan

This phase has **8 tasks** organized by dependency order. Complete each task fully (including tests) before moving to the next. Create a feature branch from `develop` for each task, or work directly on `develop` if you prefer — follow the branching pattern in the project.

---

### Task 1: Audit and update `base.json` hook schema

**What:** Update `templates/settings/base.json` to align with Claude Code v2.1.101's 12+ hook event lifecycle.

**Why:** Worclaude currently scaffolds 3 event types (PostToolUse, PostCompact, SessionStart). Claude Code now supports 12+ event types including PreCompact, UserPromptSubmit, SessionEnd, Stop, PreToolUse, PermissionDenied, SubagentStart/Stop, Setup, Notification, CwdChanged, FileChanged, PostToolUseFailure.

**How:**

1. Read the current `templates/settings/base.json` completely.

2. Read Claude Code's hooks documentation to verify exact event names, matcher values, and JSON schema:
   - Search for the official hook event list at https://code.claude.com/docs/en/hooks or in the leaked source
   - Verify: `PreCompact` accepts matchers `manual` and `auto`
   - Verify: `SessionEnd` accepts matchers `clear`, `logout`, `prompt_input_exit`, `other`
   - Verify: `Stop` is a separate event from `SessionEnd`
   - Verify: `UserPromptSubmit` exists and receives `input.prompt`
   - Verify: `async: true` is a valid handler option
   - Verify: handler types include `command`, `http`, `prompt`, `agent`

3. Restructure `base.json` hooks to cover these events. Keep the existing hooks but fix their placement and add new ones:

   **Current hooks to FIX:**
   - The `PostToolUse` entry with `"matcher": "Stop"` is WRONG — `Stop` is its own top-level event, not a PostToolUse matcher. Move the notification command to a proper `Notification` or `Stop` event.

   **New hooks to ADD:**
   - `PreCompact`: Save current work context before compaction. Use `async: true` for the backup, but synchronous for the context re-read. Reference the diagnosis report's MemPalace pattern (Section 4.1) and pro-workflow's `pre-compact.js` pattern.
   - `Stop`: Session check — verify work state before stopping. Reference the `stop_hook_active` loop prevention pattern from the diagnosis report (MemPalace Section 4.2).
   - `UserPromptSubmit`: Placeholder for correction detection (Task 3 will add the script). For now, add the event entry with a comment or minimal script.
   - `SessionEnd`: Clean notification that session is ending. Move the current notification here.

   **Existing hooks to IMPROVE:**
   - Add `"async": true` to the notification hook (it doesn't need to block Claude).
   - Add `"async": true` to any logging/backup hooks.

4. Ensure the hook profile system (`WORCLAUDE_HOOK_PROFILE`) still works with the new events. Minimal profile should skip most hooks. Standard should run core hooks. Strict should run everything.

5. Update the corresponding code in `src/data/agents.js` or `src/core/scaffolder.js` if they reference hook event names.

6. Update any tests that validate the settings structure.

**Validation:** After changes, verify the generated `settings.json` is valid JSON and all hook event names match Claude Code v2.1.101's documented events.

---

### Task 2: Add PreCompact emergency save hook

**What:** Create a hook script template that saves current work context before compaction destroys it.

**Why:** Diagnosis report confirmed this is a critical gap. PostCompact (which Worclaude has) re-reads files AFTER compaction. PreCompact saves context BEFORE compaction — the "emergency save" pattern.

**How:**

1. Create `templates/hooks/pre-compact-save.js` (Node.js, no external dependencies).

2. The script should:
   - Read JSON from stdin (hook input format: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `trigger`, `custom_instructions`)
   - On `trigger: "auto"` (automatic compaction): write a compact state snapshot to `.claude/sessions/pre-compact-{timestamp}.md` containing:
     - Current git branch (`git rev-parse --abbrev-ref HEAD`)
     - Modified files list (`git status --porcelain`)
     - Last 3 commit messages (`git log --oneline -3`)
     - The `custom_instructions` field if present
   - On `trigger: "manual"` (`/compact`): same behavior but note it was manual
   - Exit code 0 (don't block compaction)
   - Use `async: true` in the settings entry since the backup doesn't need to block

3. Reference pro-workflow's `pre-compact.js` pattern from the diagnosis report (Section 1.4) and MemPalace's pattern (Section 4.1 — synchronous save, but we use async since we're writing to local files not an external DB).

4. Wire the script into `base.json` under the `PreCompact` event added in Task 1.

5. Update `src/core/scaffolder.js` to copy hook scripts from `templates/hooks/` to the target project's `.claude/hooks/` directory during scaffolding. Check if this path already exists in the scaffolder — if not, add the hooks directory to the scaffolding pipeline.

6. Add the hooks directory to the file manifest in `src/data/agents.js` (COMMAND_FILES, UNIVERSAL_SKILLS, or wherever output files are registered).

**Validation:** Run `worclaude init` in a test directory and verify `.claude/hooks/pre-compact-save.js` is created and `settings.json` references it.

---

### Task 3: Add correction detection and learning capture system

**What:** Implement the three-component correction system: detection (UserPromptSubmit), capture (Stop), retrieval (SessionStart). All markdown-based, no SQLite.

**Why:** This is the #1 feature gap identified across all diagnosed repos. Pro-workflow's entire differentiator is compounding corrections.

**How:**

**Component 1 — Correction detector hook (`templates/hooks/correction-detect.js`):**

1. Reads JSON from stdin (`hook_event_name: "UserPromptSubmit"`, `input.prompt`)
2. Tests the prompt against these regex patterns (adapted from pro-workflow diagnosis, Section 1.1):

   ```js
   const correctionPatterns = [
     /no,?\s*(that's|thats)?\s*(wrong|incorrect|not right)/i,
     /you\s*(should|shouldn't|need to|forgot)/i,
     /that's not what I (meant|asked|wanted)/i,
     /wrong file/i,
     /undo that/i,
     /don't do that/i,
     /actually,?\s/i,
     /I said /i,
   ];

   const learnPatterns = [
     /remember (this|that)/i,
     /add (this|that) to (your )?rules/i,
     /don't (do|make) that (again|mistake)/i,
     /learn from this/i,
     /\[LEARN\]/i,
   ];
   ```

3. If a correction or learn pattern matches, output a JSON message to stdout that injects a hint: `"[Correction detected] Consider proposing a [LEARN] block if this is a generalizable rule."`
4. Exit code 0 (never block user input)
5. Keep it lightweight — no file I/O, no network calls

**Component 2 — Learning capture hook (`templates/hooks/learn-capture.js`):**

1. Event: `Stop`
2. Reads the transcript JSONL file (path from `transcript_path` in stdin JSON)
3. Scans the last N assistant messages for `[LEARN]` blocks using this regex (from pro-workflow diagnosis, Section 1.2):
   ```js
   /\[LEARN\]\s*([\w][\w\s-]*?)\s*:\s*(.+?)(?:\nMistake:\s*(.+?))?(?:\nCorrection:\s*(.+?))?(?=\n\[LEARN\]|\n\n|$)/gim;
   ```
4. For each captured learning:
   - Create/append to `.claude/learnings/{category-slug}.md` with YAML frontmatter:
     ```yaml
     ---
     created: 2026-04-13
     category: Git Conventions
     project: my-project
     times_applied: 0
     ---
     **Rule:** Always use conventional commits
     **Mistake:** Used "fixed bug" as commit message
     **Correction:** Use "fix(auth): resolve token refresh race condition"
     ```
   - Update `.claude/learnings/index.json` (create if not exists):
     ```json
     {
       "learnings": [
         {
           "file": "git-conventions.md",
           "category": "Git",
           "created": "2026-04-13",
           "times_applied": 0
         }
       ]
     }
     ```
5. Check `stop_hook_active` — if true, exit 0 immediately (prevent infinite loops, per MemPalace diagnosis Section 4.2)
6. Exit code 0

**Component 3 — SessionStart hook update:**

1. Update the existing SessionStart hook in `base.json` to ALSO load recent learnings:
   ```bash
   echo '=== RECENT LEARNINGS ===';
   if [ -f .claude/learnings/index.json ]; then
     # Show last 5 learnings
     node -e "
       const idx = JSON.parse(require('fs').readFileSync('.claude/learnings/index.json','utf8'));
       idx.learnings.sort((a,b) => b.created.localeCompare(a.created)).slice(0,5)
         .forEach(l => console.log('- [' + l.category + '] ' + l.file));
     " 2>/dev/null
   else
     echo 'No learnings captured yet. Use [LEARN] blocks to capture corrections.';
   fi
   ```

**Component 4 — `/learn` command (`templates/commands/learn.md`):**

1. Create a slash command that explicitly triggers learning capture:

   ```markdown
   ---
   description: 'Capture a correction or convention as a persistent learning'
   ---

   The user wants to capture a learning from this session.

   Ask the user what they want to remember. Then format it as a [LEARN] block:

   [LEARN] Category: One-line rule description
   Mistake: What went wrong (optional)
   Correction: What should happen instead (optional)

   Write this to `.claude/learnings/{category-slug}.md` with YAML frontmatter:

   - created: today's date
   - category: from the [LEARN] block
   - project: current project name (from package.json, pyproject.toml, or directory name)
   - times_applied: 0

   Update `.claude/learnings/index.json` to include the new entry.

   Confirm to the user what was saved and where.
   ```

**Scaffolder updates:**

- Add `.claude/learnings/` directory creation to the scaffolding pipeline
- Add `.claude/learnings/` to `.gitignore` template (learnings are personal, not shared — same as native MEMORY.md)
- Register the hook scripts and `/learn` command in the file manifest
- Ensure `worclaude init` copies hook scripts to `.claude/hooks/`

**Validation:**

- `worclaude init` creates `.claude/hooks/correction-detect.js`, `.claude/hooks/learn-capture.js`, `.claude/commands/learn.md`, `.claude/learnings/` directory
- Hook scripts parse valid JSON from stdin and produce valid JSON/text to stdout
- Unit test: feed sample transcript JSONL with `[LEARN]` blocks to `learn-capture.js`, verify markdown output

---

### Task 4: Add split architecture instruction to CLAUDE.md template

**What:** Update `templates/core/claude-md.md` to include explicit memory architecture guidance.

**Why:** ETH Zurich research showed bloated CLAUDE.md files hurt performance in 5/8 tests. Claude Code's native MEMORY.md has a 200-line loading limit. Users must not waste CLAUDE.md space on auto-learnings.

**How:**

1. Read the current `templates/core/claude-md.md`.

2. Add a `## Memory Architecture` section (keep it under 10 lines) that instructs Claude:

   ```markdown
   ## Memory Architecture

   - This file contains static project rules and conventions. Keep it under 200 lines.
   - Do NOT write session learnings or auto-captured patterns here.
   - Use native memory (`/memory`) for auto-captured project knowledge.
   - Persistent corrections go in `.claude/learnings/` via [LEARN] blocks or `/learn`.
   - Path-scoped rules go in `.claude/rules/` with YAML frontmatter.
   - Session state goes in `.claude/sessions/` (gitignored).
   ```

3. Verify the total generated CLAUDE.md stays **well under 200 lines**. Count lines after template interpolation with a typical project.

4. Add a brief `## Learnings` pointer (2 lines max):

   ```markdown
   ## Learnings

   Corrections captured via [LEARN] blocks are in `.claude/learnings/`. SessionStart hook loads recent ones automatically.
   ```

**Validation:** Count total lines of generated CLAUDE.md for a sample project. Must be under 200.

---

### Task 5: Generate AGENTS.md alongside CLAUDE.md

**What:** When `worclaude init` scaffolds a project, also generate an `AGENTS.md` file at the project root for cross-tool compatibility.

**Why:** AGENTS.md is emerging as the universal cross-tool standard. Cursor, Codex, Copilot, and other tools read it. Free compatibility with zero effort.

**How:**

1. Search for the AGENTS.md specification to understand the expected format:
   - Check https://code.claude.com/docs/en/agents or the Claude Code docs
   - Check how ECC's AGENTS.md is structured: read `/home/sefa/SEFA/tmp/everything-claude-code/AGENTS.md` if the clone still exists
   - Check how GSD's AGENTS.md is structured: read `/home/sefa/SEFA/tmp/get-shit-done/AGENTS.md` if the clone still exists

2. Create `templates/core/agents-md.md` — a template that generates AGENTS.md from the same project context as CLAUDE.md. It should contain:
   - Project overview (same as CLAUDE.md's project section, but tool-agnostic)
   - Code style and conventions
   - Testing approach
   - Build commands
   - Key architectural decisions
   - Do NOT include Worclaude-specific workflow instructions (those are Claude Code only)

3. Update `src/core/scaffolder.js` to generate `AGENTS.md` at project root alongside `CLAUDE.md`.

4. Update `src/core/merger.js` if it handles CLAUDE.md merging — AGENTS.md should follow the same merge/backup strategy.

5. Register the new file in the scaffolding manifest.

**Validation:** `worclaude init` creates both `CLAUDE.md` and `AGENTS.md` at project root. AGENTS.md contains project-relevant information without Worclaude-specific workflow details.

---

### Task 6: Enrich agent templates

**What:** Upgrade the 5 universal agent templates with patterns identified in the diagnosis report.

**Why:** All three diagnosed repos (ECC, pro-workflow, GSD) have significantly more detailed agent instructions than Worclaude. Key gaps: confidence thresholds, worked examples, false-positive guidance, severity classification.

**How:**

1. Read ALL current agent templates:

   ```bash
   cat templates/agents/universal/plan-reviewer.md
   cat templates/agents/universal/code-simplifier.md
   cat templates/agents/universal/test-writer.md
   cat templates/agents/universal/verify-app.md
   cat templates/agents/universal/build-validator.md
   ```

2. Read the diagnosis report sections on agent instruction quality (Section 2.2, 2.5, 3.4) for specific patterns to adopt.

3. Enrich each agent:

   **plan-reviewer.md:**
   - Add a worked example showing a complete plan review (like ECC's planner Stripe subscription example)
   - Add confidence threshold: "Only flag issues you are >80% confident are real problems"
   - Add bounded revision guidance: "Maximum 3 revision cycles. If issues don't decrease between iterations, escalate to user." (GSD pattern)
   - Add must-haves verification: "Check that plan includes `must_haves` (observable truths, required artifacts, key links)" (GSD pattern)

   **verify-app.md:**
   - Add 4-level verification depth from GSD diagnosis (Section 3.4):
     - Level 1: Exists — file/function present
     - Level 2: Substantive — real implementation, not placeholder
     - Level 3: Wired — connected to rest of system (imports, routes, config)
     - Level 4: Functional — actually works when invoked
   - Add stub detection patterns: `grep -r "TODO\|FIXME\|placeholder\|not implemented" --include="*.{js,ts,py}"`
   - Add false-positive guidance: "Do not flag test fixtures, documentation examples, or commented-out code"

   **code-simplifier.md:**
   - Add confidence threshold for refactoring suggestions
   - Add "when NOT to simplify" section (hot paths, performance-critical code, stable legacy code)

   **test-writer.md:**
   - Add severity classification for missing test coverage
   - Add edge case categories from ECC's tdd-guide (8 categories)

   **build-validator.md:**
   - Add severity levels for build issues (Critical/Warning/Info)
   - Add common false-positive guidance (optional dependencies, platform-specific builds)

4. Keep each agent under 150 lines. The goal is targeted enrichment, not bloat.

5. Do NOT change agent frontmatter fields yet (that's a separate concern). Only enrich the instruction body.

**Validation:** Each agent still renders valid markdown with proper YAML frontmatter. Line counts stay under 150.

---

### Task 7: Enrich skill and command templates

**What:** Add key patterns from the diagnosis to existing skills and commands.

**How:**

1. **Add trigger phrases to all command templates.** Read each command in `templates/commands/` and append a `## Trigger Phrases` section at the bottom listing natural language phrases that should invoke the command. Example for `start.md`:

   ```markdown
   ## Trigger Phrases

   - "start a new session"
   - "begin working"
   - "load context"
   - "what changed since last time"
   ```

   Reference pro-workflow's pattern (diagnosis Section 1.6).

2. **Add `$ARGUMENTS` support** to commands that benefit from it. Update these commands to accept arguments:
   - `start.md`: `$ARGUMENTS` for specifying a task or branch focus
   - `end.md`: `$ARGUMENTS` for a brief description of what was being worked on
   - `verify.md`: `$ARGUMENTS` for specifying what to verify
   - `refactor-clean.md`: `$ARGUMENTS` for specifying scope

   Pattern from pro-workflow: add `When invoked with arguments, use them as: ...` to the command description.

3. **Add must-haves pattern to `planning-with-files.md` skill.** From GSD diagnosis (Section 3.2):

   ```markdown
   ## Must-Haves Contract

   Every plan should define must_haves:

   - **Truths**: Observable behaviors that must be true when done
   - **Artifacts**: Files that must exist with real (not placeholder) implementation
   - **Key Links**: Critical connections between artifacts (imports, routes, configs)

   These carry through from planning to execution to verification.
   ```

4. **Add gate taxonomy to `verification.md` skill.** From GSD diagnosis (Section 3.1):

   ```markdown
   ## Verification Gate Types

   - **Pre-flight**: Validate preconditions before starting (deterministic checks)
   - **Revision**: Evaluate output quality, loop back with feedback (max 3 iterations)
   - **Escalation**: Surface unresolvable issues to user (pause and present options)
   - **Abort**: Terminate to prevent damage (preserve state, report reason)
   ```

5. **Add context budget awareness to `context-management.md` skill.** From GSD diagnosis (Section 3.1):

   ```markdown
   ## Context Budget Tiers

   Monitor context usage and adjust behavior:

   - **PEAK** (>75% free): Normal operation
   - **GOOD** (50-75% free): Start being selective about file reads
   - **DEGRADING** (25-50% free): Summarize before reading new files, consider /compact
   - **CRITICAL** (<25% free): Save current state immediately, compact, reload essentials
   ```

**Validation:** All modified files have valid markdown. No broken YAML frontmatter.

---

### Task 8: Update tests and documentation

**What:** Ensure all changes are tested and documented.

**How:**

1. **Update/add tests:**
   - Test that `worclaude init` creates the new files: `.claude/hooks/`, `.claude/learnings/`, `AGENTS.md`
   - Test that `settings.json` has valid JSON with all new hook events
   - Test that hook scripts handle valid JSON input without errors
   - Test that CLAUDE.md template stays under 200 lines after interpolation
   - Test the learning capture regex against sample `[LEARN]` blocks

2. **Update docs:**
   - Update the VitePress documentation if command/skill/hook lists are documented
   - Update README.md if it lists scaffolded files or features (check current README first)
   - Do NOT update the version number yet — that happens at release time

3. **Update the backlog:**
   - Read `docs/spec/BACKLOG-v2.1.md`
   - Mark completed items (if any of these features were on the backlog)
   - Add new backlog items discovered during implementation

4. **Clean up:**
   - Run `npm test` to verify all tests pass
   - Run `npm run lint` to verify code style
   - Run `npm run format` to apply Prettier

**Validation:** `npm test` passes. `npm run lint` passes. No broken imports or missing files.

---

## Execution Order

Complete tasks in this exact order (each depends on the previous):

1. **Task 1** (base.json audit) — establishes the hook event structure everything else plugs into
2. **Task 2** (PreCompact hook) — first new hook script, establishes the hooks directory pipeline
3. **Task 3** (correction system) — builds on Task 1's UserPromptSubmit entry and Task 2's hooks pipeline
4. **Task 4** (CLAUDE.md split architecture) — references the learnings system from Task 3
5. **Task 5** (AGENTS.md) — independent but benefits from Task 4's CLAUDE.md changes
6. **Task 6** (agent enrichment) — independent, can be done in any order after Task 1
7. **Task 7** (skill/command enrichment) — independent, can be done in any order after Task 1
8. **Task 8** (tests/docs) — must be last, validates everything

## Critical Rules

- **Read the diagnosis report first** (`docs/research/PHASE-1-DIAGNOSIS-REPORT.md`) — it contains the exact patterns, regex, schemas, and comparisons you need
- **Search/verify before implementing** — check Claude Code docs or source for exact hook event names, don't assume from the diagnosis report alone
- **No external runtime dependencies** — all hook scripts must use Node.js only (already required by Claude Code). No `better-sqlite3`, no Python, no `jq`
- **Source verification** — read existing files before modifying them. Don't assume file contents from memory
- **Test after each task** — run `npm test` after completing each task to catch regressions early
- **Keep CLAUDE.md under 200 lines** — this is a hard constraint from the memory research
- **Hook scripts read JSON from stdin, write JSON/text to stdout** — follow Claude Code's hook I/O contract
- **Use `stop_hook_active` check** in any Stop hook that assigns work — prevents infinite loops
- **Respect the hook profile system** — new hooks should honor `WORCLAUDE_HOOK_PROFILE` (minimal/standard/strict)
- **Commit messages** — use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
