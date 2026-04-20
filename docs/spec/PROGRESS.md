# PROGRESS.md

## Current Status

**Phase:** All phases complete — published on npm as `worclaude`
**Version:** 2.4.12
**Last Updated:** 2026-04-20

## Completed

- [x] Workflow design (tips analyzed, all decisions made)
- [x] SPEC.md written
- [x] CLAUDE.md written
- [x] Project structure defined
- [x] Comprehensive reference document created
- [x] Phase 1: Foundation — project setup, templates, init command
  - [x] Node.js project (package.json, dependencies, ESLint, Prettier, Vitest)
  - [x] CLI entry point with Commander.js
  - [x] All template files (agents, commands, skills, settings, SPEC variants)
  - [x] Init command — Scenario A (fresh project) with full interactive flow
  - [x] Multi-language settings merging (Python, Node, Rust, Go, Docker)
  - [x] Confirmation loop with restart/adjust
  - [x] Category-based agent selection with pre-selection from project type
  - [x] /setup command template for project interview
- [x] Phase 1 UX fixes — Round 1
  - [x] Confirmation dialog before scaffolding
  - [x] Multi-language support with formatter chaining
  - [x] Category-based agent selection with fine-tuning
- [x] Phase 1 UX fixes — Round 2
  - [x] Hints visible during selection (not after)
  - [x] Redundancy warning as confirm prompt with go-back option
  - [x] Unselected agent categories offered after fine-tuning
  - [x] Compact column spacing (removed padEnd padding)
  - [x] Next steps reordered with /setup as primary action
  - [x] SPEC.md tech stack table: comma-separated, Docker in separate row
  - [x] Stack-specific commands in CLAUDE.md (pytest, npm, cargo, go, docker)
  - [x] Template skills text points to /setup
- [x] Phase 3: Smart Merge (Scenario B) — init into existing projects
  - [x] Scenario detection: fresh / existing / upgrade (detector.js)
  - [x] Timestamped backup system: create, list, restore (backup.js)
  - [x] Three-tier merge strategy (merger.js):
    - Tier 1 (additive): missing skills, agents, commands, permissions, hooks
    - Tier 2 (safe alongside): conflicting files saved as .workflow-ref.md
    - Tier 3 (interactive): CLAUDE.md suggestions, hook conflict resolution
  - [x] CLAUDE.md analysis: detect missing sections, generate suggestions file (claude-md-merge.js)
  - [x] Hook conflict resolution prompt: keep / replace / chain (conflict-resolution.js)
  - [x] Refactored init.js: dispatcher pattern, shared prompts between Scenario A and B
  - [x] Scenario C detection: prints upgrade message when workflow-meta.json exists
  - [x] File utilities: copyDirectory, removeDirectory added to file.js
  - [x] Settings builder extracted as shared function (buildSettingsJson)

- [x] Phase 4: Upgrade & Utility Commands
  - [x] `upgrade` command (Scenario C): version comparison, file categorization, auto-update/conflict resolution, settings merge, backup-before-upgrade
  - [x] `status` command: version, dates, project config, customized files, pending review, hooks/permissions count
  - [x] `backup` command: manual backup with contents summary
  - [x] `restore` command: list backups with relative time, select, confirm, restore
  - [x] `diff` command: compare current vs installed (modified, deleted, extra, outdated, unchanged)
  - [x] Shared file-categorizer.js: buildTemplateHashMap(), categorizeFiles() reused by upgrade and diff
  - [x] Extracted mergeSettingsPermissionsAndHooks() from merger.js for upgrade reuse
  - [x] Added useDocker field to workflow-meta.json for settings rebuild during upgrade
  - [x] relativeTime() utility for backup listing display
  - [x] All placeholder commands in index.js replaced with real implementations

- [x] Phase 5: Polish & Publish
  - [x] Comprehensive README.md
  - [x] package.json npm publish fields (files, repository, author, engines, keywords)
  - [x] .gitignore cleanup (replaced Python template with Node.js-focused)
  - [x] .npmignore created (excludes tests, docs, config from package)
  - [x] Cross-platform hardening: CRLF line ending normalization in hashing
  - [x] Cross-platform hardening: path separator normalization in init.js
  - [x] Cross-platform hardening: CRLF-safe split() in claude-md-merge.js and detector.js

- [x] Post-release improvements (v1.1.0–v1.2.8)
  - [x] Expanded tech stack: 16 language options (added Java, C#, C/C++, PHP, Ruby, Kotlin, Swift, Dart, Scala, Elixir, Zig) with per-language settings templates and formatters
  - [x] Renamed project from claude-workflow to worclaude
  - [x] VitePress documentation site with interactive terminal demo
  - [x] Bold + Badges visual system restyle for CLI output
  - [x] Restore command UX: selectable list instead of confirm prompt, cancel option
  - [x] Unknown command error handling with suggestions and help output
  - [x] Graceful handling of corrupted settings.json during init merge
  - [x] User feedback when CLAUDE.md already has all recommended sections
  - [x] Skipped status display for existing PROGRESS.md and SPEC.md in fresh init
  - [x] Fix: fresh init no longer overwrites existing PROGRESS.md and SPEC.md
  - [x] Fix: shell-escaped braces in user JSON files during merge
  - [x] Fix: malformed user JSON files show clear error messages
  - [x] Fix: JSON parse error from unsafe text substitution in settings builder
  - [x] Fix: .mcp.json-only projects no longer overwritten by fresh scaffold
  - [x] Fix: confirm prompts reject random text as input
  - [x] Fix: spinner no longer animates during interactive prompts in Scenario B
  - [x] Fix: double quotes in fallback formatter command no longer break JSON
  - [x] Fix: tech stack table labels corrected in fullstack, frontend, and devops templates
  - [x] Fix: Docker edit permissions moved from base to docker-only settings
  - [x] Fix: upgrade preview shows modified files and correct hook conflicts
  - [x] Fix: upgrade post-completion summary shows customized file count
  - [x] No-memory rule added to setup interview template
  - [x] GitHub Pages deployment workflow
  - [x] `worclaude upgrade` CLI self-update: checks npm registry, offers to update before upgrading workflow files
  - [x] `worclaude --version` now reads dynamically from package.json (was hardcoded to 1.0.0)
  - [x] `worclaude status` npm version check: shows "(up to date)", "(upgrade available)", or "(CLI update available)"
  - [x] Shared `getLatestNpmVersion()` utility (src/utils/npm.js) with 5s timeout for graceful offline degradation
  - [x] `getPackageVersionSync()` added for Commander.js synchronous version display
  - [x] Fix: status no longer says "(up to date)" when workflow version is behind CLI version
  - [x] Fix: self-update EACCES error shows clean "Try: sudo npm install -g" instead of raw npm error dump
  - [x] Dynamic agent-routing.md generation: builds a comprehensive routing guide during init based on selected agents
    - [x] Agent registry (src/data/agent-registry.js): routing metadata for all 23 agents
    - [x] Generator (src/generators/agent-routing.js): buildAgentRoutingSkill() produces markdown dynamically
    - [x] Integrated into Scenario A (scaffoldFresh) and Scenario B (mergeSkills) with conflict handling
    - [x] CLAUDE.md template updated: Session Protocol reads agent-routing.md on start
    - [x] 17 new tests (13 unit + 4 integration)

- [x] CI & Branching Strategy (v1.3.2)
  - [x] GitHub Actions CI workflow: test matrix (Node 18/20/22) + Prettier format check
  - [x] CI triggers: PRs to main/develop, pushes to develop
  - [x] CONTRIBUTING.md rewritten for develop→main branching model
  - [x] commit-push-pr command updated with branch-aware PR targeting rules
  - [x] git-conventions skill updated with branching strategy section

- [x] Project Structure Cleanup (2026-03-27)
  - [x] Moved 8 SPEC templates from `templates/` root into `templates/specs/`
  - [x] Moved 4 core templates (claude-md, mcp-json, progress-md, workflow-meta) into `templates/core/`
  - [x] Updated all `readTemplate()`/`scaffoldFile()` references in init.js, merger.js, agents.js
  - [x] Updated SPEC_MD_TEMPLATE_MAP values with `specs/` prefix
  - [x] Updated scaffolder.test.js template path references
  - [x] Updated directory tree in SPEC.md documentation
  - [x] Removed stale `CLAUDE.md.manual-backup`
  - [x] PR: sefaertunc/Worclaude#1 (develop → main)

- [x] Session-end workflow fix (2026-03-27)
  - [x] Moved PROGRESS.md update from /end into /commit-push-pr as step 1 (eliminates extra commit after PR)
  - [x] Simplified /end to mid-task stops only (handoff documents, progress snapshot)
  - [x] Updated Session Protocol in CLAUDE.md and template claude-md.md
  - [x] All 4 files updated: project commands + shipped templates

- [x] Versioning & permissions cleanup (2026-03-27)
  - [x] Added versioning policy to git-conventions.md (semver rules, publish-from-main rule)
  - [x] Added critical rule #13 to CLAUDE.md (version bump + publish rules)
  - [x] Replaced 16 individual git subcommand permissions with single `Bash(git:*)` wildcard
  - [x] Added `Bash(rm:*)` to common dev tools
  - [x] Added Read permissions for src, tests, templates, docs, .claude, and common file types
  - [x] Added compound command patterns: `Bash(npm test:*)`, `Bash(npm run:*)`, `Bash(cd:*)`
  - [x] Added gotchas for git wildcard permissions and pipe/redirect prompt behavior
  - [x] All changes applied to both `.claude/settings.json` and `templates/settings/base.json`
  - [x] Integrated version bump into /commit-push-pr as step 2 (eliminates separate bump-commit-push cycle)

- [x] Template improvements (2026-03-27)
  - [x] Added generic Versioning Policy section to shipped git-conventions.md template (semver table, publish-from-primary-branch, ecosystem-agnostic steps)
  - [x] Added 3 missing universal skill references to claude-md.md template (claude-md-maintenance, prompt-engineering, subagent-usage)
  - [x] All 9 universal skills now listed in CLAUDE.md template

- [x] Delete Command (2026-03-27)
  - [x] `delete` command: remove worclaude workflow from project with safe file classification
  - [x] Hash-based file classification: unmodified (auto-delete), modified (ask user), user-owned (never delete)
  - [x] Claude Code system dir protection (projects/, worktrees/, todos/, memory/)
  - [x] Root file handling: settings.json, CLAUDE.md, .mcp.json, docs/spec/\* — ask user, default keep
  - [x] .gitignore cleanup: removes worclaude entries, keeps .claude-backup-\*/ for backup visibility
  - [x] Backup-before-delete with docs/spec/ file coverage
  - [x] Global uninstall hint (prints command instead of executing)
  - [x] Core logic in src/core/remover.js, command in src/commands/delete.js
  - [x] 39 tests covering pre-flight, cancellation, classification, removal, edge cases
  - [x] SPEC.md Delete Command section added

- [x] Multi-terminal workflow commands (2026-03-28)
  - [x] Branch-aware /commit-push-pr (skips shared-state files on feature branches)
  - [x] /sync command for post-merge updates (PROGRESS.md, SPEC.md, version)
  - [x] /conflict-resolver command for merge conflict resolution
  - [x] /end updated to mid-task handoff only
  - [x] /start updated to check for handoff files
  - [x] Session Protocol updated in CLAUDE.md and claude-md.md template

- [x] Windows compatibility (v1.5.0, 2026-03-27)
  - [x] Confirmed Claude Code runs hooks in bash (Git Bash / WSL) on Windows — Unix shell commands work without modification
  - [x] Added Windows platform notice during `worclaude init` (Git Bash requirement)
  - [x] Removed dead `FORMATTER_COMMANDS` export from agents.js (templates are the runtime source)
  - [x] Added Windows Compatibility section to hooks.md documentation
  - [x] Added Windows note to SPEC.md notification commands table
  - [x] Added Windows note to context-management.md skill template
  - [x] Added 5 cross-platform tests (Windows platform mock in merger.test.js)

- [x] Windows compatibility audit (2026-03-28)
  - [x] Full codebase audit: path handling, shell commands, line endings, temp paths, file permissions
  - [x] Fix: `cleanGitignore()` in remover.js now splits on `/\r?\n/` instead of `'\n'` (CRLF-safe)
  - [x] Fix: file.test.js uses `os.tmpdir()` instead of hardcoded `/tmp/`
  - [x] Added CRLF .gitignore test to delete.test.js

- [x] Remove AI commit signatures (v1.6.1, 2026-03-28)
  - [x] Added explicit rules to prevent Co-Authored-By trailers and "Generated with Claude Code" footers
  - [x] Applied across three layers: CLAUDE.md critical rules, git-conventions skill, commit commands
  - [x] Updated both project config and product templates (7 files total)

- [x] Docs improvements (2026-03-30)
  - [x] Removed hardcoded "53" from Boris Cherny tip references across docs, README, SPEC, PROGRESS
  - [x] Synced package-lock.json version (1.5.0 → 1.6.1)
  - [x] Replaced TerminalDemo.vue with WorkflowDemo.vue — multi-terminal workflow visualization
    - [x] 5 levels: Level 2 (2 terminals) → Level 5 (6 terminals) + Boris Mode
    - [x] Click-through step navigation with realistic Claude Code terminal output
    - [x] Keyboard navigation, arrow badges, mode badges, responsive layout

- [x] /review-changes command (v1.7.0, 2026-03-30)
  - [x] New read-only code review command — reports findings as prioritized table without modifying files
  - [x] Separate from /simplify (which triggers code-simplifier agent for automated fixes)
  - [x] Registered in COMMAND_FILES, template created, VitePress docs updated

- [x] Agent enrichment & new commands (v1.8.0, 2026-03-31)
  - [x] Phase A: Enriched all 5 universal agent templates with structured guidance, output formats, and decision frameworks
  - [x] Phase B: Added 2 new optional agents — build-fixer (quality) and e2e-runner (quality), polished optional agent templates
  - [x] Phase C: Added 3 new command templates — build-fix, refactor-clean, test-coverage
  - [x] Phase C: Added 1 new universal skill — security-checklist (OWASP-based reference checklist)
  - [x] Updated COMMAND_FILES (13→16) and UNIVERSAL_SKILLS (9→10) in agents.js
  - [x] Updated agent-registry.js with routing metadata for build-fixer and e2e-runner
  - [x] Updated CATEGORY_RECOMMENDATIONS to include new agents

- [x] Session persistence & hooks (v1.9.0, 2026-04-01)
  - [x] SessionStart hook: auto-loads CLAUDE.md, PROGRESS.md, last session summary, and current branch at session start
  - [x] PostCompact hook: re-injects CLAUDE.md and PROGRESS.md after context compaction
  - [x] Session summaries written by /commit-push-pr and /end to `.claude/sessions/`
  - [x] `.claude/sessions/` directory created during init and upgrade
  - [x] fix: .gitignore only ignores .claude/sessions/ and workflow-meta, not entire .claude directory

- [x] Drift detection in /start (v1.9.0, 2026-04-01)
  - [x] /start command detects commits since last session using session file timestamps
  - [x] Reports commit count and one-liners (max 15) as non-interpreted signals
  - [x] Supplements SessionStart hook context with git history drift
  - [x] refactor: extracted duplicated hash computation into shared `computeFileHashes()`
  - [x] fix: restored blanket .claude/ gitignore for worclaude repo

- [x] Doctor command (v1.9.0, 2026-04-01)
  - [x] `worclaude doctor` command: 4-category health check (core files, components, docs, integrity)
  - [x] Core files: workflow-meta.json, CLAUDE.md, settings.json (hooks + permissions), sessions/ directory
  - [x] Components: universal + optional agents, commands, skills, agent-routing.md
  - [x] Documentation: PROGRESS.md and SPEC.md existence
  - [x] Integrity: file hash comparison vs workflow-meta, pending .workflow-ref.md detection
  - [x] PASS/WARN/FAIL status badges per check
  - [x] fix: refactor-clean runs inline instead of spawning worktree subagent

- [x] Hook profile system (v1.9.0, 2026-04-01)
  - [x] `WORCLAUDE_HOOK_PROFILE` environment variable: minimal, standard (default), strict
  - [x] minimal: only SessionStart and PostCompact hooks (context loading)
  - [x] standard: all hooks (formatter, notification, context)
  - [x] strict: all hooks + TypeScript type checking after every edit
  - [x] Profile gates via shell case statement in hook commands
  - [x] SessionStart and PostCompact always fire (no profile gate)

- [x] End-to-end audit (v1.9.0, 2026-04-01)
  - [x] Fixed count references across templates and source
  - [x] Synced templates with current feature set
  - [x] Cleaned stale files

- [x] Documentation update (v1.9.0, 2026-04-01)
  - [x] SessionStart hook documentation in hooks.md (full section with JSON, explanation, profile behavior)
  - [x] TypeScript strict-only hook documentation in hooks.md
  - [x] Hook Profiles section in hooks.md with profile matrix table
  - [x] SessionStart in configuration.md (settings structure, table row, environment variables)
  - [x] Updated /start, /end, /commit-push-pr descriptions in slash-commands.md
  - [x] Session Persistence and Hook Profiles sections in workflow-tips.md
  - [x] Session Persistence and Doctor feature cards on docs landing page
  - [x] `worclaude doctor` verification step in getting-started.md

- [x] v2.0.0: Claude Code Runtime Integration (8 phases, 2026-04-01 to 2026-04-03)
  - [x] Phase 1: Critical fixes — skill directory format (`skill-name/SKILL.md`) + agent `description` frontmatter
  - [x] Phase 2: Skill & command frontmatter (`when_to_use`, `paths`, `description` fields)
  - [x] Phase 3: Agent frontmatter enrichment (`disallowedTools`, `background`, `maxTurns`, `omitClaudeMd`, `memory`)
  - [x] Phase 4: Doctor enhancements — CLAUDE.md size check, skill format check, agent description check
  - [x] Phase 5: Upgrade migrations — skill format migration (flat→directory) + agent frontmatter auto-patching
  - [x] Phase 6: New content — MEMORY.md template, coordinator-mode skill, verify-app upgrade, worktree safety
  - [x] Phase 7: E2E audit — verification tests, count fixes, template sync, stale file cleanup
  - [x] Phase 8: Documentation update — new claude-code-integration.md guide + 13 reference/guide page updates

- [x] v2.1.0: Post-release polish and backlog implementation (2026-04-04)
  - [x] Agent frontmatter: `criticalSystemReminder`, `skills`, `initialPrompt` fields on select agents
  - [x] Skill version fields: all 11 universal skill templates
  - [x] Doctor enhancements: agent frontmatter completeness scoring, CLAUDE.md section analysis
  - [x] Settings validation matrix: 46 tests covering all language/docker template combinations
  - [x] MEMORY.md template enrichment: structured content format
  - [x] Tech debt: removed dead code, deduplicated workflow validation, data-driven command registration
  - [x] Stale count fixes: README, CLAUDE.md, PROGRESS.md synced to actual values
  - [x] Added "What's New in v2.0.0" to README, Template Format Requirements to CONTRIBUTING.md
  - [x] Created BACKLOG-v2.1.md for future enhancements

- [x] v2.2.0: Claude Code source gap analysis (2026-04-05)
  - [x] Hooks reference: documented all 27 hook events (was 5) with matchers, exit codes, and use cases
  - [x] Hook types: documented all 4 types (command, prompt, http, agent) with per-type field tables
  - [x] Skill frontmatter: documented all 16 runtime fields (was 3) with applicability column
  - [x] Agent frontmatter: documented 6 new fields (tools, effort, color, permissionMode, mcpServers, hooks)
  - [x] CLAUDE.md @include directive and loading hierarchy documented
  - [x] Token budgets reference table added to context-management skill
  - [x] MEMORY.md template: "even when explicitly asked" exclusion nuance, memory vs plans/tasks section
  - [x] Coordinator mode: 4-phase workflow (Research → Synthesis → Implementation → Verification)
  - [x] Verify-app: added mobile, database migration, and data/ML pipeline verification types
  - [x] Removed project-root MEMORY.md scaffolding — native Claude Code memory system handles this
  - [x] Documentation version examples updated from v1.1.0 to v2.2.0 across all guide/reference pages
  - [x] README "What's New" reframed as cumulative v2.x section with v2.2.0 highlights

- [x] v2.2.2: Documentation fixes (2026-04-10)
  - [x] Permissions reference: documented Claude Code's three-tier permission model (allow/ask/deny) with evaluation order, rule types table, and ask-rule candidates — no behavior change, `mergeSettings()` already preserves user-configured ask/deny via deep copy
  - [x] CLAUDE.md Commands block: added missing `doctor` command entry (was documented in README and PROGRESS.md Stats but absent from the primary AI instructions file)
  - [x] CLAUDE.md Tech Stack: corrected stale test count (384 → 381 to match actual suite)

- [x] v2.2.3: Versioning policy — always-bump on merge (2026-04-10)
  - [x] `.claude/skills/git-conventions/SKILL.md` Versioning Policy: `docs/CI/tests/refactor` row flipped from **no bump** to **patch**; table reordered (major → minor → patch); rule of thumb rewritten to "if it landed on main, it needs a version"
  - [x] CLAUDE.md rule #13: rewritten to match — every merge to `main` gets at least a patch bump, including docs-only, CI-only, and test-only changes
  - [x] `templates/skills/universal/git-conventions.md` intentionally NOT updated — the shipped template keeps conventional semver semantics so downstream worclaude users are not forced into the always-bump model

- [x] v2.2.4: Workflow observability + community files (2026-04-10)
  - [x] Session summary templates: added `## Workflow Observability` section to `templates/commands/commit-push-pr.md` (inside the format fenced block) and reminder bullet to `templates/commands/end.md` step 3 — self-reported section captures agents invoked (explicit `@agent` + implicit via commands), slash commands used (excluding the current `/commit-push-pr` or `/end`), and verification result. Advisory, not enforced. Lets observers see whether Claude Code is actually following the scaffolded workflow.
  - [x] SPEC.md line 603: appended one sentence describing the new section so the spec does not drift from the template
  - [x] Phase spec tracked: `docs/phases/PHASE-AGENT-OBSERVABILITY.md` moved from untracked repo root into `docs/phases/` as the source-of-truth for the change
  - [x] Community health files: added `CODE_OF_CONDUCT.md` (Contributor Covenant), revised `SECURITY.md`, added `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`, added `.github/pull_request_template.md`
  - [x] Prettier excludes: `.github/` and community files excluded from `npm run format` checks
  - [x] Existing users note: `templates/commands/*.md` edits land as `.workflow-ref.md` sidecars on `worclaude upgrade` (Tier 2 merge behavior, unchanged) — existing installs require manual reconciliation

- [x] v2.2.5: Fix upgrade silent-overwrite of user customizations (2026-04-11)
  - [x] `src/commands/upgrade.js:244` previously called `computeFileHashes(projectRoot)` unconditionally at the end of every upgrade, rewriting `workflow-meta.json` stored hashes from the current on-disk state. This destroyed the distinction between "template hash at install time" and "user customization", causing subsequent upgrades with a changed template to silently auto-overwrite customizations via the `autoUpdate` path (categorizer saw `current == stored` and mistook the customization for pristine install state).
  - [x] Fix: replaced the unconditional rehash with a targeted partial update that rehashes only files the upgrade actually wrote (`autoUpdate`, `newFiles`) and removes deleted entries. `modified`, `conflict`, `unchanged`, and `userAdded` files keep their original stored hash, preserving the install-state baseline across upgrades.
  - [x] 2 new regression tests in `tests/commands/upgrade.test.js`: (1) `preserves stored hash for user-modified files` — catches the silent-overwrite bug; (2) `updates stored hash to new template hash for autoUpdate files` — companion guarding the happy path. Stashed-fix check confirmed test 1 fails without the fix while test 2 passes in both states.
  - [x] Bonus fix: old `computeFileHashes` path would have accidentally added `userAdded` files to stored hashes on first upgrade; partial update eliminates this.
  - [x] Self-healing rollout: users with already-locked-in customizations recover automatically on the next upgrade as long as on-disk ≠ stored (always true after customization). Users who already lost customizations entirely must restore from the timestamped backup that `worclaude upgrade` creates on every run (`.claude-backup-*/`).
  - [x] Real incident that triggered the fix: this project's own `.claude/skills/git-conventions/SKILL.md` always-bump customization was reverted during the 2.2.3 → 2.2.4 upgrade, detected only via diff-before-commit.

- [x] v2.2.6: Documentation overhaul (2026-04-11)
  - [x] Removed interactive demo entirely — `docs/demo/`, `docs/.vitepress/theme/` (WorkflowDemo.vue + workflow-demo-data.js + no-op theme wrapper), `docs/RECORDING-INSTRUCTIONS.md`, and the stale `docs/reference/claude-code-workflow-system.docx` binary. Also dropped the Demo nav entry from `config.mjs`, the "Try the Demo" hero action from `docs/index.md`, and the Interactive Demo links from README top/bottom. VitePress falls back to its bundled default theme automatically. −1983 lines total.
  - [x] Trimmed README.md to essentials: removed the "What's New in v2.x" section (changelog material that belongs in release notes, not the README) and the dead GIF HTML comments that referenced a never-recorded `docs/public/demo.gif`. Final README layout matches the phase-spec 7-section structure: title + badges → top links → one-paragraph description → What You Get → Quick Start → Commands → Links.
  - [x] Refreshed 15 VitePress doc pages against source: version-string sweep (`2.2.3` → `2.2.6`) across `getting-started.md`, `existing-projects.md`, `upgrading.md`, `claude-code-integration.md`, `commands.md`, and `configuration.md`; upgrade example bumped from `2.2.2 → 2.2.3` to `2.2.5 → 2.2.6`. Historical references to `v2.0.0 Migration` preserved.
  - [x] Two real content fixes caught via source cross-reference beyond the version sweep:
    - `docs/guide/claude-code-integration.md` — the Read-Only Agents table had `security-reviewer` listed as _"none (read-only by prompt)"_, but `templates/agents/optional/quality/security-reviewer.md` actually has `disallowedTools: [Edit, Write, NotebookEdit, Agent]`. Table now reflects architectural enforcement.
    - `docs/reference/claude-md.md` — the Skills section listed 14 items but was missing `coordinator-mode`, and every skill was shown in stale flat `.md` format (e.g., `context-management.md`) instead of the `name/SKILL.md` directory format that the actual generated CLAUDE.md contains. Session Protocol reference to `agent-routing.md` also updated to `agent-routing/SKILL.md`.
  - [x] The other 13 enumerated pages were verified clean — all counts of 25 agents / 16 commands / 15 skills / 8 CLI commands match source exactly. Scope addition: `docs/guide/existing-projects.md` was NOT in the phase prompt's enumerated list but is in the VitePress sidebar and had a stale `v2.2.3` line — added to scope after user approval.
  - [x] Phase spec tracked: `PHASE-DOCS-OVERHAUL-PROMPT.md` moved from untracked repo root into `docs/phases/` as the source-of-truth for the change (mirrors the v2.2.4 `PHASE-AGENT-OBSERVABILITY.md` pattern).
  - [x] PR #57 merged via merge commit (not squash) — all 4 atomic commits preserved in develop history. Validation: 383 tests passing, lint clean, `docs:build` clean at Checkpoint A (post-demo-removal), Checkpoint C (post-content-refresh), and Checkpoint D (final).

- [x] v2.3.0: Learning loop + hook expansion + AGENTS.md + coding principles (2026-04-15)
  - [x] **Phase 2 — hook expansion + correction system + AGENTS.md + template enrichment** (PR #59). Hook lifecycle expanded 3 → 8 events (added PreCompact, UserPromptSubmit, Stop, SessionEnd, Notification on top of existing SessionStart, PostToolUse, PostCompact). Four scaffolded hook scripts: `pre-compact-save.cjs` (emergency git snapshot before auto-compaction), `correction-detect.cjs` (UserPromptSubmit — regex-matches correction/learn signals in user prompts), `learn-capture.cjs` (Stop — scans transcript for `[LEARN]` blocks, persists to `.claude/learnings/` with `index.json`), `skill-hint.cjs` (UserPromptSubmit — token-overlap match between prompt and installed skill names). New `/learn` slash command for explicit rule capture. `HOOK_FILES` manifest + `scaffoldHooks()` pipeline. SessionStart hook now reloads recent learnings from `index.json`. CLAUDE.md Memory Architecture + Learnings sections added to template. `AGENTS.md` generation for cross-tool compatibility (Cursor/Codex/Copilot read the same rules). Agent enrichment across all 25 agents: confidence thresholds, worked examples, verification depth levels, severity classification, new frontmatter fields (`tools`, `effort`, `color`, `permissionMode`, `mcpServers`, per-agent `hooks`, `criticalSystemReminder`, `skills`, `initialPrompt`, `memory`). Skill enrichment: Must-Haves Contract (planning-with-files), Gate Taxonomy (verification), Context Budget Tiers (context-management). Command enrichment: trigger phrases on all 17 commands, `$ARGUMENTS` placeholders on 4 commands.
  - [x] **Phase 3 — doctor hardening** (PR #60). `readClaudeMd` helper extracted. `checkKeyHookCoverage` hardened with better error paths. Extended `--json` / exit-code test coverage. Opt-in `plugin.json` generation added during `worclaude init` (Claude Code plugin manifest, review-adjustable prompt). Optional `skill-hint` UserPromptSubmit hook added. `disableSkillShellExecution` awareness notes added to shell-heavy skill templates.
  - [x] **Phase 4 — GTD memory + backlog tracking** (PR #61). Opt-in GTD memory scaffold (`docs/memory/decisions.md` + `docs/memory/preferences.md`) with Scenario B merge support. `init.js` DRY-up and Memory Architecture detection consolidation. Prompt-hook example added (`examples/prompt-hook-commit-validator.json` in templates/hooks/) + `templates/hooks/README.md` documenting all scaffolded hooks, profiles, and handler types. `BACKLOG-v2.1.md` established as the canonical pre-release backlog; Phase 4 items marked complete. Follow-up items flagged for future phases (`--with-plugin` / `--with-memory` flags, skill-hint frontmatter enrichment, plugin-validator CI).
  - [x] **Phase 5 — coding-principles skill + Karpathy critical rules + E2E audit** (PR #62). New `coding-principles` universal skill (60 lines, under 80-line cap) consolidating four Karpathy-derived principles: Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution. Registered in `UNIVERSAL_SKILLS`. Three new Critical Rules (10–12) appended to `templates/core/claude-md.md`. Manifest consistency audit (zero failures, zero orphans). E2E scaffold validation across 3 project types (Node CLI, Python API, fullstack). Doctor fix: `checkHookAsync` no longer flags SessionStart as needing `async: true` — `BLOCKING_BY_DESIGN_EVENTS` set added covering SessionStart/PreToolUse/PostToolUse/PostToolUseFailure/UserPromptSubmit/PreCompact/PermissionRequest/Setup. Template version fields added to 3 TEMPLATE_SKILLS that lacked them. `$ARGUMENTS` placeholder added to 4 commands (start, end, verify, refactor-clean) that described args in English but omitted the token. New `pre-compact-save.test.js` (7 tests). Test suite 475 → 497.
  - [x] **Phase 6 — documentation update for v2.3.0** (PR #63). README rewritten 85 → 165 lines: banner (`assets/worclaude.png`), 6-badge row (npm version, downloads, CI tests, MIT, node≥18, Built for Claude Code), 2 sponsorship badges at `height=40` with `style=for-the-badge` (GitHub Sponsors + Buy Me a Coffee) directly under the primary badge row, 6-column stats table splitting CLI Commands (8) from Slash Commands (17), 8-subsection What You Get covering Learnings + AGENTS.md + Doctor, Quick Start with `npx worclaude init`, Why Worclaude rationale, Links to community files. New `docs/reference/learnings.md` reference page (~180 lines) covering the two-store memory architecture, three capture paths, SessionStart replay, file format, doctor integration, hook-profile matrix. All VitePress guide pages refreshed: introduction (Hooks 4 → 8 events with new Learnings/Cross-Tool/Doctor subsections), getting-started (scaffold output includes AGENTS.md + .claude/hooks/ + .claude/learnings/), claude-code-integration (new AGENTS.md + Learnings System sections, coding-principles added to always-loaded skills list), workflow-tips (3 new tips: Split Architecture, /learn, coding-principles), index.md feature cards. Sidebar updated to include Learnings. `docs/reference/commands.md`, `slash-commands.md`, `skills.md`, `claude-md.md` updated with correct counts. `package.json` description sharpened ("The Workflow Layer for Claude Code — scaffold agents, commands, skills, hooks, and memory into any project") and 4 keywords added (`claude-code-workflow`, `claude-code-scaffolding`, `hooks`, `memory`). `CHANGELOG-v2.3.0.md` drafted in `docs/phases/` with 12 user-impact-ordered highlights. Six completed `PHASE-*-PROMPT.md` files removed (2097 lines) — served their purpose, preserved in git history.
  - [x] /sync (2026-04-15): PROGRESS.md + SPEC.md + package.json version bumped 2.2.6 → 2.3.0. CHANGELOG-v2.3.0-DRAFT.md finalized and promoted to root `CHANGELOG.md` (Keep-a-Changelog format, ready to accumulate future releases). `docs/phases/` directory removed. `CHANGELOG.md` added to package.json `files` so it ships in the npm tarball.

- [x] v2.4.0: Upstream awareness + dogfood (2026-04-16)
  - [x] **PR #65 — `/upstream-check` command + `upstream-watcher` universal agent.** New generic scaffolded command (`templates/commands/upstream-check.md`) that curls the anthropic-watch feeds at runtime (16 Anthropic sources) and reports source health + the 10 most recent items with `[CRITICAL]` flagging for `claude-code-releases`, `claude-code-changelog`, `npm-claude-code`, `agent-sdk-ts-changelog`, and `agent-sdk-py-changelog`. New read-only universal agent (`templates/agents/universal/upstream-watcher.md`, Sonnet, `isolation: none`, `disallowedTools: [Edit, Write, NotebookEdit]`) that cross-references new upstream items against the project's scaffolded `.claude/` surface area and produces a direct-impact / informational / recommended-actions report. Wiring: `UNIVERSAL_AGENTS` 5 → 6, `COMMAND_FILES` 17 → 18, `AGENT_REGISTRY` 25 → 26. Three test files data-driven to iterate over `UNIVERSAL_AGENTS` instead of hardcoded lists; stale literal counts dropped from `agent-registry.js` doc-comment and section header. No new npm dependencies — fetching happens via `curl` at Claude Code runtime.
  - [x] **PR #66 — dogfood `.claude/commands/upstream-check.md`.** Worclaude-internal variant distinct from the scaffolded template: shares the fetch behavior and `[CRITICAL]` source list, adds a Worclaude-specific cross-reference section that checks each critical item against `src/data/agents.js`, `src/data/agent-registry.js`, `src/core/scaffolder.js`, `src/core/merger.js`, `templates/hooks/*.cjs`, `templates/agents/**/*.md`, `templates/commands/*.md`, `templates/skills/universal/*.md`, `docs/spec/BACKLOG-v2.1.md`, `CLAUDE.md` Critical Rules, and `package.json` (for `@anthropic-ai/*` deps). Each cross-reference classified Action needed / No impact detected / Needs investigation. Validated live: 16/16 sources healthy, 7 new items (Claude Code 2.1.110, Agent SDK TS 0.2.110, Opus/Sonnet 4.6 + Haiku 4.5 models docs update), no Worclaude impact detected for current upstream state.
  - [x] Audit passes completed pre- and post-merge for both PRs: full template quality, manifest consistency (26 registry / 6 universal / 18 commands), agent routing, live feed execution, scaffold smoke test, divergence check between template and dogfood versions. 497/497 tests pass, eslint clean.
  - [x] /sync (2026-04-16): version bumped 2.3.0 → 2.4.0 (minor — new feature). README / CLAUDE.md / SPEC.md / PROGRESS.md / docs/reference + docs/guide counts updated (25 → 26 agents, 17 → 18 commands, 5 → 6 universal). CHANGELOG `[Unreleased]` promoted to `[2.4.0]` with the dogfood entry added.

- [x] v2.4.1: Upstream automation — daily issue-opening workflow (2026-04-18)
  - [x] **PR #68 — docs backfill for v2.4.0.** Catch-up pass on the VitePress site after the v2.4.0 /sync missed it: `docs/index.md` (26 agents / 18 slash commands), `docs/guide/introduction.md` (counts + `upstream-watcher` in universal-agent list + `/upstream-check` in slash-command enumeration), `docs/reference/agents.md` (dedicated upstream-watcher section matching verify-app style + summary-table row + runtime-properties matrix row + file-listing example), `docs/reference/slash-commands.md` (new /upstream-check section with File / When / What / Key behavior columns), `docs/spec/SPEC.md` (two current-state count references bumped to 18; v2.0.0 historical phase description preserved). No code change, no version bump — landed on top of 2.4.0 as docs-only.
  - [x] **PR #69 — daily upstream-check automation.** Completes the emit half of the anthropic-watch integration. v2.4.0 shipped the manual `/upstream-check` slash command; this adds the scheduled companion that turns upstream deltas into actionable GitHub issues.
    - `.github/workflows/upstream-check.yml` (387 lines): 09:30 UTC cron. Fetches anthropic-watch feeds, diffs against committed state, invokes `anthropics/claude-code-action` with `--disallowedTools Edit Write Bash NotebookEdit` (feed content is untrusted), pushes state to `main` BEFORE opening the issue so retries cannot duplicate. Every mutation gated on `github.ref == 'refs/heads/main'` — feature-branch dispatches stay read-only diagnostics. 3-strike feed-unreachable watchdog with auto-recovery. Parse-error fallback. Rollback closes superseded untouched upstream issues.
    - `scripts/upstream-precheck.mjs`: zero-dep Node 20 parallel feed fetch (10s timeout), Set-based delta detection, 90-day `firstSeen` prune, `STATE_PATH` override for local testing. On fetch failure, bumps `consecutiveFetchFailures` in the state file directly so the counter survives skipped downstream steps.
    - `scripts/upstream-parse.mjs`: reads `claude-code-action` execution JSONL, extracts last assistant message (supports both `stream-json` and legacy shapes), applies strict `SKIP_ISSUE` / `# Title:` / `# Body` contract with plaintext fallback.
    - `scripts/_gha-outputs.mjs`: shared zero-dep GitHub Actions helpers.
    - `.github/upstream-state.json`: schema v2 state file, seeded from live `all.json`.
    - `tests/fixtures/upstream/`: four parser fixtures (skip, issue, malformed, plaintext-fallback).
    - `docs/reference/upstream-automation.md`: new reference page with operations runbook and required branch-protection settings.
    - `docs/reference/slash-commands.md`: one-line cross-link to the new page.
    - `docs/.vitepress/config.mjs`: sidebar entry; `phases/**` added to `srcExclude`.
    - `docs/research/PHASE-1-DIAGNOSIS-REPORT.md` removed (retired investigation scratchpad, preserved in git history).
  - [x] All new surface area lives in `.github/`, `scripts/`, `docs/`, and `tests/` — all excluded from the npm package. No change to scaffolded output; worclaude CLI users see nothing new.
  - [x] Validated pre-merge: 497/497 tests pass, lint clean, docs build clean, all 4 parser fixtures produce expected outputs, precheck happy + delta paths correct.
  - [x] /sync (2026-04-18): version bumped 2.4.0 → 2.4.1 (patch — CI-only tooling, no user-facing change). CHANGELOG `[Unreleased]` promoted to `[2.4.1]`.

- [x] v2.4.3: Upstream-catchup hygiene + packaging fix (2026-04-18)
  - [x] **PR #71 — close three drifts surfaced by the 2026-04-18 anthropic-watch audit.** No user-facing CLI surface change.
    - `.github/workflows/upstream-check.yml`: `anthropics/claude-code-action` pinned from floating `@v1` to commit SHA `38ec876110f9fbf8b950c79f534430740c3ac009` (v1.0.101). Closes the pre-existing `TODO(security):` comment. Feed content is untrusted user input; floating `@v1` let any future action release run unreviewed against `CLAUDE_CODE_OAUTH_TOKEN`.
    - `src/commands/doctor.js`: `VALID_HOOK_EVENTS` refreshed 20 → 27. Added `TaskCreated`, `TaskCompleted`, `StopFailure`, `InstructionsLoaded`, `ConfigChange`, `Elicitation`, `ElicitationResult`. Version-stamp comment v2.1.101 → v2.1.114. Closes drift against `docs/reference/hooks.md:222` and `docs/spec/SPEC.md` which already documented 27. `Setup` retained conservatively (older scaffolds may declare it) with inline rationale comment.
    - `src/commands/doctor.js`: `DEPRECATED_MODELS` extended with `sonnet-4` / `claude-sonnet-4` (Anthropic retires these model IDs on 2026-06-15). `claude-opus-4-6` / `claude-sonnet-4-5` left out — docs label them "legacy," not formally deprecated.
    - `docs/spec/BACKLOG-v2.1.md`: new "Sandbox defaults in scaffolded settings" section capturing open design questions for scaffolding the Claude Code 2.1.113 `sandbox.network.deniedDomains` feature (deny-list defaults, per-language overrides, merger semantics, ~8-test estimate).
    - `docs/reference/upstream-automation.md`: new "Action pinning" policy paragraph + "Version history" section (2.4.0 → 2.4.3).
  - [x] **PR #73 — packaging fix.** `package.json` `bin.worclaude` path normalized from `./src/index.js` to `src/index.js` to silence the cosmetic `npm publish` warning (npm already normalized the value at publish time; installed binary is unchanged).
  - [x] **Post-release cleanup:** per-version `RELEASE-NOTES-*.md` files removed from the repo root — release notes are published via GitHub Releases going forward, not committed as tracked files.
  - [x] Two new regression tests: `passes hook event names for Claude Code 2.1.114 additions` (covers TaskCompleted) and `warns on agents using claude-sonnet-4 (retires 2026-06-15)`. Test suite 497 → 499.
  - [x] Note on intermediate `2.4.2`: the 2.4.2 tag and npm package were published from PR #72, before PR #73 landed. The 2.4.2 and 2.4.3 GitHub Release pages were consolidated into a single `v2.4.3` release representing the full hardening pass; `2.4.2` remains on the npm registry but is superseded by `2.4.3`.
  - [x] Validated pre-merge: 499/499 tests pass, lint clean.
  - [x] /sync (2026-04-18): version bumped 2.4.2 → 2.4.3 (patch — hygiene + packaging). CHANGELOG `[Unreleased]` promoted to `[2.4.3]` (consolidates the [2.4.2] entry, which was collapsed into [2.4.3] to match the published GitHub Release narrative).

- [x] v2.4.4: README Acknowledgments section (2026-04-19)
  - [x] **PR #75 — add `## Acknowledgments` to README crediting 13 community sources** that informed Worclaude's design (Boris Cherny's patterns, everything-claude-code, Karpathy coding principles, pro-workflow, Anthropic Engineering Blog, awesome-claude-code, awesome-claude-code-toolkit, claude-skills-cli, SuperClaude, ccusage / claude-devtools, claude-flow, Vercel SkillKit, claude-code-templates). Section placed between `## Why Worclaude` and `## Links`; existing footer line preserved (Boris credited in both, intentional).
  - [x] Docs-only patch — no `src/`, `templates/`, or `.claude/` change. No new tests needed; suite stays at 499/499.
  - [x] Intentional shared-state-on-feature-branch override: README edit + `package.json` 2.4.3 → 2.4.4 + CHANGELOG `[2.4.4]` entry all landed in the same PR (maintainer decision, documented in `.claude/plans/add-an-acknowledgments-section-ethereal-rain.md`). `/sync` did NOT re-bump — package.json already at 2.4.4 on merge.
  - [x] Validated pre-merge: 499/499 tests pass, lint clean, `npm run format` no-op.
  - [x] /sync (2026-04-19): version already at 2.4.4 (no bump). PROGRESS.md header + completed entry updated. CHANGELOG `[2.4.4]` entry was written in PR #75, not promoted from `[Unreleased]`.

- [x] v2.4.5: GitHub Actions Node 20 → Node 24 runtime bump (2026-04-19)
  - [x] **PR #77 — bump every Node-20-runtime action past the upcoming GitHub runner cutover.** GitHub is force-running Node 20 actions on Node 24 starting 2026-06-02 and removing the Node 20 runtime from runners on 2026-09-16; the deprecation banner first surfaced on the 2026-04-19 manual `upstream-check` run. Five action references across three workflows now target majors that ship a Node 24 runtime:
    - `.github/workflows/ci.yml` — `actions/checkout@v4 → @v6` (×2), `actions/setup-node@v4 → @v6` (×2)
    - `.github/workflows/deploy-docs.yml` — `actions/checkout@v4 → @v6`, `actions/setup-node@v4 → @v6`, `actions/configure-pages@v4 → @v6`, `actions/upload-pages-artifact@v3 → @v5`, `actions/deploy-pages@v4 → @v5`
    - `.github/workflows/upstream-check.yml` — `actions/checkout@v4 → @v6`, `actions/setup-node@v4 → @v6`
  - [x] `anthropics/claude-code-action` (SHA-pinned at `38ec876...` = v1.0.101 per the v2.4.3 pinning policy) is a Docker action, not affected by the Node runtime deprecation, and deliberately untouched.
  - [x] `setup-node@v6` has one breaking change — automatic caching is now limited to npm — but every worclaude workflow already sets `cache: 'npm'` explicitly, so the change is a no-op.
  - [x] `docs/reference/upstream-automation.md` — new **2.4.5** entry in the "Version history" section noting the supporting-action bump and reaffirming that the SHA-pinned Anthropic action was not touched. This page is not on the shared-state list (`git-conventions.md:108`) so the edit landed on the feature branch; rule #14 was not violated.
  - [x] Intentional shared-state-on-feature-branch override: `package.json` 2.4.4 → 2.4.5 + CHANGELOG `[Unreleased]` entry landed in the same PR (plan: `.claude/plans/ok-now-plan-the-cosmic-crown.md`). `/sync` did NOT re-bump — package.json already at 2.4.5 on merge.
  - [x] Pre-merge verification: 499/499 tests pass locally and on CI (Node 18 / 20 / 22 matrix plus format-check, all green on both the initial push and the docs commit). **Zero Node 20 deprecation annotations on the run summary** — primary success signal for this change. `npm run docs:build` clean.
  - [x] /sync (2026-04-19): version already at 2.4.5 (no bump). PROGRESS.md header + completed entry updated. CHANGELOG `[Unreleased]` promoted to `[2.4.5]`.

- [x] v2.4.6: Upgrade drift repair (2026-04-19)
  - [x] **PR #79 — fix `worclaude upgrade` silently no-oping when versions match despite on-disk drift.** Discovered during dogfood: `worclaude doctor` on this repo flagged 4 missing hook scripts, `AGENTS.md`, `.claude/learnings/`, and CLAUDE.md memory guidance; `worclaude upgrade` said "Already up to date" and reconciled nothing. Root causes: (1) version-equality short-circuit at `src/commands/upgrade.js:82-85` exited before categorization; (2) `categories.deleted` was destructive — `upgrade.js:253-255` pruned `fileHashes` instead of restoring; (3) `buildTemplateHashMap` didn't know about hook scripts or root-level files, so missing entries fell through `!templateEntry`; (4) `AGENTS.md` lives outside `.claude/`, so `computeFileHashes` never hashed it.
  - [x] Dispatch rewritten: `versionMatch && !drift && !templateWork` → "Already up to date" (unchanged); `versionMatch && drift` → new "Repair-only" flow (preview → confirm → apply, version unchanged); `versionMismatch` → repair pass inserted before `autoUpdate`. `--repair-only` flag forces repair-only even on version mismatch; `--dry-run` previews without writing; `--yes` skips confirmations.
  - [x] `categories.deleted` split into `missingExpected` (restore) and `missingUntracked` (prune from tracking). `diff.js` renders them as two distinct sections: "Missing (will be restored by upgrade)" vs "Deleted (removed in current version)".
  - [x] `buildTemplateHashMap` now walks `templates/hooks/` and emits `hooks/<name>` entries (type `hook`) plus `root/AGENTS.md` (type `root-file`). Conflict-safe `newFiles` writer for these types writes `.workflow-ref<ext>` sidecars instead of overwriting pre-v2.4.6 user edits. `computeFileHashes` also hashes `AGENTS.md` at project root as `root/AGENTS.md`.
  - [x] When `CLAUDE.md` lacks memory-architecture guidance keywords, upgrade writes a `CLAUDE.md.workflow-ref.md` sidecar with suggested additions. `CLAUDE.md` itself is never auto-modified.
  - [x] New `src/core/drift-checks.js` module (shared `MEMORY_GUIDANCE_KEYWORDS` + `hasClaudeMdMemoryGuidance` + `ensureLearningsDir` + `writeMemoryGuidanceSidecar` + `readClaudeMd`). Doctor's memory-guidance WARN reworded to point at the sidecar flow; doctor imports the shared predicate so the keyword list stays aligned.
  - [x] New `src/core/variables.js` module — `LANGUAGE_COMMANDS` and `buildCommandsBlock` extracted out of `init.js`, plus `buildAgentsMdVariables(meta, projectRoot)` for repair flows. Built lazily (after the "up to date" early return) so clean installs skip `package.json` I/O on the fast path.
  - [x] Test suite 499 → 538 across 31 → 32 files: 12 new `upgrade` cases (version-match + drift → repair-only; `--dry-run` / `--yes` / `--repair-only`; learnings dir creation; CLAUDE.md sidecar write / no-write when keywords present; AGENTS.md restoration; migration-edit preserves user content and emits `.workflow-ref.md`; hash-prune preserves `missingExpected`); 14 new `drift-checks` cases; 10 new `file-categorizer` cases; updated `diff` + `doctor` assertions.
  - [x] Intentional shared-state-on-feature-branch override: `package.json` 2.4.5 → 2.4.6 + CHANGELOG `[2.4.6]` entry + SPEC.md Step 2b (Drift Repair) all landed in PR #79. Rationale: the version bump IS the release; the spec update describes the very behavior the PR adds.
  - [x] Pre-merge verification: 538/538 tests pass, ESLint clean, Prettier no-op, CLI smoke test (`--version` → 2.4.6, `upgrade --help` shows all three new flags).
  - [x] /sync (2026-04-19): version already at 2.4.6 (no bump). PROGRESS.md header + Stats (499/31 → 538/32) + this completed entry updated. CHANGELOG `[2.4.6]` entry was written in PR #79, not promoted from `[Unreleased]`.
  - [x] Known trade-off: the raw template hash for `root/AGENTS.md` never matches the installed (substituted) hash, so `AGENTS.md` is routed through the template-skill-style "skip outdated detection" path. Consequence: template updates to `templates/core/agents-md.md` will NOT flow to installed `AGENTS.md` via `autoUpdate`. Not in scope for 2.4.6; revisit if the template changes substantively (substituted-hash storage or re-scaffold-on-bump are the fix candidates).

- [x] v2.4.7: Ignore `.claude/.stop-hook-active` (2026-04-20)
  - [x] **PR #82 — `learn-capture.cjs` writes `.claude/.stop-hook-active` as a runtime re-entry guard for the Stop hook but the scaffolded `.gitignore` never covered it.** Discovered during the 2.4.6 dogfood sync: after the Stop hook fired, `git status` showed `.claude/.stop-hook-active` as untracked in every project scaffolded or upgraded to 2.4.6. Root cause: `src/core/scaffolder.js updateGitignore()` entry list and `src/core/remover.js cleanGitignore()` `REMOVE_LINES` set both hardcoded — neither was updated when `learn-capture.cjs` shipped in 2.4.1 / 2.4.6.
  - [x] `updateGitignore` entry list grew to 7 (`.claude/.stop-hook-active` added after `.claude/learnings/`). `cleanGitignore` `REMOVE_LINES` gained the same entry so `worclaude delete` cleans it up symmetrically.
  - [x] `docs/reference/configuration.md` — gitignore entries reference updated. The table was also missing `.claude/learnings/` (pre-existing stale entry from 2.4.1); both are now listed with a one-line note on what the stop-hook flag is for.
  - [x] This repo's own `.gitignore` synced to the new scaffolder list so the dogfood matches what new users see.
  - [x] Test updates: `scaffolder.test.js` entry-count assertion 6 → 7 with new `.stop-hook-active` assertions in the create / append / missing-only / migrate cases; `delete.test.js` cleanup assertion extended. 538 tests pass (unchanged — assertions added, no new tests).
  - [x] Dogfood-sync commit for v2.4.6 (`b0124a4`) also rode in on this merge window: 4 new hook scripts landed in `.claude/hooks/`, `AGENTS.md` added at repo root, `CLAUDE.md` gained a Memory Architecture section, sidecar `CLAUDE.md.workflow-ref.md` merged then deleted.
  - [x] Pre-merge verification: 538/538 tests pass, ESLint clean, `npm run docs:build` clean. Manual scenario-A on fresh repo confirmed `git status` stays clean after simulating a Stop-hook write.

- [x] v2.4.8: `worclaude doctor` false positive on `root/AGENTS.md` (2026-04-20)
  - [x] **PR #84 — fix `checkHashIntegrity` resolving every `fileHashes` key under `.claude/`.** Discovered during 2.4.7 dogfood: `worclaude doctor` reported `File integrity: 1/54 files missing` on a clean install. Root cause: `src/commands/doctor.js:537` joined every key as `path.join(projectRoot, '.claude', ...relPath.split('/'))`, so `root/AGENTS.md` (tracked since 2.4.6) was looked up at `.claude/root/AGENTS.md` instead of the project root. `worclaude upgrade` already routes all keys through `resolveKeyPath` in `file-categorizer.js`; doctor never got the memo.
  - [x] `doctor.js` imports `resolveKeyPath` and drops the hardcoded `.claude/` prefix. No behavior change for `agents/`, `commands/`, `skills/`, `hooks/` keys; `root/<path>` now resolves at project root.
  - [x] Fixture hygiene: `tests/commands/doctor.test.js scaffoldProject()` now hashes `AGENTS.md` as `root/AGENTS.md` (matching real installs — previously the fixture wrote the file but skipped the hash, which is why the "passes all checks" test never caught this). Added an explicit regression test asserting doctor reports `all N files present` and NOT `X/N files missing` when `root/` keys are present.
  - [x] `docs/reference/configuration.md` — the `fileHashes` example was missing `hooks/` and `root/` entries, and the description claimed scope was "all files in `.claude/`" which stopped being true in 2.4.6. Example now includes both prefixes plus a one-line note describing the key-prefix vocabulary (`hooks/<name>` → `.claude/hooks/<name>`; `root/<path>` → project root).
  - [x] Pre-merge verification: 539/539 tests pass (+1 regression test), ESLint clean, `npm run docs:build` clean. Manual: `node src/index.js doctor` on this repo now reports `File integrity: 4/54 files customized (expected)` with no FAIL — previously `1/54 files missing`.

- [x] v2.4.9: `upstream-check` workflow OIDC permission (2026-04-20)
  - [x] **PR #86 — grant `id-token: write` so `anthropics/claude-code-action` can exchange OIDC for a GitHub App token.** The 2026-04-20 scheduled run failed three OIDC retries with `Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable`. Root cause: `claude-code-action` has two independent auth layers — a GitHub App token obtained by exchanging a workflow OIDC token at `api.anthropic.com/api/github/github-app-token-exchange`, and an Anthropic API credential (`CLAUDE_CODE_OAUTH_TOKEN`). OIDC is mandatory for layer 1 regardless of layer 2, verified against `src/github/token.ts` at pinned SHA `38ec876` (v1.0.101). Prior runs succeeded intermittently because GitHub does not consistently inject `ACTIONS_ID_TOKEN_REQUEST_URL` when no job in a run declares `id-token: write` — documented flake in upstream issues `#701` and `#814`.
  - [x] `.github/workflows/upstream-check.yml` — adds `id-token: write` alongside existing `contents: write` and `issues: write`. Matches the canonical [examples/claude.yml](https://github.com/anthropics/claude-code-action/blob/main/examples/claude.yml) template.
  - [x] `docs/reference/upstream-automation.md` — permissions row in "How It Runs" updated from two to three permissions with a one-line note explaining the OIDC requirement.
  - [x] Pre-merge verification: YAML parse OK. `gh workflow run upstream-check.yml --ref fix/upstream-check-id-token-permission` confirmed the OIDC phase now passes (`OIDC token successfully obtained`). The follow-on `App token exchange failed: 401 Workflow validation failed` is Anthropic's GitHub App guardrail — the workflow file on the current ref must match `main` before the App will issue a token. Expected on feature-branch dispatch; resolves on merge.

- [x] v2.4.10: `upstream-parse` fallback body too large (2026-04-20)
  - [x] **PR #88 — cap fallback body at 60 KB and write assistant text instead of the full transcript.** Discovered on the first post-OIDC-fix run (workflow run 24689703608): Claude cross-reference succeeded but the parse step failed (`no contract line (SKIP_ISSUE or "# Title: ") found in response`), and the parse-error fallback step — which is supposed to file a diagnostic issue with the raw output so a human can intervene — then failed itself with `GraphQL: Body is too long (maximum is 65536 characters) (createIssue)`. Root cause: `saveRaw()` in `scripts/upstream-parse.mjs` wrote the entire `.jsonl` execution transcript (system init + user message + assistant turns + every `Read` tool call & result) as the body. Claude reads three input files on every run (`new_items.json`, feed report, `.claude/commands/upstream-check.md`), so the transcript comfortably exceeds 65 KB.
  - [x] `scripts/upstream-parse.mjs` — `buildRawBody()` now prefers `extractAssistantText()` over the full transcript (Claude's last assistant turn only — no tool-result noise). Falls back to the transcript when assistant text is empty or unparseable. Truncates at `MAX_RAW_BYTES = 60_000` with a `[truncated]` marker, byte-aware so UTF-8 sequences aren't split. Script now also exports `runParse`, `buildRawBody`, `extractAssistantText`, `MAX_RAW_BYTES` and guards the CLI entry with `import.meta.url` — still executable via `node scripts/upstream-parse.mjs`, now unit-testable.
  - [x] `scripts/_gha-outputs.mjs` — moved the `GITHUB_OUTPUT` env read from module load into `writeOutputs()` so tests that set env vars after importing the helper can observe writes. No production behavior change.
  - [x] `tests/scripts/upstream-parse.test.js` — new test file, 14 tests covering the three happy paths (issue contract, `SKIP_ISSUE`, plaintext fallback), every error branch, the new truncation logic (oversize content stays ≤ `MAX_RAW_BYTES` and ends with `[truncated]`), the assistant-text-only fallback (asserts no `"type":"system"` in the raw body), and `extractAssistantText` unit cases (null / multi-block / multi-turn).
  - [x] Pre-merge verification: 553/553 tests pass (+14 new), ESLint clean on both `src/ tests/` and `scripts/`, smoke test via CLI entry (`RUNNER_TEMP=... GITHUB_OUTPUT=... node scripts/upstream-parse.mjs tests/fixtures/upstream/exec-skip.jsonl`) correctly emits `skip=true`.
  - [x] Tracking issue `#89` — the _separate_ question of why Claude dropped the contract on 2026-04-20 remains open. The raw transcript is gone (runner temp), so prompt changes would be cargo-cult. Once v2.4.10 ships, the next parse-error will open a readable fallback issue with Claude's actual output — that data gates any prompt/parser hardening.

- [x] v2.4.11: `upstream-parse` execution-file format drift (2026-04-20)
  - [x] **PR #92 — rewrite `extractAssistantText` for the real `claude-code-action@v1.0.101` output shape.** On the first post-2.4.10 run (workflow run 24691083747) the fallback from PR #88 successfully fired and filed issue #91 with Claude's actual output. Inspecting that content closed issue #89: it was NOT prompt/contract drift — it was **format drift**. `anthropics/claude-code-action` writes `$RUNNER_TEMP/claude-execution-output.json` as a pretty-printed JSON array via `JSON.stringify(messages, null, 2)` (see `base-action/src/run-claude-sdk.ts` line 184 at pinned SHA `38ec876`), not JSONL with one event per line. Our parser split on newlines and `JSON.parse`'d each line; every line-parse failed on fragments like `[`, `{`, `"type": "system",`, so `extractAssistantText` returned `null` for every run and the whole transcript fell through to the contract search. `SKIP_ISSUE` strings inside hook-dumped PROGRESS.md passages then produced false negatives.
  - [x] `scripts/upstream-parse.mjs` — `extractAssistantText` rewritten: single `JSON.parse(raw)`, require `Array.isArray`, walk events, pull text-only content from the **last non-empty** `assistant` event (so tool_use-only turns like `Read` calls on feed files cannot clobber the real final response). Returns `null` on invalid JSON, non-array roots, or no assistant text — the existing plaintext fallback then handles the `exec-plaintext.md` case. JSONL support dropped entirely: the action SHA is pinned, the format is deterministic, and keeping a JSONL branch was untested dead code.
  - [x] Fixtures: five new `.json` files replacing the stale `.jsonl` ones. `exec-issue.json`, `exec-skip.json`, `exec-malformed.json` port the old cases into JSON-array shape. `exec-with-tool-use.json` mixes text + `tool_use` blocks across multiple turns (proves we filter tool_use and prefer the last text turn). `exec-with-hooks.json` begins with a `system:hook_response` event whose `output` payload carries the literal token `SKIP_ISSUE` in prose — simulating worclaude's dogfooded `SessionStart:startup` hook, which always runs inside the action's runner and was identified as the exact noise pattern that masked the format bug in production.
  - [x] `tests/scripts/upstream-parse.test.js` — 14 → 20 tests in-file, 553 → 559 total. New cases cover hook-noise filtering, tool_use filtering, multi-turn last-non-empty preference, invalid JSON, non-array roots, and mixed text+tool_use content extraction.
  - [x] Post-merge `/refactor-clean` + `/simplify` pass (PR #92 follow-up commit `a542863`): removed the unreachable "empty title" branch and `stripBomAndLeading()` (ECMAScript `trim()` already strips U+FEFF); hoisted parser grammar to named constants (`SKIP_MARKER`, `TITLE_PREFIX`, `BODY_MARKER`) and the empty-output template to `EMPTY_OUTPUTS`; added defaults to `reportParseError(reason, transcript='', assistantText='')`; fixed double UTF-8 encoding in `buildRawBody` (`Buffer.from` happens once, `buf.byteLength` reused). Script went from 205 → 188 lines with no behavior change.
  - [x] Pre-merge verification: 559/559 tests pass, ESLint clean on `src/ tests/` and `scripts/`, `npm run docs:build` clean, CLI smoke test (`RUNNER_TEMP=... GITHUB_OUTPUT=... node scripts/upstream-parse.mjs tests/fixtures/upstream/exec-skip.json`) emits `skip=true`.
  - [x] Issues to close post-merge: `#89` (root cause fixed) and `#91` (fallback did its job and delivered the diagnostic that led to this PR). Both linked from PR #92.

- [x] v2.4.12: `upstream-check` Claude turn-budget exhaustion (2026-04-20)
  - [x] **PR #94 — raise `--max-turns` from 15 to 25 in `.github/workflows/upstream-check.yml`.** Workflow run 24693290867 (first post-v2.4.11 run on `main`) failed with `error_max_turns / num_turns: 16`. Not a parser issue — the v2.4.11 rewrite still works, the Claude step just couldn't fit the workload into 15 turns. The prompt requires ~9 `Read` calls (2 input files + `.claude/commands/upstream-check.md` + cross-reference against `templates/agents/**`, `templates/commands/**`, `templates/hooks/**`, `src/data/agents.js`, `src/data/agent-registry.js`, `docs/spec/BACKLOG-v2.1.md`, `CLAUDE.md`) before the final response — each Read burns a turn, so 15 was tight by luck on earlier runs, not by design. 25 gives comfortable headroom without being excessive.
  - [x] No prompt simplification (the cross-reference IS the feature), no model change, no parser touch. One-line tuning fix.
  - [x] Issue `#89` (umbrella "Claude dropped the contract") stays open until a successful end-to-end run on `main` with v2.4.12 confirms the full pipeline works. Then close with a summary of both root causes (format drift in v2.4.11, turn exhaustion in v2.4.12) and their fixes.

## Stats

- 8 CLI commands: init, upgrade, status, backup, restore, diff, delete, doctor
- 6 universal agents + 20 optional agents (6 categories)
- 18 slash commands
- 12 universal skills + 3 template skills + 1 generated skill (agent-routing)
- 8 hook events scaffolded: SessionStart, PostToolUse, PostCompact, PreCompact, UserPromptSubmit, Stop, SessionEnd, Notification
- 4 hook scripts: pre-compact-save.cjs, correction-detect.cjs, learn-capture.cjs, skill-hint.cjs
- 8 SPEC.md template variants (1 default + 7 project-type-specific)
- 16 tech stack language options with per-language settings templates
- 559 tests across 33 test files
- 3 scenarios: fresh, existing, upgrade

## Notes

- Derived from tips by Boris Cherny (howborisusesclaudecode.com)
- Published: npm as `worclaude`
- Docs: VitePress site deployed via GitHub Pages
