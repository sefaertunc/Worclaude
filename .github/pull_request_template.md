## Description

Brief description of the changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactor / cleanup

## Version bump

This PR's semver impact — required for `/sync` to compute the release bump.

Version bump: <!-- major | minor | patch | none -->

Guidance:

- `major` — breaking change to CLI, scaffold contract, or public API
- `minor` — new command, new agent, new flag, new user-visible feature
- `patch` — bug fix or user-visible behavior change with no new surface
- `none` — docs, CI, tests, internal refactor (nothing consumers notice)
- **Revert PRs:** match the bump level of the PR being reverted.

## Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated (if applicable)
- [ ] Tested with `worclaude init` on a fresh project

## Related Issues

Closes #
