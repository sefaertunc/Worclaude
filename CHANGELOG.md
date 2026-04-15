# Changelog

All notable changes to worclaude are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/). Older releases (pre-2.3.0) are documented in [docs/spec/PROGRESS.md](./docs/spec/PROGRESS.md) and the [GitHub releases page](https://github.com/sefaertunc/Worclaude/releases).

## [2.3.0] — 2026-04-15

Worclaude 2.3.0 expands the workflow from a setup scaffold into a full **learning system**: Claude captures corrections automatically, replays them across sessions, and now generates cross-tool rule files so switching from Claude Code to Cursor or Codex does not mean re-writing your conventions. Eight lifecycle hooks (up from three) plus a dedicated `coding-principles` reference card tighten the feedback loop between you and Claude.

### Learning loop: capture once, replay everywhere

- New `/learn <rule>` slash command writes rules to `.claude/learnings/{category}.md` with structured YAML frontmatter. Trigger phrases (`remember this`, `learn this`, `save this rule`) also invoke it.
- New `correction-detect.cjs` hook (UserPromptSubmit) watches for correction signals in your prompts — "no, that's wrong", "you forgot", "actually, …" — and surfaces a suggestion to capture the correction as a `[LEARN]` block.
- New `learn-capture.cjs` hook (Stop) scans the session transcript for `[LEARN]` blocks and persists them automatically, updating `.claude/learnings/index.json`.
- SessionStart hook now reloads the most recent learnings on every session start, so rules you captured last week are already in context when you open Claude today.
- Learnings are gitignored by default — personal to the developer, not shared. Promote a learning into CLAUDE.md when it matures into a team-wide rule.

### Hook lifecycle: 3 → 8 events

- **PreCompact** — new emergency git snapshot to `.claude/sessions/` before auto-compaction, so context truncation never loses in-flight state.
- **UserPromptSubmit** — correction detection (above) + skill-hint matcher that surfaces relevant installed skills based on token overlap with your prompt.
- **Stop** — learning capture (above) and desktop notification.
- **SessionEnd / Notification** — quiet-by-default session-end and tool-use alerts.
- Existing `SessionStart`, `PostToolUse`, `PostCompact` hooks retained and enriched.

### Cross-tool compatibility: AGENTS.md

- `worclaude init` now writes `AGENTS.md` alongside `CLAUDE.md`. Cursor, OpenAI Codex, GitHub Copilot, and other tools read `AGENTS.md`; Claude Code reads `CLAUDE.md`. Both are generated from the same source, so switching tools does not require maintaining parallel rule files.
- `worclaude upgrade` and `/sync` regenerate `AGENTS.md` when `CLAUDE.md` changes.
- `worclaude doctor` verifies `AGENTS.md` exists and flags drift.

### New universal skill: `coding-principles`

- Karpathy-derived reference card covering four behavioral principles: **Think Before Coding** (state assumptions, surface ambiguity), **Simplicity First** (minimum code, no speculative abstractions), **Surgical Changes** (touch only what traces to the request), **Goal-Driven Execution** (define success criteria up front, close the feedback loop before committing).
- Three new critical rules (10–12 in the scaffolded CLAUDE.md) enforce these principles at the always-loaded layer.

### Agent enrichment (all 25 agents)

Every agent template now includes:

- **Confidence thresholds** for when to spawn vs defer
- **Worked examples** showing input → output shape
- **Verification depth levels** (quick check vs full audit)
- **Severity classification** for findings
- New frontmatter fields: `tools`, `effort`, `color`, `permissionMode`, `mcpServers`, per-agent `hooks`, `criticalSystemReminder`, `skills`, `initialPrompt`, `memory`.

### Skill enrichment (all 12 universal skills)

- **Must-Haves Contract** (planning-with-files) — lists non-negotiable elements of a good implementation plan.
- **Gate Taxonomy** (verification) — classifies verification gates by cost and confidence.
- **Context Budget Tiers** (context-management) — explicit budgets for main-session vs subagent context.
- `version: "1.0.0"` frontmatter on all universal + template skills for future migration tracking.

### Command enrichment (17 slash commands)

- **Trigger phrases** — every command template declares natural-language triggers (e.g., `/learn` triggers on "remember this", "save this rule").
- **`$ARGUMENTS` placeholders** — `/start`, `/end`, `/verify`, `/refactor-clean` now support explicit arguments.

### Doctor improvements

- **Hook-event validation** — flags invalid event names, deprecated events, and hook handlers referencing nonexistent scripts. `BLOCKING_BY_DESIGN_EVENTS` set correctly exempts events (SessionStart, PreToolUse, etc.) that must be blocking by design and should not be flagged as needing `async: true`.
- **CLAUDE.md line budget check** — fails at the 200-line threshold so the always-loaded file stays lean.
- **Deprecated-model check** — warns when agents reference models scheduled for retirement.
- **Learnings integrity check** — validates `index.json` parses, referenced files exist, no orphans, frontmatter is well-formed.
- **Gitignore coverage** — verifies `.claude/sessions/`, `.claude/learnings/`, and backup directories are properly ignored.

### `plugin.json` generation (opt-in)

- `worclaude init` can now write a Claude Code plugin manifest. Useful for publishing your scaffolded workflow as a shareable plugin.
- Paired with `templates/hooks/README.md` and a `disableSkillShellExecution` awareness note on shell-heavy skill templates.

### GTD memory scaffold (opt-in)

- Optional structured-memory layer at `docs/memory/decisions.md` and `docs/memory/preferences.md` for teams that want a more explicit GTD-style capture than `.claude/learnings/` provides.

### Other

- Template version fields synced: all skill templates carry `version: "1.0.0"`.
- `$ARGUMENTS` placeholder added to `/start`, `/end`, `/verify`, `/refactor-clean` templates so their argument descriptions match the actual runtime substitution.
- 497 tests across 31 test files (up from 383 / 26).

### Upgrade notes

Upgrading from 2.2.x:

```bash
npm install -g worclaude@latest
cd your-project
worclaude upgrade
```

`worclaude upgrade` preserves your customizations via the partial-hash update fixed in 2.2.5. New templates (coding-principles skill, /learn command, four hook scripts, AGENTS.md) land automatically; files you modified stay untouched. Run `worclaude doctor` after upgrade to verify everything registered.

If you have customizations to files that changed in 2.3.0, `upgrade` saves the new templates as `.workflow-ref.md` sidecars for manual reconciliation — see the [Upgrading guide](https://sefaertunc.github.io/Worclaude/guide/upgrading) for the reconciliation flow.

### Breaking changes

None. All 2.3.0 changes are additive.
