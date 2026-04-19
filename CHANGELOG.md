# Changelog

All notable changes to worclaude are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/). Older releases (pre-2.3.0) are documented in [docs/spec/PROGRESS.md](./docs/spec/PROGRESS.md) and the [GitHub releases page](https://github.com/sefaertunc/Worclaude/releases).

## [Unreleased]

## [2.4.7] — 2026-04-20

Bug fix release — the learn-capture Stop hook writes `.claude/.stop-hook-active` as a runtime re-entry guard, but the scaffolded `.gitignore` never covered it. Every project scaffolded or upgraded to 2.4.6 saw a dirty `git status` right after the Stop hook fired. `worclaude delete` also left the now-stale line in `.gitignore`. Both are fixed symmetrically.

### Fixed

- `worclaude init` and `worclaude upgrade` now append `.claude/.stop-hook-active` to `.gitignore`. Pre-v2.4.7 installs pick up the missing entry on the next `upgrade`.
- `worclaude delete` now removes the `.claude/.stop-hook-active` line from `.gitignore` alongside the other worclaude entries. `.claude-backup-*/` and `.claude/learnings/` remain intentionally preserved so personal/backup content stays ignored after uninstall.

### Changed

- `docs/reference/configuration.md` — gitignore entries reference now lists all 7 entries (previously out of date — missing `.claude/learnings/` too) with a one-line note on the stop-hook flag.

## [2.4.6] — 2026-04-19

Bug fix release — `worclaude upgrade` was silently no-oping when the installed and CLI versions matched, even when on-disk files were missing. `worclaude doctor` flagged drift, but the upgrade command refused to reconcile it. This release adds a drift-repair pass to `upgrade` and exposes new flags.

### Fixed

- `upgrade` now repairs on-disk drift (files listed in `workflow-meta.json` `fileHashes` but missing from disk) instead of pruning their hash entries. When versions match and drift exists, `upgrade` enters a "Repair-only" flow (preview → confirm → apply), version unchanged. When the installation is clean, behavior is unchanged — `Already up to date (vX.Y.Z)` and exit.
- Hook scripts (`.claude/hooks/*.{cjs,js}`) and `AGENTS.md` (tracked as `root/AGENTS.md`) are now part of `buildTemplateHashMap`, so missing copies are detected and restored. Pre-v2.4.6 installs pick them up via the `newFiles` path on first upgrade. User-edited copies on disk with no corresponding `fileHashes` entry are preserved — a `.workflow-ref` sidecar is written instead of overwriting.
- `.claude/learnings/` directory is re-created (with `.gitkeep`) when missing.
- When `CLAUDE.md` lacks memory-architecture guidance keywords, `CLAUDE.md.workflow-ref.md` is written alongside with suggested additions. `CLAUDE.md` itself is never auto-modified.

### Added

- `worclaude upgrade --dry-run` — preview repair + template changes without writing.
- `worclaude upgrade --yes` — skip confirmation prompts (useful in CI / scripted flows).
- `worclaude upgrade --repair-only` — restore missing files without applying template updates, even when versions differ.
- New `src/core/drift-checks.js` module (`hasClaudeMdMemoryGuidance`, `ensureLearningsDir`, `writeMemoryGuidanceSidecar`) shared by `doctor` and `upgrade` so keyword checks stay aligned.
- New `src/core/variables.js` module — extracted `LANGUAGE_COMMANDS` / `buildCommandsBlock` from `init.js` and added `buildAgentsMdVariables(meta, projectRoot)` for repair flows. `init.js` now imports from it.

### Changed

- `categorizeFiles` now returns `missingExpected` and `missingUntracked` instead of a single `deleted` array. `diff.js` renders them as "Missing (will be restored by upgrade)" and "Deleted (removed in current version)" respectively. `upgrade.js` only prunes hashes for `missingUntracked`.
- `doctor.js` `checkClaudeMdMemoryGuidance` now points users to the sidecar flow: `"Run worclaude upgrade to write a CLAUDE.md.workflow-ref.md sidecar with suggested additions."`
- `computeFileHashes` now also hashes `AGENTS.md` at the project root (as `root/AGENTS.md`) so freshly-initialized projects track it from the start.

## [2.4.5] — 2026-04-19

Internal CI tooling patch. No change to the scaffolded output or the npm package surface — `worclaude init` / `upgrade` produce identical output to 2.4.4.

### Changed

- All three GitHub Actions workflows (`ci.yml`, `deploy-docs.yml`, `upstream-check.yml`) bumped past the Node.js 20 runtime deprecation. GitHub is force-running Node 20 actions on Node 24 starting 2026-06-02 and removing Node 20 from runners on 2026-09-16. Target versions (all ship a Node 24 runtime): `actions/checkout@v4 → @v6`, `actions/setup-node@v4 → @v6`, `actions/configure-pages@v4 → @v6`, `actions/deploy-pages@v4 → @v5`, `actions/upload-pages-artifact@v3 → @v5`. `setup-node@v6` limits automatic caching to npm, but every usage already sets `cache: 'npm'` explicitly — no-op. `anthropics/claude-code-action` (Docker action, SHA-pinned per v2.4.3 policy) is unaffected and untouched.
- `docs/reference/upstream-automation.md` — new **2.4.5** entry in the "Version history" section recording the supporting-action bump in `upstream-check.yml` and reaffirming that the SHA-pinned Anthropic action was not touched.

## [2.4.4] — 2026-04-19

Docs-only patch. Adds an Acknowledgments section to the README crediting 13 community sources that informed Worclaude's design.

### Added

- `README.md` — new `## Acknowledgments` section listing upstream inspirations (Boris Cherny's patterns, everything-claude-code, Karpathy's coding principles, pro-workflow, Anthropic Engineering Blog, awesome-claude-code, awesome-claude-code-toolkit, claude-skills-cli, SuperClaude, ccusage / claude-devtools, claude-flow, Vercel SkillKit, claude-code-templates). Footer line preserved.

## [2.4.3] — 2026-04-18

Hygiene patch closing three drifts surfaced by the 2026-04-18 anthropic-watch feed audit, plus a packaging fix. No user-facing CLI surface change; `worclaude init` / `upgrade` produce identical output to 2.4.1.

### Added

- `worclaude doctor` now recognizes the 7 hook events introduced since Claude Code 2.1.101: `TaskCreated`, `TaskCompleted`, `StopFailure`, `InstructionsLoaded`, `ConfigChange`, `Elicitation`, `ElicitationResult`. `VALID_HOOK_EVENTS` grew from 20 to 27 — matching `docs/reference/hooks.md` and `docs/spec/SPEC.md`, which already documented 27.
- `worclaude doctor` warns on agents declaring `claude-sonnet-4` / `sonnet-4` (Anthropic retires these model IDs on 2026-06-15).
- New `docs/spec/BACKLOG-v2.1.md` entry — "Sandbox defaults in scaffolded settings" — captures open design questions for scaffolding the Claude Code 2.1.113 `sandbox.network.deniedDomains` feature in a future minor.
- `docs/reference/upstream-automation.md` — new "Action pinning" policy paragraph and "Version history" section (2.4.0 → 2.4.3).

### Changed

- `.github/workflows/upstream-check.yml` — `anthropics/claude-code-action` pinned from floating `@v1` to commit SHA `38ec876110f9fbf8b950c79f534430740c3ac009` (v1.0.101). Closes the pre-existing `TODO(security):` comment in the workflow. Feed content is untrusted user input; floating `@v1` let any future action release run unreviewed against the repo's `CLAUDE_CODE_OAUTH_TOKEN`.
- `src/commands/doctor.js` version-stamp comment refreshed from v2.1.101 to v2.1.114. `Setup` retained in the hook event set with an inline rationale comment (older worclaude scaffolds may still declare it).
- `package.json` — `bin.worclaude` path normalized from `./src/index.js` to `src/index.js` to silence a cosmetic `npm publish` warning. The installed binary is unchanged; npm already normalized the value at publish time.

## [2.4.1] — 2026-04-18

Internal CI tooling — no change to the scaffolded output or npm package surface.

### Added

- Daily `upstream-check` GitHub Actions workflow (09:30 UTC cron) that fetches the anthropic-watch feeds, diffs against committed state, and opens a GitHub issue when a Worclaude-relevant change appears. Completes the emit half of the anthropic-watch integration ([#69](https://github.com/sefaertunc/Worclaude/pull/69)).
- `scripts/upstream-precheck.mjs` — zero-dep Node 20 parallel feed fetch with 10s timeout, Set-based delta detection, 90-day firstSeen prune, and a 3-strike feed-unreachable watchdog with auto-recovery.
- `scripts/upstream-parse.mjs` — reads `claude-code-action` execution JSONL, applies a strict `SKIP_ISSUE` / `# Title:` / `# Body` contract with a plaintext fallback.
- `scripts/_gha-outputs.mjs` — shared zero-dep GitHub Actions helpers.
- `.github/upstream-state.json` — schema v2 state file (seeded from live `all.json`); every mutation gated on `github.ref == 'refs/heads/main'` so feature-branch dispatches stay read-only.
- `tests/fixtures/upstream/` — four parser fixtures (skip, issue, malformed, plaintext-fallback).
- `docs/reference/upstream-automation.md` — operations runbook and required branch-protection settings for the workflow.

### Changed

- `docs/reference/slash-commands.md` — cross-link to the new upstream-automation reference page.
- `docs/.vitepress/config.mjs` — sidebar entry for upstream-automation; `phases/**` added to `srcExclude`.

### Removed

- `docs/research/PHASE-1-DIAGNOSIS-REPORT.md` — retired investigation scratchpad (preserved in git history).

## [2.4.0] — 2026-04-16

Worclaude 2.4.0 adds **upstream awareness**: every scaffolded project now ships a `/upstream-check` command and an `upstream-watcher` universal agent that consume the [anthropic-watch](https://github.com/sefaertunc/anthropic-watch) feeds at runtime (16 Anthropic sources — Claude Code releases, SDK changelogs, docs, engineering blog, status page, and more) and report what's new, what's critical, and what affects the current project. No new npm dependencies — fetching happens via `curl` inside Claude Code.

### Added

- `/upstream-check` command (scaffolded template) — on-demand, stateless status check. Fetches `run-report.json` and `all.json`, reports source health (`Y/16 healthy`) and the 10 most recent items grouped by category, and flags items from `claude-code-releases`, `claude-code-changelog`, `npm-claude-code`, `agent-sdk-ts-changelog`, or `agent-sdk-py-changelog` as `[CRITICAL]`. Graceful fetch-failure handling.
- `upstream-watcher` universal agent — deep upstream impact analysis (Sonnet, `isolation: none`, read-only: `disallowedTools: [Edit, Write, NotebookEdit]`). Cross-references new upstream items against the project's scaffolded `.claude/` surface area (agents, commands, hooks, skills, settings) and produces a three-part report: direct impact, informational, recommended actions. Feeds fetched in parallel to bound worst-case latency by a single `--max-time`.
- Agent routing entry for `upstream-watcher` (manual trigger, Stage 1: Context, `/upstream-check` as the paired command).
- Worclaude-internal `.claude/commands/upstream-check.md` (dogfood) — same fetch/flag behavior as the scaffolded template, plus a Worclaude-specific cross-reference layer that checks each `[CRITICAL]` item against `src/data/agents.js`, `src/data/agent-registry.js`, `src/core/scaffolder.js`, `src/core/merger.js`, `templates/hooks/*.cjs`, `docs/spec/BACKLOG-v2.1.md`, `templates/skills/universal/*.md`, and `CLAUDE.md` Critical Rules. Each cross-reference classified as Action needed / No impact detected / Needs investigation.

### Changed

- `UNIVERSAL_AGENTS` 5 → 6, `COMMAND_FILES` 17 → 18, `AGENT_REGISTRY` 25 → 26. Manifest audit tests and `init` / `merger` / `agent-routing` generator tests updated to iterate over `UNIVERSAL_AGENTS` instead of hardcoded lists — adding future universals no longer requires updating those tests.
- Stale literal counts dropped from `src/data/agent-registry.js` doc-comment and Universal section header so they stop drifting.

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
