# PROGRESS.md

## Current Status

**Phase:** All phases complete — published on npm as `worclaude`
**Version:** 2.1.0
**Last Updated:** 2026-04-04

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

## Stats

- 8 CLI commands: init, upgrade, status, backup, restore, diff, delete, doctor
- 5 universal agents + 20 optional agents (6 categories)
- 16 slash commands
- 11 universal skills + 3 template skills + 1 generated skill (agent-routing)
- 8 SPEC.md template variants (1 default + 7 project-type-specific)
- 16 tech stack language options with per-language settings templates
- 384 tests across 26 test files
- 3 scenarios: fresh, existing, upgrade

## Notes

- Derived from tips by Boris Cherny (howborisusesclaudecode.com)
- Published: npm as `worclaude`
- Docs: VitePress site deployed via GitHub Pages
