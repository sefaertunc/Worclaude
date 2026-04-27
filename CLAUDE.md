# CLAUDE.md

worclaude — CLI tool that scaffolds a comprehensive Claude Code workflow into any project.

## Key Files

- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth for all features and design decisions

## Tech Stack

<!-- references package.json -->

- **Runtime:** Node.js 18+ (pure ESM, no build step, no transpilation)
- **CLI framework:** Commander.js ^13.1.0
- **Interactive prompts:** Inquirer.js ^12.5.0 (watch for breaking changes between majors)
- **Terminal styling:** Chalk ^5.4.1 (via `display.*` namespace — never use `console.log` directly)
- **Spinners:** Ora ^8.2.0
- **File operations:** fs-extra ^11.3.0
- **Hashing:** Node.js crypto (built-in, CRLF-normalized)
- **Testing:** Vitest (947 tests, 69 files)
- **Linting:** ESLint flat config (eslint.config.js) + Prettier (single quotes, trailing commas ES5, 100 char width)
- **Docs:** VitePress (GitHub Pages via GitHub Actions)
- **Package manager:** npm (caret ranges, no lockfile pinning)

## Commands

<!-- references package.json -->

```bash
node src/index.js init                # Test init command locally
node src/index.js upgrade             # Test upgrade command
node src/index.js status              # Test status command
node src/index.js doctor              # Test doctor command (workflow health check)
node src/index.js backup              # Test backup command
node src/index.js restore             # Test restore command
node src/index.js diff                # Test diff command
node src/index.js delete              # Test delete command
node src/index.js doc-lint            # Validate `<!-- references … -->` markers and surface tech-stack drift
node src/index.js observability       # Aggregate per-project signals into a Markdown report
node src/index.js regenerate-routing  # Rebuild .claude/skills/agent-routing/SKILL.md from agent files
node src/index.js scan                # Detect project type/stack via project-scanner detectors
node src/index.js setup-state show    # Inspect /setup interview persistence
node src/index.js worktrees clean     # Remove stale agent worktrees
npm test                              # Run tests (947 tests, 69 files)
npm run lint                          # Lint
npm run format                        # Format
npm run docs:dev                      # VitePress dev server
npm run docs:build                    # Build docs for deployment
/sync                                 # Update PROGRESS.md, SPEC.md, version after merging PRs (run on develop)
/conflict-resolver                    # Resolve merge conflicts (run on develop before /sync)
```

## Skills (read on demand)

See `.claude/skills/` for project-specific guidance. Universal skills cover
context management, git conventions, planning-with-files, review-and-handoff,
prompt engineering, verification, testing, claude-md-maintenance, coding
principles, subagent usage, security checklist, coordinator mode, and
memory architecture (the five-layer model added in Phase 4). The
`agent-routing` skill is regenerated from `templates/agents/` whenever
agents change.

## Session Protocol

**Start:** Read PROGRESS.md. Check which phase is active.
**During:** One feature at a time. Test after each. Commit working increments.
**Feature branch:** /start → work → /verify → /commit-push-pr
**After merging PRs:** git checkout develop → git pull → /conflict-resolver (if needed) → /sync
**Mid-task stop:** /end (writes handoff file)

## Memory Architecture

- Captured learnings: `.claude/learnings/` (captured by hooks; reviewed via `/learn`). Reserved phrase "auto-memory" refers to Claude Code's built-in feature at `~/.claude/projects/<proj>/memory/`, not this directory.
- CLAUDE.md stays lean — it is shared with teammates. Long-form notes belong in `docs/memory/` or the learnings directory.
- The `[LEARN]` marker in tool output flags moments worth capturing.

## Hook Profiles

Set `WORCLAUDE_HOOK_PROFILE` to control hook strictness:

- `minimal` — only session context hooks
- `standard` — all hooks (default)
- `strict` — all hooks + TypeScript checking on every edit

## Critical Rules

1. SPEC.md is source of truth. Every feature must match the spec exactly.
2. Template files in `templates/` are user-facing content — quality matters.
3. Test all three scenarios (fresh, existing, upgrade) after any merge logic change.
4. Cross-platform: use path.join, os.platform(), never hardcode separators.
5. Self-healing: same mistake twice → update this file.
6. Use subagents for side work to keep main context clean.
7. Never do JSON text substitution on stringified JSON — always operate on parsed objects.
8. Never use `console.log` for user output — use `display.*` functions.
9. Never leave Ora spinner running when Inquirer prompt fires.
10. New agents are added by dropping a markdown file with the routing-fields frontmatter (`category`, `triggerType`, `whenToUse`, `whatItDoes`, `expectBack`, `situationLabel`, optional `triggerCommand` / `status`) into `templates/agents/<category>/`. Add the slug to `AGENT_CATALOG` in `src/data/agents.js` for selection-time UI; everything else flows from the file's frontmatter. After adding/removing/renaming, run `worclaude regenerate-routing` (or it runs automatically during `/sync` and `worclaude upgrade`) to refresh `.claude/skills/agent-routing/SKILL.md`.
11. Always add new template files to both scaffolder AND workflow-meta hash computation.
12. Always handle the "Other / None" language edge case in stack-related code.
13. Every merge to `main` is a user-visible release and carries a version bump (`patch`, `minor`, or `major`). `/sync` aggregates per-PR `Version bump:` declarations from develop and only opens a PR to `main` when at least one declared bump is above `none`. Internal-only work (`none`-only batches) updates shared-state files on develop but never reaches `main`. Always publish from `main` via the `release.yml` workflow (triggered by creating a GitHub Release), never directly from `develop`. See git-conventions.md Versioning Policy.
14. Feature branches NEVER modify shared-state files. Those are updated only on develop via /sync after merging PRs. See git-conventions.md Shared-State Files for the canonical list.
15. Never add Co-Authored-By trailers, AI attribution footers, or "Generated with" signatures to commits or PRs.
16. Commit, push, and PR only when the human explicitly invokes /commit-push-pr or /sync. Never run git commit, git push, or gh pr create on your own initiative, never invoke those slash commands without an explicit human trigger, and never auto-answer the Version bump: question — refuse to proceed without a human-selected option.

## Key Directories

- `src/data/agents.js` — Selection-time catalogs, tech stacks, formatters, categories
- `src/utils/agent-frontmatter.js` — Parser + validator for agent-file routing frontmatter (single source of truth)
- `src/generators/agent-routing.js` — Builds agent-routing skill content from a directory of agent files; supports `<!-- AUTO-GENERATED-START/END -->` markers so user prose survives regen
- `src/commands/regenerate-routing.js` — `worclaude regenerate-routing` and shared regenerator used by `/sync` and `worclaude upgrade`
- `src/utils/display.js` — Bold + Badges visual system for CLI output
- `src/utils/npm.js` — Shared npm registry check (used by upgrade + status)
- `src/core/config.js` — Version readers (sync + async), workflow-meta management
- `templates/settings/` — 16 language-specific + 1 base + 1 docker settings templates

## Verification

<!-- references package.json -->

The canonical verification commands are npm scripts defined in `package.json`.
Reference them by script name; do not restate the underlying tool invocations
(e.g., write `npm test`, not `vitest run --reporter=...`).

```bash
npm test && npm run lint          # Primary — run before every commit
npm run format                    # Auto-fix formatting (or rely on PostToolUse hook)
npm run docs:build                # Only when touching docs/ directory
```

Manual scenario testing (when touching merge/scaffold/settings logic):

```bash
# Scenario A (fresh)
rm -rf /tmp/test-fresh && mkdir /tmp/test-fresh && cd /tmp/test-fresh && git init && node ~/SEFA/GIT/Claude-Workflow/src/index.js init

# Scenario B (existing)
rm -rf /tmp/test-existing && mkdir /tmp/test-existing && cd /tmp/test-existing && git init && mkdir -p .claude/skills && echo "# My CLAUDE" > CLAUDE.md && node ~/SEFA/GIT/Claude-Workflow/src/index.js init

# Scenario C (upgrade) — run Scenario A first, then:
cd /tmp/test-fresh && node ~/SEFA/GIT/Claude-Workflow/src/index.js init
```

## Gotchas

- JSON text substitution in settings builder can break on special chars — always operate on parsed objects, never on stringified JSON
- Shell-escaped braces (\{ → {) in user JSON files need two-pass parsing in `parseUserJson()` — don't simplify to single pass
- Docker edit permissions live in docker.json, not base.json
- Spinner must be stopped before interactive prompts in Scenario B merge
- Global npm install requires sudo on some systems — self-update detects EACCES and suggests sudo
- Commander.js `.version()` is synchronous — use `getPackageVersionSync()` not the async variant
- `replaceHookCommands()` uses regex on JSON hook strings — formatter commands with curly braces can break it
- CRLF normalization in hashing: always use the normalized hash function, never raw crypto on file content
- Tiered merge is strict: Tier 1 only when file doesn't exist, Tier 2 always saves alongside (even if identical), Tier 3 only for CLAUDE.md and hooks
- Settings merge is append-only for permissions — never removes or replaces existing user rules
- `merger.js` is the one exception to "core/ never prompts" — it calls `promptHookConflict()` directly
- Use `Bash(git:*)` wildcard for git permissions, never list subcommands individually — new subcommands will trigger approval prompts
- Commands with pipes (`|`) and redirects (`2>&1`) trigger security prompts even in auto-accept mode. This is a Claude Code safety feature for compound shell commands — cannot be fully eliminated via permissions. Use "Yes, and don't ask again" when prompted.
