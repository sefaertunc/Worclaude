# CLAUDE.md

worclaude — CLI tool that scaffolds a comprehensive Claude Code workflow into any project.

## Key Files

- `docs/spec/PROGRESS.md` — Read first every session
- `docs/spec/SPEC.md` — Source of truth for all features and design decisions

## Tech Stack

- Node.js CLI tool
- Commander.js (CLI framework), Inquirer.js (prompts), Chalk (styling), Ora (spinners)
- fs-extra (file ops), crypto (hashing)
- Vitest (testing), ESLint + Prettier (linting)

## Commands

```bash
node src/index.js init          # Test init command locally
node src/index.js upgrade       # Test upgrade command
node src/index.js status        # Test status command
node src/index.js backup        # Test backup command
node src/index.js restore       # Test restore command
node src/index.js diff          # Test diff command
npm test                        # Run tests (166 tests, 18 files)
npm run lint                    # Lint
npm run format                  # Format
npm run docs:dev                # VitePress dev server
npm run docs:build              # Build docs for deployment
```

## Skills (read on demand)

See `.claude/skills/` for project-specific guidance.

## Session Protocol

**Start:** Read PROGRESS.md. Check which phase is active.
**During:** One feature at a time. Test after each. Commit working increments.
**End:** Update PROGRESS.md. Note what's done and what's next.

## Critical Rules

1. SPEC.md is source of truth. Every feature must match the spec exactly.
2. Template files in `templates/` are user-facing content — quality matters.
3. Test all three scenarios (fresh, existing, upgrade) after any merge logic change.
4. Cross-platform: use path.join, os.platform(), never hardcode separators.
5. Self-healing: same mistake twice → update this file.
6. Use subagents for side work to keep main context clean.

## Key Directories

- `src/data/agents.js` — All catalogs, tech stacks, formatters, categories
- `src/data/agent-registry.js` — Routing metadata for all 23 agents (used by generator)
- `src/generators/agent-routing.js` — Builds agent-routing.md dynamically from selected agents
- `src/utils/display.js` — Bold + Badges visual system for CLI output
- `src/utils/npm.js` — Shared npm registry check (used by upgrade + status)
- `src/core/config.js` — Version readers (sync + async), workflow-meta management
- `templates/settings/` — 16 language-specific + 1 base + 1 docker settings templates

## Gotchas

- JSON text substitution in settings builder can break on special chars — use safe merge
- Shell-escaped braces in user JSON files need handling during merge
- Docker edit permissions live in docker.json, not base.json
- Spinner must be stopped before interactive prompts in Scenario B merge
- Global npm install requires sudo on some systems — self-update detects EACCES and suggests sudo
- Commander.js `.version()` is synchronous — use `getPackageVersionSync()` not the async variant
