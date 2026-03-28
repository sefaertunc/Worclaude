# CLAUDE.md

worclaude — CLI tool that scaffolds a comprehensive Claude Code workflow into any project.

## Key Files

- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth for all features and design decisions

## Tech Stack

- **Runtime:** Node.js 18+ (pure ESM, no build step, no transpilation)
- **CLI framework:** Commander.js ^13.1.0
- **Interactive prompts:** Inquirer.js ^12.5.0 (watch for breaking changes between majors)
- **Terminal styling:** Chalk ^5.4.1 (via `display.*` namespace — never use `console.log` directly)
- **Spinners:** Ora ^8.2.0
- **File operations:** fs-extra ^11.3.0
- **Hashing:** Node.js crypto (built-in, CRLF-normalized)
- **Testing:** Vitest (180 tests, 19 files)
- **Linting:** ESLint flat config (eslint.config.js) + Prettier (single quotes, trailing commas ES5, 100 char width)
- **Docs:** VitePress (GitHub Pages via GitHub Actions)
- **Package manager:** npm (caret ranges, no lockfile pinning)

## Commands

```bash
node src/index.js init          # Test init command locally
node src/index.js upgrade       # Test upgrade command
node src/index.js status        # Test status command
node src/index.js backup        # Test backup command
node src/index.js restore       # Test restore command
node src/index.js diff          # Test diff command
node src/index.js delete        # Test delete command
npm test                        # Run tests (230 tests, 20 files)
npm run lint                    # Lint
npm run format                  # Format
npm run docs:dev                # VitePress dev server
npm run docs:build              # Build docs for deployment
/sync                           # Update PROGRESS.md, SPEC.md, version after merging PRs (run on develop)
/conflict-resolver              # Resolve merge conflicts (run on develop before /sync)
```

## Skills (read on demand)

See `.claude/skills/` for project-specific guidance.

## Session Protocol

**Start:** Read PROGRESS.md. Check which phase is active.
**During:** One feature at a time. Test after each. Commit working increments.
**Feature branch:** /start → work → /verify → /commit-push-pr
**After merging PRs:** git checkout develop → git pull → /conflict-resolver (if needed) → /sync
**Mid-task stop:** /end (writes handoff file)

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
10. Always add new agents to both `agents.js` AND `agent-registry.js`.
11. Always add new template files to both scaffolder AND workflow-meta hash computation.
12. Always handle the "Other / None" language edge case in stack-related code.
13. Version bump required when templates or CLI behavior change. No bump for docs/CI/tests only. Always publish from `main`, never from `develop`. See git-conventions.md Versioning Policy.
14. Feature branches NEVER modify shared-state files. Those are updated only on develop via /sync after merging PRs. See git-conventions.md Shared-State Files for the canonical list.

## Key Directories

- `src/data/agents.js` — All catalogs, tech stacks, formatters, categories
- `src/data/agent-registry.js` — Routing metadata for all 23 agents (used by generator)
- `src/generators/agent-routing.js` — Builds agent-routing.md dynamically from selected agents
- `src/utils/display.js` — Bold + Badges visual system for CLI output
- `src/utils/npm.js` — Shared npm registry check (used by upgrade + status)
- `src/core/config.js` — Version readers (sync + async), workflow-meta management
- `templates/settings/` — 16 language-specific + 1 base + 1 docker settings templates

## Verification

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
