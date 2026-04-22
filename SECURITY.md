# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.6.x   | :white_check_mark: |
| < 2.6   | :x:                |

## Reporting a Vulnerability

Please report security issues privately via
[GitHub Security Advisories](https://github.com/sefaertunc/Worclaude/security/advisories/new).
This is the preferred channel — it lets us coordinate a fix before disclosure.

As a fallback, you may email **sefaertunc@gmail.com**.

Please do **not** open a public issue for security vulnerabilities.

You can expect an initial response within 48 hours.
If the vulnerability is accepted, a fix will be prioritized and released as a patch version.

## Supply Chain Scanner Findings

Automated SCA tools (Socket, Snyk, GitHub Dependabot) sometimes surface
alerts that are not real exposures for worclaude. The most common cases:

### Test fixture manifests are not real dependencies

`tests/fixtures/scanner/**` contains static `package.json`, `pnpm-lock.yaml`,
`package-lock.json`, and `pyproject.toml` files used to exercise the
project-scanner detectors in `src/core/project-scanner/`. They pin
intentionally-outdated versions (e.g. `next@14.2.3`, `vitest@1.4.0`,
`prisma@5.10.0`) so the detectors have realistic inputs to match against.

These fixtures are:

- **Never installed.** They are not referenced from the root `package.json`.
- **Not shipped to npm.** `package.json`'s `files` whitelist publishes only
  `src/`, `templates/`, and top-level docs. `tests/` is excluded.
- **Not executed.** The scanner reads them as JSON/TOML and inspects the
  dependency lists; it never imports or runs the packages named inside.

Worclaude's repo includes `socket.yml` to stop Socket from scanning this
directory. Other SCA tools may need an equivalent `ignore` directive.

### Real runtime dependencies

```
chalk        ^5.4.1
commander   ^13.1.0
fs-extra    ^11.3.0
inquirer    ^12.5.0
ora          ^8.2.0
smol-toml    ^1.6.1
yaml         ^2.8.3
```

No Next.js, React, Express, Prisma, or Stripe appear at runtime despite
what a fixture-inclusive scan might suggest.

### Filesystem access flag is by design

Worclaude scaffolds files into the user's project tree: templates → `.claude/`,
settings.json merges, timestamped backups under `.claude-backup-*/`, and
an opt-in `workflow-meta.json`. The `fs-extra`-based filesystem capability
flag is a disclosure, not a vulnerability — removing it would delete the
tool's core function.
