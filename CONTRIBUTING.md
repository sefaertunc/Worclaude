# Contributing to Worclaude

Thanks for your interest in contributing to Worclaude! Whether it's a bug report, feature idea, or pull request, your input helps make this tool better for everyone.

## Branching Strategy

```
feature-branch ──PR──▶ develop ──PR──▶ main (release)
                           │
                           └── gh-pages (docs, auto-deployed)
```

| Branch     | Purpose             | Who can push             | Who can PR to it                     |
| ---------- | ------------------- | ------------------------ | ------------------------------------ |
| `develop`  | Active development  | Maintainer               | Contributors (from feature branches) |
| `main`     | Production releases | Maintainer               | Maintainer only (from `develop`)     |
| `gh-pages` | Documentation site  | Maintainer (auto-deploy) | Nobody                               |

**Contributors only interact with `develop`.** Fork the repo, create a feature branch from `develop`, and open a PR back to `develop`. You cannot push or open PRs against `main` — they will be closed.

## Development Setup

```bash
git clone https://github.com/sefaertunc/Worclaude.git
cd Worclaude
git checkout develop
npm install
npm test
npm run lint
```

Run the CLI locally during development:

```bash
node src/index.js init
node src/index.js status
```

## Using the Worclaude Workflow

If you have [Claude Code](https://claude.com/claude-code), this project includes a 6-stage workflow pipeline to guide contributions:

`/start` → `/review-plan` → implement → `/simplify` → `/verify` → `/commit-push-pr`

Run these as slash commands in Claude Code for a guided experience.

## Pull Request Guidelines

1. Fork the repo and create a branch from `develop`
2. Make your changes in focused, logical commits
3. Write or update tests for any new functionality
4. Run the full test suite: `npm test`
5. Run the linter: `npm run lint`
6. Run the formatter: `npm run format`
7. Open a PR **targeting `develop`** with a clear description of the change

**Never open PRs against `main`** — they will be closed. Only the maintainer merges `develop` into `main` for releases.

Keep PRs focused on a single concern. If you're fixing a bug and adding a feature, split them into separate PRs.

### What CI Checks

Every PR is validated by CI before merge:

- **Tests** — full test suite across Node 18, 20, and 22
- **ESLint** — code quality and style rules
- **Prettier** — formatting consistency check
- **Branch** — must be up-to-date with `develop`

## Reporting Bugs

Open an issue on [GitHub Issues](https://github.com/sefaertunc/Worclaude/issues) with:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected behavior vs actual behavior
- Your Node.js version and OS
- Any relevant error output

## Suggesting Features

Open an issue on [GitHub Issues](https://github.com/sefaertunc/Worclaude/issues) with the **enhancement** label. Describe the use case and how you envision the feature working.

## Code Style

This project uses ESLint and Prettier for consistent formatting. Before submitting:

```bash
npm run format    # Auto-format with Prettier
npm run lint      # Check for lint errors
```

All code must pass both checks. The CI pipeline enforces this automatically.

## Testing

We use [Vitest](https://vitest.dev/) for testing. All tests must pass before a PR can be merged:

```bash
npm test          # Run the full test suite
```

When adding new features, include tests that cover:

- The expected happy path
- Edge cases and error conditions
- Integration with existing commands (init, upgrade, status)

Test all three scenarios (fresh project, existing project, upgrade) if your change touches merge logic or file generation.

## Questions?

Open a discussion on GitHub or mention it in your issue/PR. We're happy to help.
