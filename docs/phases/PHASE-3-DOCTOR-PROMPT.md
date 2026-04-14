# Phase 3 — Improve `worclaude doctor` Command

## Context

You are working on **Worclaude** (`sefaertunc/Worclaude`). Phase 2 has been completed, adding new hook events, correction capture system, PreCompact hook, AGENTS.md generation, enriched agents/skills/commands, and split architecture CLAUDE.md guidance. You are on the `develop` branch.

`worclaude doctor` **already exists** at `src/commands/doctor.js`. It currently checks: workflow-meta.json, CLAUDE.md (existence + char-based size), settings.json (permissions + hooks presence), agents (existence + frontmatter + completeness), commands, skills (existence + format), sessions directory, docs/spec, hash integrity, and pending review files.

This phase **adds new checks** to validate Phase 2's additions and align with Claude Code v2.1.101.

**Before starting, read these files to understand what exists:**

```bash
# The existing doctor command — read ALL of it
cat src/commands/doctor.js

# Phase 1 diagnosis (reference for what to validate)
cat docs/research/PHASE-1-DIAGNOSIS-REPORT.md

# Phase 2 outputs — what the new checks must validate
cat templates/settings/base.json
cat templates/core/claude-md.md
cat templates/core/agents-md.md 2>/dev/null
ls templates/hooks/ 2>/dev/null
cat templates/commands/learn.md 2>/dev/null

# Understand how doctor is registered
cat src/index.js
grep -n "doctor" src/index.js
```

## What's Already Covered (do NOT duplicate)

The existing doctor checks these. Do not re-implement:

- workflow-meta.json existence and field validation
- CLAUDE.md existence and char-based size (30K warn / 38K fail / 40K hard limit)
- CLAUDE.md section analysis for large files (>20KB)
- settings.json existence, JSON validity, permissions, basic hook presence (PostCompact, SessionStart)
- Agent existence (universal + optional from meta)
- Agent frontmatter (name, description required fields)
- Agent completeness scoring (optional fields percentage)
- Command file existence
- Skill existence and format (directory vs flat .md detection)
- Sessions directory existence
- docs/spec/ (PROGRESS.md, SPEC.md)
- File hash integrity
- Pending review files (.workflow-ref.md, .workflow-suggestions)

## New Checks to Add

### Task 1: CLAUDE.md line count check

The existing size check uses **character count** (30K/38K/40K). Add a separate **line count** check based on the memory research finding that Claude Code loads only the first 200 lines of MEMORY.md and ETH Zurich evidence that bloated files hurt performance.

Add a new function `checkClaudeMdLineCount(projectRoot)`:

- Count total lines (including empty)
- WARN if > 150 lines
- FAIL if > 200 lines
- Message: `"CLAUDE.md is {N} lines. Recommended max: 200. Claude Code performance degrades with bloated context files. Move domain content to .claude/rules/ or .claude/skills/."`
- This is SEPARATE from the existing char-based check — both should run

Wire it into the "Core Files" section alongside the existing `checkClaudeMdSize`.

### Task 2: CLAUDE.md memory architecture check

Add `checkClaudeMdMemoryGuidance(projectRoot)`:

- Read CLAUDE.md content
- Search for indicators that the split architecture guidance exists (Phase 2, Task 4 added this)
- Look for any of: `"memory architecture"`, `"native memory"`, `".claude/learnings"`, `"[LEARN]"`, `"/learn"`
- WARN if none found: `"CLAUDE.md has no memory architecture guidance. Auto-learnings may pollute this file. Run worclaude upgrade to add."`
- PASS if found

### Task 3: Hook event name validation

Add `checkHookEventNames(projectRoot)`:

- Read `.claude/settings.json`
- Extract all top-level keys under `hooks` (these are event names)
- Validate against Claude Code v2.1.101's documented events:
  ```js
  const VALID_HOOK_EVENTS = new Set([
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'Stop',
    'PreCompact',
    'PostCompact',
    'SessionStart',
    'SessionEnd',
    'UserPromptSubmit',
    'Notification',
    'PermissionRequest',
    'PermissionDenied',
    'SubagentStart',
    'SubagentStop',
    'Setup',
    'CwdChanged',
    'FileChanged',
    'WorktreeCreate',
    'WorktreeRemove',
    'TeammateIdle',
  ]);
  ```
- FAIL for any event name not in this set
- PASS if all valid
- Message on fail: `"Unknown hook event '{name}'. Check Claude Code docs for valid event names."`

### Task 4: Hook script file existence

Add `checkHookScriptFiles(projectRoot)`:

- Read `.claude/settings.json`
- For each hook entry with `type: "command"`, extract the `command` string
- Parse out file paths from the command (look for paths ending in `.js`, `.sh`, `.mjs`, or relative paths like `.claude/hooks/...`)
- Check if the referenced file exists on disk
- FAIL for each missing script: `"Hook references '{path}' but file does not exist"`
- PASS if all exist or no file-based hooks found

### Task 5: Key hook coverage

Add `checkKeyHookCoverage(projectRoot)`:

- Read `.claude/settings.json` hooks
- Check for presence of these critical hook events (not just PostCompact and SessionStart which are already checked):
  - `PreCompact` — WARN if missing: `"PreCompact hook missing — context may be lost during auto-compaction"`
  - `UserPromptSubmit` — WARN if missing: `"UserPromptSubmit hook missing — correction detection disabled"`
  - `Stop` — WARN if missing: `"Stop hook missing — learning capture disabled"`
- These are WARNs not FAILs because they're Phase 2 additions and older scaffolds won't have them

Update the existing `checkSettingsJson` to NOT duplicate these checks — or extract hook checks into their own section.

### Task 6: Async hook check

Add `checkHookAsync(projectRoot)`:

- Read `.claude/settings.json`
- Find hooks on `Notification`, `SessionEnd`, or any hook whose command contains "notify" or "backup" or "log"
- WARN if these hooks don't have `"async": true`: `"Hook '{event}' should use async: true — it blocks Claude unnecessarily"`
- PASS if all appropriate hooks are async or no such hooks exist

### Task 7: Deprecated model references in agents

Add `checkAgentModels(projectRoot)`:

- Read all agent .md files in `.claude/agents/`
- Parse YAML frontmatter for `model:` field
- Check against deprecated models:
  ```js
  const DEPRECATED_MODELS = [
    'opus-4',
    'opus-4.1',
    'claude-3-opus',
    'claude-3-haiku',
    'claude-opus-4',
    'claude-opus-4-1',
  ];
  ```
- WARN for each: `"Agent '{name}' uses deprecated model '{model}'. Use 'opus', 'sonnet', or 'haiku' instead."`
- PASS if no deprecated references

### Task 8: AGENTS.md existence

Add `checkAgentsMd(projectRoot)`:

- Check if `AGENTS.md` exists at project root
- WARN if missing: `"AGENTS.md not found. This file enables cross-tool compatibility (Cursor, Codex, Copilot). Run worclaude upgrade to generate."`
- This is a WARN not FAIL since it's a Phase 2 addition

### Task 9: Learnings system validation

Add `checkLearnings(projectRoot)`:

- Check `.claude/learnings/` directory exists — WARN if missing
- If exists, check `index.json`:
  - FAIL if exists but invalid JSON
  - WARN for orphaned entries (referenced files don't exist)
  - PASS with count: `"Learnings: {N} entries captured"`
- Check `.claude/learnings/` is gitignored — WARN if not

### Task 10: Gitignore coverage

Add `checkGitignore(projectRoot)`:

- Read `.gitignore` (if exists)
- Check these paths are gitignored:
  - `.claude/sessions/` — WARN if not: `"Session files contain local context and should be gitignored"`
  - `.claude/learnings/` — WARN if not: `"Learnings are personal and should be gitignored"`
- Check `.claude/settings.json` — this is a nuanced one. Read the existing codebase to understand whether Worclaude treats settings as shared or local. Only add this check if settings should be gitignored.
- To test gitignore coverage, use: `git check-ignore -q <path>` or parse `.gitignore` patterns manually

### Task 11: Wire everything into the doctor output

Add the new checks to the existing `doctorCommand()` function. Group them into the existing output sections or add new sections:

- **Core Files** section: add line count (Task 1), memory architecture (Task 2), AGENTS.md (Task 8)
- **New "Hooks" section**: hook event names (Task 3), script files (Task 4), key coverage (Task 5), async (Task 6)
- **Components** section: add deprecated models (Task 7) alongside existing agent checks
- **New "Learnings" section**: learnings validation (Task 9)
- **New "Git Integration" section**: gitignore coverage (Task 10)

Follow the existing pattern: `display.barLine()` for section headers, `printResult()` for each check.

### Task 12: Add `--json` output flag

Add a `--json` flag to the doctor command:

- When set, suppress all `console.log` output
- Collect all results into an array
- Print a single JSON object at the end:
  ```json
  {
    "version": "2.x.x",
    "path": "/path/to/project",
    "timestamp": "2026-04-14T12:00:00Z",
    "summary": { "pass": 14, "warn": 3, "fail": 0 },
    "checks": [
      { "category": "core", "status": "pass", "label": "CLAUDE.md line count: 87/200" },
      { "category": "hooks", "status": "warn", "label": "PreCompact hook missing", "detail": "..." }
    ]
  }
  ```
- Check how `src/index.js` handles command options to add the flag properly

### Task 13: Add exit codes

If not already implemented, add exit codes:

- 0: all checks pass
- 1: warnings present (no failures)
- 2: any failures

Check if the existing `doctorCommand` already returns/exits with codes. If so, ensure the new checks contribute to the exit code.

### Task 14: Tests

Add tests for the NEW checks only (existing checks presumably have tests or don't):

```
1. Line count check: CLAUDE.md with 201 lines → fail
2. Line count check: CLAUDE.md with 87 lines → pass
3. Hook event validation: invalid event name → fail
4. Hook event validation: all valid names → pass
5. Deprecated model check: agent with "opus-4.1" → warn
6. Learnings check: corrupt index.json → fail
7. Learnings check: healthy learnings dir → pass
8. --json flag produces valid JSON
```

Follow existing test patterns. Run `npm test` after.

### Task 15: Documentation

- Update VitePress docs if doctor is documented there
- Update README if it mentions doctor
- Keep changes minimal — just add the new check descriptions

## Critical Rules

- **Read the existing `doctor.js` thoroughly** before writing any code — understand its patterns, helpers (`result()`, `printResult()`), section structure, and display utilities
- **Follow the existing code style exactly** — same `result()` return format, same `printResult()` calls, same section grouping with `display.barLine()`
- **Do NOT refactor existing checks** — add new ones alongside them. If you see improvements to existing checks, note them but don't change them in this phase.
- **Read-only operation** — doctor NEVER modifies files
- **Graceful failure** — if a file can't be read, warn, don't crash
- **Fast** — all checks are synchronous filesystem reads, no network
- **Test after completion** — `npm test` must pass
- **Commit messages** — `feat(doctor): add hook event validation`, `feat(doctor): add learnings checks`, etc.
