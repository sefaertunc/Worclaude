# PROGRESS.md

## Current Status

**Phase:** All phases complete — published on npm as `worclaude`
**Version:** 1.3.5
**Last Updated:** 2026-03-27

## Completed

- [x] Workflow design (53 tips analyzed, all decisions made)
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

## Stats

- 6 CLI commands: init, upgrade, status, backup, restore, diff
- 5 universal agents + 18 optional agents (6 categories)
- 10 slash commands
- 9 universal skills + 3 template skills + 1 generated skill (agent-routing)
- 8 SPEC.md template variants (1 default + 7 project-type-specific)
- 16 tech stack language options with per-language settings templates
- 180 tests across 19 test files
- 3 scenarios: fresh, existing, upgrade

## Notes

- Derived from 53 tips by Boris Cherny (howborisusesclaudecode.com)
- Published: npm as `worclaude`
- Docs: VitePress site deployed via GitHub Pages
