# Phase 4 — Backlog Features

## Context

You are working on **Worclaude** (`sefaertunc/Worclaude`). Phases 2 and 3 have been completed. You are on the `develop` branch. This phase implements selected backlog items that don't touch `src/commands/doctor.js` (Phase 3 owns that file — if running in parallel, do NOT modify it).

**Before starting, read these files:**

```bash
# Backlog — see what's tracked and what's already done
cat docs/spec/BACKLOG-v2.1.md

# Source architecture
cat src/core/scaffolder.js
cat src/data/agents.js
cat src/data/agent-registry.js

# Current templates — know what exists
cat templates/settings/base.json
ls templates/commands/
ls templates/agents/universal/
ls templates/agents/optional/
ls templates/skills/universal/
ls templates/hooks/ 2>/dev/null

# Package.json
cat package.json
```

## Tasks

Pick up these items from the backlog. Each is independent — complete and commit each before moving to the next.

---

### Task 1: Plugin.json generation

**What:** When `worclaude init` scaffolds a project, generate a `.claude-plugin/plugin.json` file that makes the output installable as a Claude Code plugin.

**Why:** The official Anthropic plugin marketplace (`anthropics/claude-plugins-official`) is live. Generating plugin.json lets users publish their Worclaude-scaffolded workflow as a shareable plugin.

**How:**

1. Search for the plugin.json specification to understand the expected format. Check:
   - The official repo structure at `anthropics/claude-plugins-official` (the README describes the format)
   - The diagnosis report's mention of plugin format (Section 2.4 in `docs/research/PHASE-1-DIAGNOSIS-REPORT.md`)
   - If the cloned ECC repo still exists at `/home/sefa/SEFA/tmp/everything-claude-code/`, check its `.claude-plugin/` directory

2. Create `templates/plugin/plugin.json` template:

   ```json
   {
     "name": "{project_name}-workflow",
     "version": "1.0.0",
     "description": "Claude Code workflow for {project_name}",
     "author": "",
     "homepage": "",
     "commands": [],
     "agents": [],
     "skills": [],
     "hooks": {}
   }
   ```

   The exact schema depends on what you find in step 1 — adapt to the real spec.

3. Update `src/core/scaffolder.js` to generate `.claude-plugin/plugin.json` during `worclaude init`. Populate the `commands`, `agents`, and `skills` arrays from the installed components.

4. Make this **optional** — add a prompt during `worclaude init` asking "Generate plugin.json for marketplace compatibility? (y/N)" defaulting to no. Or use a flag: `worclaude init --plugin`.

5. Update the backlog file to mark this item as done.

**Validation:** `worclaude init --plugin` (or answering yes to the prompt) creates `.claude-plugin/plugin.json` with valid JSON. Standard `worclaude init` without the flag does NOT create it.

---

### Task 2: Skill activation improvement via UserPromptSubmit

**What:** Improve skill auto-activation by adding a skill-matching hint to the existing `UserPromptSubmit` hook.

**Why:** Community reports Claude Code skills auto-activate only ~20% of the time. A forced-eval pattern at UserPromptSubmit achieves 84%. The hook already exists (Phase 2 added it for correction detection) — this adds skill matching alongside it.

**How:**

1. Read the current `UserPromptSubmit` hook entry in `templates/settings/base.json` and the correction-detect hook script.

2. The approach is to enhance the existing correction-detect hook (or add a second UserPromptSubmit hook entry) to ALSO check if the user's prompt keywords match any installed skill names/descriptions.

3. Create `templates/hooks/skill-hint.cjs` (or merge into the existing correction hook):
   - Read JSON from stdin (same format as correction-detect)
   - Read `.claude/skills/` directory listing
   - For each skill directory, read the first line of `SKILL.md` to get the skill name
   - Match user prompt keywords against skill names (simple word overlap, case-insensitive)
   - If a match is found, output a hint: `"[Skill hint] Consider loading skill: {skill-name}/SKILL.md"`
   - Keep it lightweight — just directory listing + keyword match, no heavy parsing

4. Wire into `base.json` as a second `UserPromptSubmit` hook entry (separate from correction detection, so each has clear responsibility).

5. Respect hook profiles: skip in `minimal` mode.

**Validation:** When a user types a prompt containing "test" or "testing", the hook should hint at the testing skill. When a prompt contains "security", it should hint at the security-checklist skill.

---

### Task 3: GTD memory template (optional scaffold)

**What:** Add an optional structured memory scaffold during `worclaude init` — a set of templated markdown files for tracking decisions, preferences, and session logs.

**Why:** The GTD memory pattern (Marc Bara) is the cleanest file-based memory architecture identified in the research: separate files for different memory types, all version-controlled.

**How:**

1. Create these template files:

   `templates/memory/decisions.md`:

   ```markdown
   # Decisions Log

   Record significant design and architectural decisions here.
   Format: date, decision, rationale, alternatives considered.

   <!-- Example:
   ## 2026-04-14: Use PostgreSQL over SQLite
   **Rationale:** Need concurrent write support and dataset will exceed 10GB.
   **Alternatives:** SQLite (too limited for concurrency), MongoDB (team unfamiliar).
   **Status:** Active
   -->
   ```

   `templates/memory/preferences.md`:

   ```markdown
   # Project Preferences

   Conventions and preferences learned during development.
   Claude's native memory captures some of these automatically.
   Use this file for team-shared preferences that should be in git.

   ## Code Style

   <!-- Add project-specific preferences here -->

   ## Tooling

   <!-- Add tooling preferences here -->

   ## Workflow

   <!-- Add workflow preferences here -->
   ```

2. Make this **optional** during `worclaude init` — add a prompt: "Scaffold structured memory files (decisions.md, preferences.md)? (y/N)" defaulting to no.

3. If yes, create these files at `docs/memory/decisions.md` and `docs/memory/preferences.md` (in git, shared with team — unlike `.claude/learnings/` which is personal and gitignored).

4. Add a pointer in the generated CLAUDE.md under the Memory Architecture section:
   ```
   - Team decisions: `docs/memory/decisions.md` (version-controlled, shared)
   ```
   Only add this line if the user opted in to the memory scaffold.

**Validation:** `worclaude init` with the memory option creates `docs/memory/` with both files. Without the option, no `docs/memory/` is created.

---

### Task 4: `disableSkillShellExecution` awareness

**What:** Make Worclaude's skill templates aware of the `disableSkillShellExecution` setting in Claude Code v2.1.101.

**Why:** When this setting is enabled, inline shell execution in skills and commands is blocked. Skills that rely on embedded bash commands will silently fail.

**How:**

1. Search for how `disableSkillShellExecution` works in Claude Code docs or source:

   ```bash
   grep -r "disableSkillShellExecution\|disableSkill" /home/sefa/SEFA/GIT/claude-code-files/src/ 2>/dev/null | head -10
   ```

2. Audit all skill templates in `templates/skills/universal/` for embedded shell commands (inline bash blocks, `Run:` directives, etc.). List which skills have them.

3. For skills that contain inline shell, add a note:

   ```markdown
   > **Note:** If `disableSkillShellExecution` is enabled in your Claude Code settings,
   > the shell commands in this skill will not execute inline. Use them as reference
   > and run them manually, or disable the setting for this project.
   ```

4. Consider whether any skill's shell commands should be moved to hook scripts instead (hooks are not affected by `disableSkillShellExecution`).

**Validation:** Each skill with embedded shell has the awareness note. No existing functionality is broken.

---

### Task 5: Explore `prompt` and `agent` hook handler types

**What:** Add at least one example of a `type: "prompt"` hook to the scaffolded configuration, demonstrating the pattern for users.

**Why:** Pro-workflow uses `type: "prompt"` with `model: "haiku"` for cheap LLM-powered validation (commit message format, secret scanning). Worclaude only scaffolds `type: "command"` hooks currently.

**How:**

1. Read Claude Code docs on prompt hooks to verify the exact schema:

   ```json
   {
     "type": "prompt",
     "prompt": "Check if this commit message follows conventional commits format: $ARGUMENTS. Reply with {\"result\": \"pass\"} or {\"result\": \"fail\", \"reason\": \"...\"}",
     "model": "haiku"
   }
   ```

   Verify: does `model` go inside the hook object? Is `$ARGUMENTS` interpolated? What's the exit/response format?

2. Add a **commented-out example** in `base.json` under a new `PreToolUse` section:

   ```json
   "PreToolUse": [
     {
       "matcher": "Bash",
       "hooks": [{
         "_comment": "Uncomment to enable LLM-powered commit message validation (uses Haiku tokens)",
         "_type": "prompt",
         "_prompt": "Check if this git commit message follows conventional commits (feat/fix/refactor/docs/test/chore). Message: $TOOL_INPUT. Reply ONLY with JSON: {\"result\":\"pass\"} or {\"result\":\"fail\",\"reason\":\"...\"}",
         "_model": "haiku"
       }]
     }
   ]
   ```

   Use underscore-prefixed keys so it's valid JSON but clearly disabled. Or use a separate example file.

   **Actually** — JSON doesn't support comments. Better approach: create a `templates/hooks/examples/prompt-hook-commit-validator.json` example file that users can copy into their settings, and reference it from the docs or a README in the hooks directory.

3. Create `templates/hooks/README.md` documenting:
   - What hooks Worclaude scaffolds and what each does
   - The three hook handler types available (command, prompt, agent)
   - The example prompt hook for commit validation
   - How to add custom hooks

**Validation:** The example is valid JSON. The README accurately describes the hook system.

---

### Task 6: Update backlog and documentation

**What:** Mark completed items, add any new backlog items discovered, update docs.

**How:**

1. Read `docs/spec/BACKLOG-v2.1.md` and mark completed items from this phase with ✅.

2. Add any new backlog items that emerged during implementation (e.g., ideas triggered by the work).

3. Update README.md if it lists features — add plugin.json, skill activation, GTD memory.

4. Update VitePress docs if applicable.

5. Run `npm test` and `npm run lint`.

6. Do NOT bump the version — that happens at release time.

**Validation:** `npm test` passes. Backlog is up to date.

---

## Execution Order

Tasks are independent. Suggested order by value:

1. **Task 1** (plugin.json) — highest strategic value for marketplace visibility
2. **Task 2** (skill activation) — highest practical value for end users
3. **Task 4** (disableSkillShellExecution) — quick, defensive improvement
4. **Task 5** (prompt hook examples) — educational, sets up future patterns
5. **Task 3** (GTD memory) — optional scaffold, lowest priority
6. **Task 6** (docs/backlog) — always last

## Critical Rules

- **Do NOT modify `src/commands/doctor.js`** — Phase 3 owns that file. If running in parallel, conflicts here would be painful.
- **Read existing files before modifying** — especially `src/core/scaffolder.js` and `src/data/agents.js` which Phase 2 modified
- **Search/verify Claude Code specs** before implementing — don't assume plugin.json format or prompt hook schema from the research alone
- **Optional features default to off** — plugin.json and GTD memory are opt-in during `worclaude init`
- **No new runtime dependencies** — everything uses Node.js only
- **Test after each task** — `npm test`
- **Commit messages** — conventional commits: `feat:`, `docs:`, etc.
- **If a task's scope turns out larger than expected**, implement the minimum viable version and note what's left for future work
