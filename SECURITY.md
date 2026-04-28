# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.9.x   | :white_check_mark: |
| < 2.9   | :x:                |

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
directory, and a `.snyk` policy file with an equivalent `exclude.global`
entry for Snyk Open Source. Other SCA tools may need an equivalent
`ignore` directive.

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

### Dev-only transitive advisories (fixed via overrides)

Three advisories sat deep in the dev-dependency tree, all pulled through
`vitepress@1.6.4 → vite@5.x → esbuild@0.21.x`. They are now pinned to
patched versions via `"overrides"` in `package.json`:

- **[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
  / CVE-2026-41305** — `esbuild` dev-server CORS misconfiguration.
  Override: `"esbuild": "^0.25.0"` (resolved 0.25.12).
- **[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)
  / CVE-2026-39365** — `vite` path traversal in optimized-deps handling
  (affects vite 6.0.0–6.4.1; Socket's range matcher also flags 5.x).
  Override: `"vite": "^6.4.2"` (resolved 6.4.2).
- **[GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)** —
  `postcss` XSS via unescaped `</style>` in CSS stringify output.
  Override: `"postcss": "^8.5.10"` (resolved 8.5.12).

Verified clean: `npm audit` reports 0 vulnerabilities, `npm run docs:build`
succeeds against `vitepress@1.6.4` despite its declared `vite@^5.4.14`
peer range, and all 947 tests pass.

These were not exploitable in worclaude's actual usage — every advisory
required an active local dev server (`npm run docs:dev`) and the operator
visiting a hostile origin in the same session. `npm test`, `npm run lint`,
`npm run docs:build`, and CI never start a server. They are flagged
nonetheless because Socket and `npm audit` scan the lockfile by version,
not by exploit reachability.

### brace-expansion DoS (fixed via override)

[GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) —
`brace-expansion@<1.1.13` zero-step sequence. Fixed in 1.1.13; enforced
via `"overrides": { "brace-expansion": "^1.1.13" }` in `package.json`
since v2.6.2. Pulled by `eslint@9.x → minimatch@3.x`.

### AI-detected typosquat alert (false positive)

Socket's "AI-detected possible typosquat — Did you mean: claude" flag
triggers because the package name `worclaude` contains the substring
`claude`. The package was published under this name from day one
(2026-02), the npm namespace is owned by the original author
(`sefaertunc`), and the package is the canonical home for the workflow
described in this README. There is no upstream `claude` workflow
scaffolder being typosquatted — `claude` on npm is an unrelated
abandoned package. Renaming a published, indexed package would break
every existing user's CLI alias and slash-command muscle memory; the
alert is accepted as a permanent false positive.

### URL-strings supply-chain alert (template content)

Socket's "URL strings" alert lists hostnames and filenames extracted
from the package's text content (e.g. `gitforwindows.org`, `Fly.io`,
`Platform.sh`, `CLAUDE.md`, `SKILL.md`). Every match is documentation
or template prose under `templates/` — instruction text the scaffolder
writes into the user's project. Worclaude does not make network calls
at runtime; the only HTTP code path is `src/utils/npm.js`, which
queries the npm registry for the latest published version during
`worclaude upgrade` and `worclaude status`. The flagged strings are
content, not endpoints.
