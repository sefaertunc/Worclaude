# CLAUDE.md

claude-workflow — CLI tool that scaffolds a comprehensive Claude Code workflow into any project.

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
npm test                        # Run tests
npm run lint                    # Lint
npm run format                  # Format
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

## Gotchas
[Grows during development]
