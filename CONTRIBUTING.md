# Contributing to Worclaude

Thanks for your interest in contributing to Worclaude! Whether it's a bug report, feature idea, or pull request, your input helps make this tool better for everyone.

## Reporting Bugs

Open an issue on [GitHub Issues](https://github.com/sefaertunc/Worclaude/issues) with:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected behavior vs actual behavior
- Your Node.js version and OS
- Any relevant error output

## Suggesting Features

Open an issue on [GitHub Issues](https://github.com/sefaertunc/Worclaude/issues) with the **enhancement** label. Describe the use case and how you envision the feature working. If it relates to one of Boris Cherny's 53 tips, mention which one.

## Development Setup

```bash
git clone https://github.com/sefaertunc/Worclaude.git
cd Worclaude
npm install
npm test
npm run lint
```

Run the CLI locally during development:

```bash
node src/index.js init
node src/index.js status
```

## Pull Request Guidelines

1. Fork the repo and create a branch from `main`
2. Make your changes in focused, logical commits
3. Write or update tests for any new functionality
4. Run the full test suite: `npm test`
5. Run the linter: `npm run lint`
6. Open a PR against `main` with a clear description of the change

Keep PRs focused on a single concern. If you're fixing a bug and adding a feature, split them into separate PRs.

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
