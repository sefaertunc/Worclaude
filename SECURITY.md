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

### Dev-only transitive advisories pending upstream fixes

Two advisories sit deep in the dev-dependency tree and cannot currently be
resolved without either forking `vitepress` or waiting for its next release:

- **[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)** —
  `vite@5.4.21` path traversal in optimized-deps handling. Fixed in
  `vite@>=6.4.2`.
- **[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)** —
  `esbuild@0.21.5` dev-server CORS misconfiguration. Fixed in
  `esbuild@>=0.25.0`.

Both are pulled through `vitepress@1.6.4` (the current latest on npm),
which pins `vite` at `^5.0.0`, which in turn pins `esbuild` at `^0.21.3`.
`npm overrides` cannot force newer major versions without breaking the
vite peer contract.

Why these do not block a release:

- Both packages are in `devDependencies` only. The `files` whitelist in
  `package.json` does not include `tests/` or any dev tooling; end users
  installing `worclaude` via npm do not get these packages.
- Both advisories require an **active local dev server** to exploit. The
  vite/vitest attack surface only exists while `npm run docs:dev` is
  running and the operator browses to a hostile origin in the same
  session. `npm test`, `npm run lint`, `npm run docs:build`, and CI
  runs do not start a server.
- Worclaude's CI does not run `docs:dev`; it runs `test`, `lint`, and
  `docs:build` only.

Tracking: a GitHub issue is opened to bump `vitepress` once a release
using `vite@>=6.4.2` lands upstream. Until then the scanner will continue
to flag these, and we accept the dev-only risk.

### brace-expansion DoS (fixed via override)

[GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) —
`brace-expansion@<1.1.13` zero-step sequence. Fixed in 1.1.13; enforced
via `"overrides": { "brace-expansion": "^1.1.13" }` in `package.json`
since v2.6.2. Pulled by `eslint@9.x → minimatch@3.x`.
