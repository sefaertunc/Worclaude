# AGENTS.md

worclaude — CLI tool that scaffolds a comprehensive Claude Code workflow into any project.

## Tech Stack

- Node.js 18+ (pure ESM, no build step)
- Commander.js, Inquirer.js, Chalk, Ora, fs-extra
- Vitest (497 tests, 31 files)
- ESLint flat config + Prettier
- VitePress for docs

## Build & Test Commands

```bash
npm test                        # Run tests
npm run lint                    # Lint
npm run format                  # Format
npm run docs:build              # Build VitePress docs
node src/index.js <command>     # Test a CLI command locally
```

## Code Conventions

- Named exports only (no default exports).
- Use `display.*` helpers for user output — never `console.log`.
- Operate on parsed JSON objects; never text-substitute on stringified JSON.
- Cross-platform: `path.join`, `os.platform()`, never hardcode separators.
- Read source files before modifying them. Ask if ambiguous, do not guess.

## Project Structure

- `src/commands/` — CLI command handlers (init, upgrade, status, doctor, backup, restore, diff, delete)
- `src/core/` — config, merger, scaffolder, workflow-meta
- `src/data/` — agent catalogs, stack definitions, routing metadata
- `src/generators/` — dynamic file generators (agent-routing.md, etc.)
- `src/utils/` — display, npm helpers, hashing
- `templates/` — user-facing scaffold content (agents, commands, skills, hooks, settings)
- `docs/spec/` — `SPEC.md` (source of truth) and `PROGRESS.md` (read first every session)

## Key Principles

- Source of truth: `docs/spec/SPEC.md`. Features must match the spec exactly.
- One feature at a time. Test after each. Commit working increments.
- Every merge to `main` gets at least a patch version bump (even docs/CI/test-only).
- Feature branches never modify shared-state files — those are updated on `develop` via `/sync` after merging PRs.
- Never add Co-Authored-By trailers or AI attribution to commits/PRs.
