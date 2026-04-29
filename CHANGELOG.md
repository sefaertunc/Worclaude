# Changelog

All notable changes to worclaude are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/). Older releases (pre-2.3.0) are documented in [docs/spec/PROGRESS.md](./docs/spec/PROGRESS.md) and the [GitHub releases page](https://github.com/sefaertunc/Worclaude/releases).

## [Unreleased]

## [2.10.1] — 2026-04-29

Adds opt-in scaffolding for Claude Code 2.1.113's `sandbox.network` deny/allow lists. Worclaude is a scaffolder, so the new `templates/settings/base.json` ships empty `deniedDomains` and `allowedDomains` stubs rather than an opinionated default list — project owners decide their own network policy. The merge paths for both fresh init (Scenario A) and existing-project init/upgrade (Scenarios B/C) union-merge the new arrays preserving any user-added domains, and a new `worclaude doctor` check warns when the block is missing or malformed (with `worclaude upgrade` as the remediation hint). Also bundles a Dependabot major bump to `commander` 14, which is now Node-20+-only and was unblocked by the v2.10.0 Node 18 drop.

### Added

- **Sandbox network scaffolding** (PR #172) — `templates/settings/base.json` now scaffolds `sandbox.network.deniedDomains: []` and `allowedDomains: []` between the existing `permissions` and `hooks` blocks. New `mergeSettings` helper `unionStringList(inputs, accessor)` in `src/core/scaffolder.js` handles both `permissions.allow` and the new sandbox arrays uniformly. Backward compatible: a base without `sandbox` produces output without `sandbox`, so legacy callers in tests or downstream consumers don't surface the key spuriously.
- **`appendUnique(target, key, source)` helper** in `src/core/merger.js` (PR #172) — folds three previously-duplicated union-merge call sites in `mergeSettingsPermissionsAndHooks` (allow / deny / sandbox-arrays) into one-liners. Extracted during a `/simplify` pass after three parallel review agents flagged the duplication.
- **`checkSandboxBlock` doctor check** (PR #172) — warns when `settings.json` is missing the `sandbox` block (with a `worclaude upgrade` remediation pointer for legacy installs), when `sandbox.network` is malformed, or when either array isn't actually an array.

### Changed

- **`commander` 13.1.0 → 14.0.3** (PR #171) — Dependabot major bump. Commander 14 requires Node 20+ (already satisfied after v2.10.0's Node 18 drop) and adds `helpGroup`/`optionsGroup`/`commandsGroup` APIs plus unescaped negative-number support. Worclaude's CLI surface is unaffected.
- ⚠ **PR #171 shipped without a `Version bump:` declaration** — Dependabot-generated body, no manual annotation. Treated as `none` per `/sync`'s "missing → none" rule and surfaced here permanently. PR #172's `patch` declaration drove the release.

### Tests

- 967 → 992 (+25 net). Per-stack sandbox-array assertions across all 16 supported language templates (replaced one all-stacks loop test for individual failure attribution); 3 scaffolder unit tests covering union-merge, dedup, and legacy-passthrough; 2 Scenario B regressions for legacy-install upgrade and user-domain preservation through subsequent merges; 2 doctor checks for missing-block (legacy install) and malformed-block scenarios.

Release group: 2 PRs (1 patch, 1 missing-declaration treated as none). v2.10.0 → v2.10.1.

## [2.10.0] — 2026-04-29

Drops support for Node 18, which reached LTS end-of-life on 2025-04-30 (12 months before this release). The drop unblocks two Dependabot PRs stuck on Node-20-only features (`inquirer 13`'s `util.styleText` and `ora 9`'s regex `v` flag) and ships those bumps in the same release. Also recovers from a Dependabot routing misconfiguration: `.github/dependabot.yml` now declares `target-branch: develop` for both ecosystems, fixing a config gap that caused 5 PRs in the v2.9.3 → v2.10.0 window to be opened against main instead of develop. Their content is preserved across both branches via a recovery sync.

### Breaking

- **Node 18 no longer supported** (PR #167) — `engines.node` is now `>=20.0.0`. Running `npm install -g worclaude` on Node 18 will print an `EBADENGINE` warning (npm doesn't block by default but the warning is visible). CI test matrix dropped from `[18, 20, 22]` to `[20, 22]`. Required-status-checks on the `develop-protection` and `main-protection` rulesets updated accordingly. Tech-stack mentions refreshed in CLAUDE.md, AGENTS.md, README.md, `docs/guide/getting-started.md`, and `templates/specs/spec-md-library.md`.

### Changed

- **`ora` 8.2.0 → 9.4.0** (PR #169) — major bump. ora 9 uses regex `v` flag (Node 20+); previously blocked by the v2.9.x Node 18 matrix.
- **`inquirer` 12.11.1 → 13.4.2** (PR #169) — major bump. inquirer 13 uses `util.styleText` (Node 20.12+); previously blocked by the v2.9.x Node 18 matrix.
- **Dependabot routing fixed** (PR #168) — added `target-branch: develop` to both `npm` and `github-actions` ecosystems in `.github/dependabot.yml`. Previously, Dependabot defaulted to the repo's default branch (main), causing PRs to misroute. Future Dependabot Monday runs will correctly target develop.

### Internal

- **Recovery sync develop ← main** (PR #168) — brings 5 misrouted Dependabot squash commits from main onto develop (prettier 3.8.3, claude-code-action 1.0.109, actions/cache 5, vitest 4, eslint 10). All updates were legitimate; merge made via `git merge origin/main --no-ff` with auto-resolution.

Release group: 3 PRs (1 minor, 1 patch, 1 none). No missing Version bump declarations.

## [2.9.3] — 2026-04-29

Security tooling refresh shipped as a paired group: a CI-tooling migration from Snyk (whose free-tier scan limit had blocked the v2.9.2 release PR) to a GitHub-native open-source SCA stack (Dependabot + OSV-Scanner), and the cleanup of the inaugural CodeQL scan after enabling the default setup. CodeQL surfaced 5 findings — 2× High "Incomplete multi-character sanitization" on the project-scanner README detector's HTML-stripping helpers, and 3× Medium "Workflow does not contain permissions" on `ci.yml`'s three jobs — all closed in this release. The sanitization fix extracts a `stripUntilStable(text, regex)` helper for the do-while-until-stable pattern; the permissions fix adds a top-level `permissions: contents: read` block matching the rest of the repo's workflows. SECURITY.md's AI-detected typosquat section also refined with the actual chain context: the `claude` npm package is `bcherny/redirect-claude`, an intentional Boris-Cherny-maintained typosquat-warning redirect, not an abandoned package as previously documented.

### Fixed

- **CodeQL findings — incomplete multi-character sanitization** (PR #158) — `stripHtmlComments` and `stripHtmlTags` in `src/core/project-scanner/detectors/readme.js` rewritten to delegate to a private `stripUntilStable(text, regex)` helper that applies the regex repeatedly until stable. Closes the two High-severity `js/incomplete-multi-character-sanitization` alerts. Defense-in-depth: verified during plan-mode that no input distinguishes single-pass from looped output for these specific regex patterns; the fix satisfies the static analyzer without behavioral change.
- **CodeQL findings — missing workflow permissions** (PR #158) — top-level `permissions: contents: read` added to `.github/workflows/ci.yml`. Closes the three Medium-severity `Workflow does not contain permissions` alerts (`test` matrix, `format-check`, `plugin-validate` jobs). Brings ci.yml in line with the rest of the repo's workflows, all of which already declared explicit permissions.

### Changed

- **CI scanner stack: Snyk → Dependabot + OSV-Scanner** (PR #157) — Snyk's free-tier monthly scan limit had blocked the v2.9.2 release PR. Replaced with two free, GitHub-native SCA tools: `.github/dependabot.yml` (npm + github-actions ecosystems, weekly Monday 03:00 UTC, minor/patch grouped, `open-pull-requests-limit: 5`) and `.github/workflows/osv-scanner.yml` invoking `google/osv-scanner-action@v2.3.5` as job-level reusable workflows. SARIF upload routes findings to the Security tab. `.snyk` deleted; `SECURITY.md` and `CONTRIBUTING.md` updated to vendor-neutral language.
- **SECURITY.md typosquat-alert section** (PR #158) — refined to document Socket's chain inference (`worclaude` → `claude` → `@anthropic-ai/claude-code`) with [`bcherny/redirect-claude`](https://github.com/bcherny/redirect-claude) context, replacing the inaccurate "abandoned package" phrasing.

### Docs

- **CONTRIBUTING.md** (PR #157) — replaced "Snyk security score" with vendor-neutral "supply-chain trust signal that SCA tools (OSV-Scanner, Socket, Dependabot) and consumers rely on".

## [2.9.2] — 2026-04-28

`upstream-check` workflow rebuild: fixes a 5-day silence and migrates to the official client library. Root cause of the silence: the daily workflow committed `.github/upstream-state.json` and pushed to `main`, but `main`'s branch protection (PR-required + 4 required status checks) rejected every push with `GH013`. State never advanced, items were re-evaluated daily, and the `Create issue` step was gated behind state-push success — silent forever. State persistence is now `actions/cache@v4` (key prefix `upstream-state-v3-`); the workflow no longer touches the git tree, `contents: write` permission dropped. Migration to [`@sefaertunc/anthropic-watch-client`](https://www.npmjs.com/package/@sefaertunc/anthropic-watch-client) replaces ~80 lines of hand-rolled fetch/dedup with composite-`uniqueKey` dedup (the `id`-only dedup at `scripts/upstream-precheck.mjs:95` was already silently dropping items where two sources shared an ID — `2.1.114` was the live example), version-gated fetch (`FeedVersionMismatchError`), and typed errors. Claude prompt + `upstream-watcher` agent + `docs/reference/upstream-automation.md` updated for the `community` source category (Reddit, HN, Twitter, GitHub commits — informational only per upstream's contract). Source counts no longer hardcoded — derived from `summary.sourcesChecked`.

### Fixed

- **5-day upstream-check silence** (PR follows) — replaces direct-push-to-`main` state persistence with `actions/cache@v4`. Fixes `GH013` rejection that blocked state advance and issue creation since `2026-04-18T09:08:21Z`. `contents: write` permission dropped.
- **Composite-key dedup bug** in `scripts/upstream-precheck.mjs` (PR follows) — was deduping by `id` alone, silently dropping items where two sources shared an ID. Now uses `@sefaertunc/anthropic-watch-client`'s `filterNew` with the spec'd `${id}|${source}` fallback for legacy state entries.

### Changed

- **Migrated upstream fetch to `@sefaertunc/anthropic-watch-client@^1.0.2`** (PR follows) — version-gated feed envelope (`FeedVersionMismatchError`), typed `FeedFetchError` / `FeedMalformedError`, composite `uniqueKey` dedup. Three minor versions overdue per upstream's `WORCLAUDE-INTEGRATION.md` tracking note.
- **Workflow Claude prompt** (PR follows) — added `community` source category (Reddit, HN, Twitter/X, GitHub commits) treated as informational-only per anthropic-watch's contract; removed hardcoded "16 sources" wording in favor of `summary.sourcesChecked`.
- **`upstream-watcher` agent prompt** (template + dogfood, byte-identical) — updated to describe client-library usage and the `community` impact-classification row.

### Tests

- **`tests/scripts/upstream-precheck.test.js`** (new, 20 cases) — covers happy path, dedup correctness (including the cross-source-same-id regression case), legacy `${id}|unknown` fallback, all four typed-error paths, schema-version refusal, 90-day prune, watchdog-issue-number preservation, and the full output-key contract for downstream workflow steps.

### Docs

- **`docs/reference/upstream-automation.md`** — rewrote State File section for cache-based persistence, replaced "Required branch protection" with "Branch protection on `main` — fully compatible", added Community-source policy subsection, added v2.9.2 to version history.
- **`docs/reference/agents.md`** — `upstream-watcher` description: source count now described as dynamic; switched from "via `curl` (no npm dependencies)" to client-library usage.

## [2.9.1] — 2026-04-28

Security patch clearing three transitive dev-dep advisories surfaced by Socket.dev and `npm audit` (esbuild dev-server CORS, vite path-traversal in optimized-deps, postcss XSS in CSS stringify). All three were dev-only, gated behind running `npm run docs:dev` and visiting a hostile origin in the same session — neither CI nor end-user installs trigger the conditions — but they kept appearing in scanner output and drowning out signal. Resolved via `npm overrides` in `package.json` (esbuild ^0.25.0, vite ^6.4.2, postcss ^8.5.10) which forces vitepress 1.6.4 onto patched transitives despite its declared `vite ^5.4.14` peer range; `npm run docs:build` verified clean. SECURITY.md rewritten: stale "pending upstream fixes" section replaced with "fixed via overrides", new false-positive subsections for Socket's AI-typosquat alert ("Did you mean: claude") and URL-strings alert (template content, not endpoints), supported-version table bumped to 2.9.x.

### Fixed

- **Three transitive dev-dep CVEs cleared via `npm overrides`** (PR #153) — esbuild 0.21.5 → 0.25.12 ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) / CVE-2026-41305), vite 5.4.21 → 6.4.2 ([GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) / CVE-2026-39365), postcss 8.5.8 → 8.5.12 ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)). `npm audit` now reports 0 vulnerabilities; all 947 tests still pass; `npm run docs:build` succeeds against vitepress 1.6.4.

### Docs

- **`SECURITY.md` refresh** (PR #153) — replaces the obsolete "pending upstream fixes" section with a "fixed via overrides" section listing each advisory and resolved version. Adds two new false-positive subsections documenting Socket's AI-typosquat alert ("Did you mean: claude" — permanent, package was published under this name from day one) and URL-strings alert (flagged hostnames/filenames are template prose under `templates/`, not runtime endpoints; only `src/utils/npm.js` makes a network call). Bumps the supported-version table from `2.6.x` to `2.9.x`.

## [2.9.0] — 2026-04-28

Audit-driven workflow rebuild executing the canonical 7-phase plan derived from the 2026-04 master architecture audit, plus the @claude GitHub Action surface and post-phase polish. Phase 1 cleaned drift and gap-filled hooks. Phase 2 rebuilt the slash-command surface, retired three superseded commands, and split `/start`/`/end` into distinct forward-looking-handoff and backward-looking-session-summary artifacts with `sha:` frontmatter for SHA-based drift detection. Phase 3 made agent files the routing source of truth via a new frontmatter contract (`category`, `triggerType`, `whenToUse`, `whatItDoes`, `expectBack`, `situationLabel`) regenerated on every `/sync` and `worclaude upgrade`. Phase 4 introduced the memory-architecture skill and the `/update-claude-md` promotion algorithm. Phase 5 added the `worclaude doc-lint` subcommand. Phase 6a shipped end-to-end observability — capture, the `worclaude observability` aggregator, and the `/observability` slash command. Phase 7 added an `init` opt-in for the @claude GitHub Action workflow. Post-phase polish required explicit human invocation of `/commit-push-pr` or `/sync` for any git write (no more conversational "yes" authorizations) and extracted multi-line bash from three slash commands into POSIX helper scripts under `templates/scripts/` so each invocation matches a single allow rule. Test surface grew from 804/58 files to 947/69 files.

### Added

- **`worclaude observability` subcommand + `/observability` slash command** (PR #144) — aggregates per-session captured signals into a Markdown report; `/observability` surfaces it in-session.
- **Observability capture infrastructure** (PR #143) — per-session signal capture wired into hooks; foundation that PR #144 reads from.
- **Observability upgrade-path integration + VitePress docs** (PR #145) — existing installs pick up observability infra; new VitePress page documents the flow.
- **`worclaude doc-lint` subcommand** (PR #142) — validates `<!-- references … -->` markers and surfaces tech-stack drift between code and prose; T5.9 of the canonical plan.
- **`worclaude regenerate-routing` subcommand** (PR #137, T3.1 Path B) — rebuilds `.claude/skills/agent-routing/SKILL.md` from agent-file routing-fields frontmatter (`category`, `triggerType`, `whenToUse`, `whatItDoes`, `expectBack`, `situationLabel`). Preserves user prose outside `<!-- AUTO-GENERATED-START/END -->` markers. Auto-runs during `/sync` and `worclaude upgrade`. New `src/utils/agent-frontmatter.js` parser/validator and `src/generators/agent-routing.js` builder.
- **`worclaude worktrees clean` subcommand** (PR #128) — removes stale agent worktrees left behind by Claude Code's worktree harness.
- **`/sync` refreshes test/file metrics in CLAUDE.md and AGENTS.md** (PR #128) — fixes silent drift of `\d+ tests, \d+ files` claims.
- **Default `sandbox.network.deniedDomains` in `templates/settings/base.json`** (PR #128) — opinionated baseline deny-list shipped to every fresh init.
- **`e2e-runner` agent** (PR #130) — end-to-end test orchestration; new bundled agent.
- **`Version bump:` enforcement in `/commit-push-pr`** (PR #131) — uses `AskUserQuestion` to demand a declaration on every PR; refuses to open without one.
- **Session-lifecycle redesign** (PR #132) — `/start` and `/end` write distinct artifacts: handoff (forward-looking, `docs/handoffs/HANDOFF-{branch}-{date}.md`) vs session summary (backward-looking, `.claude/sessions/{YYYY-MM-DD-HHMM}-{branch}.md`). Both carry `sha:` frontmatter for drift detection. New `/learn` and `/update-claude-md` meta/memory commands.
- **`.claude/scratch/` and `.claude/plans/` infrastructure** (PR #133) — five dependent commands (`/review-changes`, `/refactor-clean`, `/review-plan`, `/test-coverage`, `/observability`) write SHA-tagged artifacts that `/start` surfaces, distinguishing fresh from stale findings.
- **T3.6 installation rationale + T3.8 drift detect surfaces** (PR #138) — exposes detection signals to slash commands.
- **T3.9 optional features registry** (PR #139) — opt-in toggles for non-default flows surfaced through `init` and `upgrade`.
- **Memory-architecture skill + `/update-claude-md` promotion algorithm** (PR #140) — five-layer memory model (CLAUDE.md, learnings, scratch, sessions, auto-memory). `/update-claude-md` reviews learnings and proposes targeted CLAUDE.md edits with diff preview.
- **`@claude` GitHub Action surface via `init` opt-in** (PR #146) — scaffolds `.github/workflows/claude-code.yml` exposing the @claude bot; docs document the OIDC + token-exchange contract.
- **POSIX helper scripts under `templates/scripts/`** (PR #151) — `start-drift.sh`, `sync-release-scope.sh`, `test-coverage-changed-files.sh` extract multi-line bash from `/start`, `/sync`, `/test-coverage` so each invocation matches a single allow rule. New `scaffoldScripts` function wired into Scenarios A/B/C (init, merger, upgrade flows). New `'script'` file class.
- **Expanded `templates/settings/base.json` allow list** (PR #151) — `Bash(test:*)`, `Bash([:*)`, `Bash(bash:*)`, `WebFetch(domain:docs.anthropic.com|docs.claude.com|github.com|api.github.com)`, `WebSearch`, `Skill(update-config)`, `Skill(fewer-permission-prompts)` — closes the most common in-session permission-prompt fragmentation paths.
- **CLAUDE.md Critical Rule #16** (PR #150) — commit/push/PR only when the human invokes `/commit-push-pr` or `/sync` explicitly. Conversational "yes" no longer authorizes git writes; agents refuse without a slash-command trigger.

### Changed

- ⚠ **PR #125 — 2026-04 master architecture audit + canonical 7-phase plan** — no `Version bump:` declaration (under-documented; treated as `none`). Pure docs landing into `docs/phases/`, `docs/archive/audits/2026-04/master-architecture-audit.md`, and `docs/archive/decisions/2026-04/`. Establishes the deliberation history that subsequent PRs execute against.
- **Retired 3 slash commands** (PR #130) — superseded by other workflows; net slash-command count drops from 18 to 16.
- **`/verify`, `/conflict-resolver`, `/build-fix` polished** (PR #131) — alongside the versioning enforcement work.
- **BACKLOG.md is rolling** (PR #127) — single file, items removed when scheduled; no per-release archive, no version-suffixed BACKLOG files.
- **Skill rewrite + hooks gap-fill** (PR #127) — every hook event documented in SPEC has a scaffolded handler; skills updated to current voice.

### Fixed

- **Misleading static test count in drift display** (PR #147) — `worclaude doc-lint` no longer reports a hard-coded test count when the actual count differs.
- **Phase 1 PR A drift cleanup — text + agent metadata** (PR #126) — aligns scaffold-template prose and agent frontmatter with the routing-fields contract.

### Tests

- **947 tests across 69 files** (was 804/58 at v2.8.0 release). Net +143 tests across the seven phases.

### Docs

- **Comprehensive post-Phase-1-7 docs refresh** (PR #148) — counts, new commands, observability flow surfaced consistently across CLAUDE.md, README, VitePress site.
- **Phase plans archived under `docs/archive/phases/`** (PR #149) — Phase 1, 2, 3, 4, 5, 6a, 7 deliberation history preserved post-execution.
- **Phase 1 + Phase 2 retrospectives** (PRs #129, #134) — what landed vs what slipped, lessons forward.
- **Phase 3 PR A — docs contracts T3.4/T3.5/T3.7** (PR #135) — PR template, drift-allowed sentinel, consequence lines.
- **Phase 3 PR B — small wins T3.10/T3.11** (PR #136) — handoff TTL + `sha:` frontmatter dogfood across templates.
- **Phase 5 PR A — SoT markers, SPEC ToC, PR template** (PR #141) — source-of-truth markers across templates.
- **`docs/reference/permissions.md` — "Why prompts still fire" section** (PR #151) — env-var-prefix gotcha, multi-line fragmentation, pipes/redirects, the `additionalDirectories` directory-access layer, and pointer to Claude Code's built-in `/fewer-permission-prompts` skill.

## [2.8.0] — 2026-04-24

Fixes a long-standing agent worktree correctness bug. Both `claude --worktree` and the `Agent` tool's `isolation: "worktree"` option create their isolated checkout from `origin/HEAD` — which on most worclaude-convention repos resolves to `origin/main`. When the working branch (typically `develop`) is ahead of main (the normal state mid-release-cycle), agent worktrees get a stale checkout that misses recent commits, producing "missing develop files" symptoms easy to misattribute to tooling flakiness. This release ships two complementary fixes: a new `worclaude doctor` check that detects and warns on the at-risk configuration with a local, reversible remedy (`git remote set-head origin <branch>`), and a freshness preamble on the three bundled worktree agents (`bug-fixer`, `verify-app`, `test-writer`) that resets the worktree to match the parent's current branch regardless of `origin/HEAD`. Documentation in `subagent-usage` now correctly describes the harness behavior instead of the previous "creates a worktree from your current branch" claim.

### Added

- **`worclaude doctor` Git Integration / `origin/HEAD` divergence check** (PR #121) — warns when the current branch is ahead of `origin/HEAD`'s target, naming the branch and commit count. Suggests `git remote set-head origin <branch>` (local-only, reversible via `--auto` or `main`) as the fix. Skips silently outside a git repo or when `origin/HEAD` is unset. Shared `runGit(cwd, args)` helper added alongside for future checks to reuse the same spawn pattern.
- **Worktree freshness preamble on `bug-fixer`, `verify-app`, `test-writer` agent templates** (PR #121) — on worktree start the agent runs `git fetch origin`, identifies the parent's current branch from `git worktree list --porcelain` (filtering out auto-named `worktree-agent-*` branches), then `git reset --hard "origin/${PARENT_BRANCH}"`. Protects correctness even when the user hasn't run `set-head`. LLM-driven parsing (no `awk`/`sed` pipelines) for cross-platform portability.

### Changed

- **`subagent-usage` skill (both `.claude/skills/subagent-usage/SKILL.md` and `templates/skills/universal/subagent-usage.md`)** (PR #121) — "How it works" item 1 corrected from "creates a worktree from your current branch" to "creates a worktree based on `origin/HEAD` (see gotcha below)". New "Base-branch gotcha" subsection cross-links to `worclaude doctor` and the `git remote set-head` remedy, and notes that the three bundled agents include a freshness preamble while other worktree agents do not.

### Docs

- **`docs/spec/SPEC.md` doctor section** (this /sync) — adds a `### Git Integration` subsection documenting both the gitignore coverage check and the new origin/HEAD divergence check.
- **`docs/spec/PROGRESS.md`** (this /sync) — new v2.8.0 release entry; Stats refreshed (788 → 804 tests, 57 → 58 files).

## [2.7.1] — 2026-04-24

Three `/setup` UX follow-ups from v2.7.0 confirmation testing, shipped as a single patch PR. The `?` / `help` trigger introduced in v2.7.0 turned out to collide with Claude Code's built-in keyboard-shortcut overlay (pressing `?` opens the shortcut panel before /setup's parser sees the keystroke); switched to the `help` keyword only. `worclaude init`'s `runOptionalExtras` was the only place in the init flow still using `inquirer type: 'confirm'` (rendered as `(y/N)`) — converted to `type: 'list'` arrow-key menus so every yes/no in init behaves consistently. CONFIRM_MEDIUM now invokes `AskUserQuestion` directly when the per-item option count fits the tool's `maxItems: 4` schema cap, with the consequence info ("Will be saved as") carried inside each option's `description` field; falls back to the verbatim text prompt (using `help` instead of `?`) when the count exceeds 4. CONFIRM_HIGH stays text-parse — detection lists routinely exceed 4 items. No consumer-visible schema or CLI surface additions.

### Fixed

- **`/setup` `?` help trigger → `help` keyword** (PR #119) — 9 occurrences across CONFIRM_HIGH + CONFIRM_MEDIUM prompt templates, response-parsing bullets, error restates, and the Field-help table intro. Explanatory notes added so future maintainers don't re-add `?`.
- **`worclaude init` prompt-type consistency** (PR #119) — `runOptionalExtras` (src/commands/init.js:77-93) converted the plugin.json and gtd-memory prompts from `type: 'confirm'` (the only `(y/N)` text inputs in init) to `type: 'list'` with boolean-valued Yes/No choices. Regression test inspects `inquirer.prompt.mock.calls` directly.

### Changed

- **`/setup` CONFIRM_MEDIUM (≤4 options) uses `AskUserQuestion`** (PR #119) — State 3 split into Path 1 (AskUserQuestion path) and Path 2 (verbatim text fallback, >4 options). Rule #5 widens the AskUserQuestion permit to include CONFIRM_MEDIUM. Rule #7 picks up an explicit EXCEPTION paragraph. Storage rule from v2.6.5 (`mediumResolved[field]` must be a string) applies uniformly across both paths.

### Docs

- **`docs/spec/SPEC.md` `/setup` section** (this /sync) — reflects the `help`-keyword-only trigger and the CONFIRM_MEDIUM ≤4-option AskUserQuestion path.
- **`docs/spec/PROGRESS.md`** (this /sync) — new v2.7.1 release entry; Stats refreshed (782 → 788 tests).

## [2.7.0] — 2026-04-23

`/setup` hardening + UX revamp release. PR #115 closes 8 backend bug clusters surfaced by the v2.6.3 manual test matrix (upgrade-flow correctness, downgrade guard, doctor ghost detection, scaffolder exec bits, Commander routing). PR #116 fixes four `/setup` template failure modes — missing `schemaVersion` in SCAN state, `readme` object-shape mismatch in CONFIRM_MEDIUM, all-22-questions-asked despite detection, accept-off-topic-as-answer — and adds a `--from-file` flag to `worclaude setup-state save` plus `Bash(worclaude:*)` permissions so `/setup` runs without approval-prompt interruption. PR #117 adopts Claude Code's `AskUserQuestion` tool for 10 enumerable interview questions (arrow-key selection instead of free-text), redesigns CONFIRM prompts with a "Will be saved as" consequence sub-line and `?` / `help` command, and drops the 80-char readme truncation so users can read the full description before accepting. Dogfood-relevant: `.claude/commands/setup.md` auto-updates on `worclaude upgrade` to pick up the new template.

### Added

- **`worclaude setup-state save --from-file <path>`** (PR #116) — new CLI flag reading JSON state from a file path, mutually exclusive with `--stdin`. `/setup` now uses `Write` → `.claude/cache/setup-state.draft.json` → `--from-file` instead of heredoc-piped `--stdin`, eliminating the shell-interpolation safety prompts that interrupted every state transition.
- **`Bash(worclaude:*)` permission entries in `templates/settings/base.json`** (PR #116) — scoped for `worclaude`, `worclaude scan`, and `worclaude setup-state`. Freshly init'd projects run `/setup` end-to-end without approval prompts.
- **`/setup` Interaction mode contract** (PR #117) — four modes: `selectable` (`AskUserQuestion` single-choice), `multi-selectable` (`AskUserQuestion` multi-choice with `None` + `Other`), `hybrid` (detection pre-fill + accept/edit/replace), and `free-text`. Ten interview questions get non-default modes: `arch.classification`, `conventions.errors` / `logging` / `api_format`, `verification.staging` (selectable); `arch.external_apis`, `verification.required_checks` (multi-selectable); `features.core` / `nice_to_have` / `non_goals` (hybrid). Fallback to numbered-list parsing for Claude Code versions without `AskUserQuestion`.
- **`/setup` Field-help table** (PR #117) — single-source-of-truth reference listing all 14 detection fields + 22 questionIds with plain-English description, target output file/section, and example answer. Drives both the CONFIRM "→ Will be saved as: <target>" consequence line and the `?` / `help` command output.
- **`/setup` Detection-skip matrix** (PR #116) — auto-fills four questionIds with `"[auto-filled from <field>]"` when the scanner already answered them: `story.problem` (via readme), `arch.classification` (via monorepo), `arch.external_apis` (via externalApis), `workflow.new_dev_steps` (via scripts + readme).

### Changed

- **`/setup` CONFIRM prompts** (PR #117) — `readme` render is no longer truncated to 80 chars + `…` (verbatim, 100-char soft-wrap); every detected item shows `→ Will be saved as: <target>` sub-line; `?` / `help` response produces the Field-help block without advancing state.
- **`/setup` INTERVIEW reply handling** (PR #116) — explicit classifier step with Answer / Skip / Cancel / Back / OFF-TOPIC buckets. OFF-TOPIC MUST restate, MUST NOT record, MUST NOT advance, MUST NOT persist. "Prefer off-topic when uncertain" guidance makes the rule less discretionary.
- **`/setup` SCAN state** (PR #116) — explicit `schemaVersion: 1` in a worked JSON example. Persist step uses `--from-file` with a `.claude/cache/setup-state.draft.json` staging path.
- **`/setup` CONFIRM_MEDIUM Storage rule** (PR #116) — `mediumResolved[field]` MUST be a string (never the raw `item.value` object). Applies to `readme` specifically, where the detector returns `{projectDescription, setupInstructions, fullPath}`.
- **`worclaude setup-state` validator error** (PR #116) — `mediumResolved.<field> must be a string` message now includes the received type and points at the CONFIRM_MEDIUM Storage rule.
- **`worclaude upgrade` preview** (PR #115) — new "Deleted (removed in current version)" section shows phantom hash entries (`categories.missingUntracked`) that the upgrade will prune. Previously silent.
- **`scaffoldAgentsMd` helper** (PR #115) — shared between `init.js scaffoldFresh` and `merger.js mergeAgentsMd`. Both call sites preserve pre-existing AGENTS.md and write the template alongside under `.claude/workflow-ref/AGENTS.md`.
- **`.claude/settings.json`** (PR #116, dogfood) — this repo's own install merges in `Bash(worclaude:*)` permissions so the dev-repo's Claude Code session doesn't hit approval prompts.

### Fixed

- **Legacy `*.workflow-ref.md` siblings stranded on version match** (PR #115) — `migrateWorkflowRefLocation` is now called before `upgrade.js`'s version-match early-exit and inside `runRepairOnlyFlow`. Projects with leftover siblings on the current version self-heal on the next `worclaude upgrade`.
- **Silent future-version downgrade via `worclaude upgrade --yes`** (PR #115) — new `semverGreaterThan` helper refuses downgrades with an actionable message (`Refusing to downgrade: installed vX.Y.Z is newer than CLI vA.B.C`) instead of rewriting meta to an older version with a success banner.
- **`doctor` missed ghost learnings files** (PR #115) — the `.claude/learnings/` check now warns on `.md` files present on disk but missing from `index.json`. Orphan detection (reverse direction) was already working.
- **`worclaude upgrade --yes` crashed on hook-conflict prompt** (PR #115) — discovered while scripting real-old-CLI upgrades during the v2.6.3 test cycle. `--yes` now threads into `promptHookConflict` and returns `'keep'` (safest default: never clobbers user customizations). Scripted upgrades across hook-template boundaries no longer require manual answers.
- **Fresh `worclaude init` silently overwrote existing AGENTS.md** (PR #115) — `scaffoldFresh` gates the write on `fileExists(AGENTS.md)` just like the merge path does. User-authored Cursor/Codex AGENTS.md is preserved byte-for-byte; template goes to `.claude/workflow-ref/AGENTS.md`.
- **Hook `.cjs` files had inconsistent exec bits post-scaffold** (PR #115) — `scaffoldHooks` now runs `fs.chmod(destPath, 0o755)` after each copy (POSIX-guarded). Previously dependent on template source mode; some files landed as `755`, some as `644`.
- **`worclaude setup-state <unknown>` exited with Commander's default code 1** (PR #115) — `setupState.on('command:*', ...)` listener emits the spec-matching `Error: unknown setup-state subcommand: <x> (expected one of show, save, reset, resume-info)` and sets `process.exitCode = 2`, aligning with the exit-2 convention `setup-state.js` already uses for bad arguments.

### Docs

- **`docs/spec/SPEC.md` `/setup` section** (this /sync) — rewritten to reflect the v2.7.0 surface: `--from-file` persistence path, Detection-skip matrix, Interaction mode contract, Field-help table, OFF-TOPIC classifier, `?` / `help` command, `AskUserQuestion` whitelisted at INTERVIEW states only.
- **`docs/spec/PROGRESS.md`** (this /sync) — new v2.6.3 and v2.7.0 release entries; Stats refreshed (729 → 782 tests, 53 → 57 test files).

## [2.6.3] — 2026-04-22

Second supply-chain scanner mirrored after Socket. Adds a `.snyk` policy file at the repo root with `exclude.global: [tests/fixtures/**]` so Snyk Open Source — whether invoked via the Snyk CLI, the `snyk/actions/node` GitHub Action, or any future integration — skips the intentionally-outdated fixture manifests under `tests/fixtures/scanner/**` that exist solely as deterministic inputs to the Part A project-scanner detectors (`next@14.2.3`, `vitest@1.4.0`, `prisma@5.10.0`, etc.). The fixtures are never installed (not referenced from root `package.json`), never shipped (excluded from the npm tarball by the `files` whitelist), and never executed. `SECURITY.md` is updated to name `.snyk` alongside `socket.yml` in the fixture-exclusion paragraph. The installed Snyk GitHub App only imports root `package.json` today, so the most immediate effect is keeping local `snyk test` runs honest; the file is also load-bearing for any future workflow that fails the build on high-severity findings. No runtime change for worclaude consumers.

### Added

- **`.snyk` policy file at repo root** (PR #112) — `version: v1.25.0` schema with `exclude.global: [tests/fixtures/**]` plus empty `ignore` and `patch` blocks. Mirrors the `socket.yml` pattern committed in v2.6.1 so Snyk Open Source treats the scanner fixtures the same way Socket does.

### Docs

- **`SECURITY.md` "Test fixture manifests are not real dependencies"** (PR #112) now names `.snyk` alongside `socket.yml` as the equivalent ignore directive for Snyk. The catch-all "Other SCA tools may need an equivalent `ignore` directive" sentence is preserved for any future scanner.

## [2.6.2] — 2026-04-22

Dev-dependency security bump. Adds an npm `overrides` entry pinning `brace-expansion` to `^1.1.13` to clear [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) — a moderate regex-DoS advisory against the 1.1.12 pulled transitively by `eslint → minimatch`. Post-override the lockfile resolves `brace-expansion@1.1.14` and `npm audit` drops from four moderate advisories to three. `SECURITY.md` is extended with a "Dev-only transitive advisories pending upstream fixes" section documenting the two remaining alerts ([GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) vite path traversal, [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) esbuild dev-server CORS) as upstream-blocked by the vitepress `1.6.4 → vite ^5 → esbuild ^0.21.3` chain — `npm overrides` cannot force esbuild past the vite peer contract, and no `vitepress@2.x` is on npm yet. Both advisories are dev-only (excluded from the published tarball by the `files` whitelist) and only reachable while a local dev server is running; tracked for upgrade in [issue #109](https://github.com/sefaertunc/Worclaude/issues/109). No runtime change for worclaude consumers.

### Fixed

- **`brace-expansion` regex DoS** (PR #110) — `"overrides": { "brace-expansion": "^1.1.13" }` added to `package.json`; lockfile now resolves `brace-expansion@1.1.14` under `eslint 9.39.4 → minimatch 3.1.5`. Clears GHSA-f886-m6hf-6m8v.

### Docs

- **SECURITY.md — "Dev-only transitive advisories pending upstream fixes"** (PR #110) documents GHSA-4w7w-66w2-5vf9 and GHSA-67mh-4wv8-2f99 as accepted risk pending a `vitepress` release on `vite >=6.4.2`. Rationale: both are devDeps only, excluded from the npm tarball, and only reachable while `npm run docs:dev` is running. Tracking issue #109.

## [2.6.1] — 2026-04-22

Supply-chain scanner hygiene. Adds a `socket.yml` at the repo root so Socket (and any tool honoring the same schema) stops treating `tests/fixtures/scanner/**` manifests as real worclaude dependencies. The fixtures pin intentionally-outdated packages (`next@14.2.3`, `vitest@1.4.0`, `prisma@5.10.0`, etc.) as deterministic inputs to the Part A detectors — they are never installed (not referenced from root `package.json`), never shipped (`tests/` is excluded by the npm `files` whitelist), and never executed. Without the ignore, fixture deps surface on PR reviews as critical CVEs (CVE-2025-29927 Next.js middleware auth bypass, Vitest 1.4.0 RCE) that do not apply to worclaude. `SECURITY.md` is expanded with a "Supply Chain Scanner Findings" section documenting the fixture rationale, the real seven-package runtime dependency list, and the by-design `filesystemAccess` capability disclosure on `fs-extra`-heavy scaffolding code.

### Added

- **`socket.yml` at repo root** (PR #107) — `version: 2` schema with `projectIgnorePaths: [tests/fixtures/**]`. Respected by Socket's GitHub App on every PR review and by the Socket CLI's `socket scan create` command. Verified locally via `socket scan create --report`: manifests discovered drop from 21 to 6, scan verdict goes from unhealthy (2 critical + many high/medium false positives) to `healthy: true, alerts: 0` at warn level.

### Changed

- **`SECURITY.md` supported-versions row** bumped to `2.6.x` (from `2.4.x`) to reflect the current support window.

### Docs

- **`SECURITY.md` — Supply Chain Scanner Findings section** (PR #107) documents (1) why `tests/fixtures/scanner/**` manifests are not real dependencies, (2) worclaude's real seven-package runtime dep list, and (3) the `filesystemAccess` capability flag as a by-design disclosure for a scaffolding CLI rather than a vulnerability. Intended as a standing reference for any future SCA tool that surfaces the same false positives.

## [2.6.0] — 2026-04-22

Diagnose-first `/setup`. This release lands both halves of Phase Setup Diagnose in a single version: Part A (PR #103) ships the static project scanner and the new `worclaude scan` subcommand, and Part B (PR #104) rewrites `/setup` on top of it as a deterministic 12-state state machine with on-disk persistence, a tool-call whitelist, and a Claude-rendered selectable UI. Running `/setup` against a mature project now scans first (14 Tier 1 detectors produce a `DetectionReport`), presents the high-confidence facts as a numbered checklist for the user to confirm or uncheck, handles multi-candidate medium-confidence items (e.g., competing lockfiles), and only asks residual questions during the interview — cutting the interview from ~30 questions to whatever detection didn't cover. State survives interruption via `.claude/cache/setup-state.json`, persisted after every mutation through the new `worclaude setup-state` CLI (the sole write path `setup.md` is permitted to use under its tool whitelist). WRITE merges into existing output files conservatively: `CLAUDE.md` replaces `## Tech Stack` and `## Commands` sections by ATX heading; `SPEC.md` and SKILL files are rewritten only when template-only per CRLF-normalized SHA-256 match against `workflow-meta.json`, otherwise append a timestamped section; `PROGRESS.md` is append-only.

### Added

- **`worclaude scan` subcommand + detection engine** (PR #103, Part A) — new CLI subcommand that statically scans a project and produces a structured `DetectionReport` describing what it found. The report lands at `.claude/cache/detection-report.json` (machine-generated, gitignored, overwritten on every run). Ships 14 Tier 1 detectors under `src/core/project-scanner/detectors/` — one file per concern: `package-manager`, `language`, `frameworks`, `testing`, `linting`, `orm`, `deployment`, `ci`, `scripts`, `env-variables`, `external-apis`, `readme`, `spec-docs`, `monorepo`. Detector registration is directory-scan-based — adding a new detector means adding a new `.js` file, not editing the scanner. Each detector runs in parallel with a 5-second timeout; failures and timeouts are recorded in a per-report `errors` array without aborting the scan.
- **CLI options for `scan`** (PR #103): `--path <dir>` (defaults to `process.cwd()`), `--json` (prints the full report to stdout, suppresses summary), `--quiet` (suppresses summary, still writes the cache file). Exit codes: `0` on any completed scan (even with per-detector errors), `1` on fatal errors (invalid path, un-writable cache).
- **`pyproject.toml` dep flattening** (PR #103) — `frameworks`/`testing`/`linting`/`orm` detectors read all five dep locations (`[project.dependencies]`, `[project.optional-dependencies.*]`, `[tool.poetry.dependencies]`, `[tool.poetry.group.*.dependencies]`, `[dependency-groups.*]`) and flatten into a single map before matching. Fixtures exist for PEP 621, PEP 735, and Poetry-group layouts.
- **Runtime dependencies** (PR #103): `smol-toml` (TOML parsing for `pyproject.toml`, `Cargo.toml`) and `yaml` (for `pnpm-workspace.yaml`, `Taskfile.yml`). Both are small, pure-JS, and zero-runtime-cost.
- **`/setup` state machine rewrite** (PR #104, Part B) — `templates/commands/setup.md` is rewritten top-to-bottom as a 12-state state machine (`INIT → SCAN → CONFIRM_HIGH → CONFIRM_MEDIUM → INTERVIEW_STORY/ARCH/FEATURES/WORKFLOW/CONVENTIONS/VERIFICATION → WRITE → DONE`). `/setup` now invokes the Part A scanner at SCAN, presents detected facts via a Claude-rendered numbered checklist at CONFIRM_HIGH (user confirms or unchecks), handles multi-candidate medium-confidence items (`package-manager` with multiple lockfiles → numbered candidate list) at CONFIRM_MEDIUM, asks only residual questions during the six INTERVIEW states, and merge-writes the six output files at WRITE (CLAUDE.md is section-replaced by ATX heading, SPEC/SKILL files are rewritten only when template-only per CRLF-normalized SHA-256 match against `workflow-meta.json`, PROGRESS.md is append-only).
- **`src/core/setup-state.js`** (PR #104) — persistence module for `.claude/cache/setup-state.json` (schemaVersion 1). Exports `loadSetupState`, `saveSetupState`, `clearSetupState`, `isSetupStateStale`, plus the `STATE_NAMES`, `QUESTION_IDS`, and `UNCHECKED_ROUTING` contract constants. Schema validation rejects unknown `currentState` values, `interviewAnswers` keys outside the QuestionId enumeration, mis-routed `<state>.unchecked.<field>` prefixes, and non-string answer values. `saveSetupState` preserves `startedAt` from an existing file across re-saves and refreshes `updatedAt` automatically.
- **`worclaude setup-state` CLI subcommand** (PR #104) — four sub-subcommands: `show` (prints state JSON or `no state`), `save --stdin` (reads JSON from stdin, validates, persists — the ONLY mechanism `/setup` uses to write state), `reset` (idempotent delete), `resume-info` (pre-formatted `state: X, age: N unit(s), staleness: fresh|stale` line so Claude echoes rather than computes relative time). Exit codes: `0` success, `1` fatal, `2` invalid args.
- **Anti-drift rules embedded in `setup.md`** (PR #104) — seven CRITICAL EXECUTION RULES pinned at the top of the command file. Sequential state advance only; no backward advance within an invocation; off-topic input triggers a restate, never an answer; `cancel setup` matches regex `/^(cancel|stop|abort)( setup)?[.!?\s]*$/i` and preserves state; tool use is whitelisted (scanner + `setup-state` CLI + two cache reads between SCAN and WRITE; the six target file reads/writes only at WRITE, plus `workflow-meta.json` for hash lookup); no memory pre-fill from prior sessions; prompts render verbatim in fenced code blocks, including state-machine control prose (resume preamble, back rejection, off-topic restate prefix, cancel acknowledgment).
- **QuestionId enumeration** (PR #104) as the load-bearing `interviewAnswers` key contract (22 IDs across 6 INTERVIEW states) plus a `<state>.unchecked.<field>` prefix namespace for rejected high-confidence field re-asks, routed per a documented table (e.g., `scripts` rejected at CONFIRM_HIGH → re-asked in INTERVIEW_WORKFLOW under key `workflow.unchecked.scripts`).
- **Field rendering table** reproduced in `setup.md` (PR #104) — the contract between detection report shapes and the human-readable value strings rendered at CONFIRM_HIGH and CONFIRM_MEDIUM. Mirrors `src/commands/scan.js:summarizeValue` semantics for all 14 detector fields plus the fallback scalar/array/object cases.

### Changed

- **`.gitignore` scaffolder** (PR #103) — `updateGitignore()` in `src/core/scaffolder.js` now writes `.claude/cache/` in addition to the existing seven entries. `cleanGitignore()` in `src/core/remover.js` removes the new entry on `worclaude delete`.
- **`/setup` precondition** (PR #104) — `.claude/workflow-meta.json` must exist (canonical Worclaude init marker). Non-init'd projects get a clear "Run `worclaude init` first" message and exit, replacing the prior behavior of proceeding with undefined semantics.

### Tests

- **107 new scanner tests** (PR #103) across `tests/core/project-scanner/detectors/*.test.js` (14 files, 83 tests — positive, negative, and edge cases including multiple lockfiles, all four pyproject dep locations, quoted/prefixed env lines, monorepo with and without workspaces), `tests/core/project-scanner/index.test.js` (12 tests — happy path against six real fixtures, broken-detector and slow-detector handling via the `overrideDetectors` test seam, JSON round-trip), `tests/core/project-scanner/write-report.test.js` (7 tests), `tests/commands/scan.test.js` (5 tests — `--path`, `--json`, `--quiet`, cwd default, and exit-code-1 paths). 8 fixtures under `tests/fixtures/scanner/`: `nextjs-pnpm/`, `fastapi-poetry/`, `fastapi-pep621/`, `fastapi-pep735/`, `rust-cli/`, `monorepo-pnpm/`, `empty/`, `mixed-lockfiles/`.
- **47 new setup-state tests** (PR #104) — `tests/core/setup-state.test.js` (24 unit tests covering load/save/clear/isStale happy paths, corrupt JSON, unsupported schemaVersion, unknown currentState, unknown interviewAnswers keys, mis-routed unchecked prefixes, startedAt preservation, updatedAt refresh, custom staleHours) and `tests/commands/setup-state.test.js` (23 CLI tests — four subcommands' happy and error paths, `save --stdin` round-trip with an in-process `inputStream` injection seam plus one end-to-end `spawnSync` smoke test, `resume-info` unit picking at minute/hour/day boundaries, invalid-arg exit 2). Total suite: **729/729 pass**.

### Non-goals (explicitly deferred)

- No `/setup --edit <field>` flow for correcting prior answers (Tier 2).
- No automated state-machine test harness (mock-Claude driver walking every transition). Tier 2.
- No automated end-to-end testing of `/setup` across fixture projects — manual e2e per the 13-case checklist in the phase prompt.
- No schema migrator for `setup-state.json`. v1 policy is "reset on schema bump."
- No architecture classification, directory-tree module inference, CI required-check detection (GitHub API), or monorepo sub-package scanning — all Tier 2.
- No rename of the existing `src/core/detector.js` (scenario detection). The new scanner lives under `src/core/project-scanner/` to avoid name collision.

## [2.5.1] — 2026-04-21

Patch release fixing a user-visible bug found while dogfooding the v2.5.0 upgrade: reference-copy template files (the copies worclaude writes when your customized file and the shipped template both change) were being placed as `.workflow-ref.md` siblings next to the live file — including inside `.claude/commands/`, where Claude Code's command loader discovered them as phantom slash commands like `/sync.workflow-ref`, and inside `.claude/agents/`, where they could shadow live agents. Reference copies now live in a dedicated `.claude/workflow-ref/` tree that Claude Code does not scan. Installs upgrading from pre-v2.5.1 have their legacy reference files automatically relocated on the next `worclaude upgrade`.

### Fixed

- **Phantom slash commands from reference-copy siblings** (PR #101) — ref files are now written under `.claude/workflow-ref/<original-path>/` with the original filename preserved, instead of as `<name>.workflow-ref.md` siblings next to the live file. `.claude/commands/` and `.claude/agents/` are no longer polluted by `.workflow-ref` artifacts, so Claude Code's command and subagent loaders don't register them as live. `diff .claude/workflow-ref/commands/sync.md .claude/commands/sync.md` now reads cleanly.

### Added

- **`migrateWorkflowRefLocation()` in `src/core/migration.js`** (PR #101) — runs unconditionally at the start of every `worclaude upgrade`. Sweeps legacy `*.workflow-ref.md` siblings under `.claude/{commands,agents,skills}/` (plus root-level `CLAUDE.md.workflow-ref.md` and `AGENTS.md.workflow-ref`) into the new `.claude/workflow-ref/<original-path>/` tree. Idempotent (skips when target already exists, never overwrites). Scoped scan avoids re-stat'ing `.claude/sessions/` on every upgrade. Deliberately not version-gated — semver-gating this kind of cleanup migration creates a new bug class for users who downgrade then re-upgrade.
- **Shared helpers in `src/core/file-categorizer.js`** (PR #101) — `WORKFLOW_REF_DIR` constant, `workflowRefRelPath(keyOrRelPath)` returning project-root-relative paths for `scaffoldFile`, `resolveRefPath(keyOrRelPath, projectRoot)` for absolute writes, and `isWorkflowRefFile(absPath, claudeDir)` predicate that unifies new-location-or-legacy-suffix detection so `status`, `doctor`, and `remover` stay in sync across the transition window.

### Changed

- **`worclaude upgrade` report output** (PR #101) — "Conflicts: N files (saved as .workflow-ref.md)" → "Conflicts: N files (saved under .claude/workflow-ref/)". New "Relocated: N legacy ref file(s) → .claude/workflow-ref/" line surfaces the one-time migration when it fires. Final hint reads "Review files under .claude/workflow-ref/ and merge what's useful."
- **`worclaude init` and `worclaude status` output** (PR #101) — Scenario B conflict block, Next Steps, and Pending Review list all updated to reference the new location. Status continues to surface legacy `*.workflow-ref.md` siblings anywhere under `.claude/` so users upgrading from pre-v2.5.1 still see what they need to resolve before the next upgrade migrates them.
- **`src/core/remover.js`** (PR #101) — the entire `.claude/workflow-ref/` subtree is classified as safe-to-delete on `worclaude delete`; the empty-subdir cleanup list extended to include `workflow-ref`.

### Docs

- **Upgrading guide** (PR #101) — 7 inline references updated plus a new "Upgrading from pre-v2.5.1 installs" subsection explaining what the automatic relocation does and how the skip-on-collision rule works.
- **Existing-projects guide** (PR #101) — Tier 2 "Safe Alongside" section rewritten to describe the new `.claude/workflow-ref/` layout; post-merge report sample updated; the "Reviewing reference files" section now shows the clean `diff workflow-ref/commands/sync.md commands/sync.md` idiom.
- **Commands reference, agents reference, SPEC.md, project-patterns skill** (PR #101) — all references to `.workflow-ref.md` sibling layout updated; `docs/spec/SPEC.md` edited on the feature branch as a shared-state override (PR #79 precedent: the SPEC update describes the very behavior the PR adds).

### Tests

- **Relocation migration coverage** (PR #101) — 8 new cases in `tests/core/migration.test.js` covering command/agent/skill subdir sweeps, root-level `CLAUDE.md.workflow-ref.md` / `AGENTS.md.workflow-ref` handling, target-collision skip behavior, idempotency on repeated runs, no-op on projects with files already at the new location, and clean-project no-ops. Regression assertions in `tests/commands/upgrade.test.js`, `tests/commands/init.test.js`, and `tests/core/merger.test.js` explicitly verify that `.workflow-ref.md` siblings are NEVER created inside `.claude/commands/` or `.claude/agents/`, so the phantom-command class of bug cannot silently return. 575/575 pass (567 prior + 8 new).

## [2.5.0] — 2026-04-21

First release under the new per-PR bump declaration workflow. Shifts release mechanism from "every `/sync` publishes" to "every PR declares a bump, `/sync` aggregates, and only user-visible work ships." PR authors now declare `Version bump: {major|minor|patch|none}` in their PR body; `/sync` picks the highest declared bump since the last tag using precedence `major > minor > patch > none`. All-`none` batches update shared-state files on develop but never cut a release — internal-only work (docs, CI, tests) accumulates without triggering noisy publishes.

### Added

- **Per-PR `Version bump:` declaration** (PR #99) — new step 6 in `/commit-push-pr` asks authors to declare `major`/`minor`/`patch`/`none` in the PR body; revert PRs match the bump of the PR being reverted; ambiguous cases ASK the user. The declaration is pasted into both `templates/commands/` (scaffolded into user projects) and `.claude/commands/` (Worclaude's own runtime), kept byte-identical by convention.
- **`/sync` aggregation rewrite** (PR #99) — replaces the single-step version bump with bootstrap (no-tag → yes/custom/cancel prompt, broadened semver regex accepts pre-release/build metadata, push-failure recovery), aggregation (`gh pr list --limit 500`, `%as` date format to avoid GitHub-search incompatibility with `%ai`, release-PR filter via `headRefName=develop`+`baseRefName=main`, missing-declarations treated as `none`+warning carried through to release PR body and CHANGELOG), ship/wait confirmation (always prompts including for `major`), CHANGELOG append with section defaults mapped from bump type (major/minor → Added, patch → Fixed) and content-driven placement across `### Added`/`### Changed`/`### Fixed`/`### Tests`/`### Docs`.
- **`tests/templates/version-bump-consistency.test.js`** (PR #99) — new 8-case Vitest asserts `Version bump:` appears literally in all 8 authoritative files (`CLAUDE.md`, both tree copies of `commit-push-pr.md`, `sync.md`, `git-conventions`, and `.github/pull_request_template.md`). Catches rename drift (e.g., `Version bump:` → `Release bump:` in one file without the others). Uses `import.meta.dirname`-derived `REPO_ROOT` matching the `v2-audit` test convention.
- **`.github/pull_request_template.md`** — required `Version bump:` field with HTML-comment placeholder.

### Changed

- **CLAUDE.md Rule #13** reworded: "every merge to `main` gets at least a patch bump" → "every merge to `main` IS a release." Internal-only `none`-only batches now update shared-state files on develop but never reach `main`.
- **`.claude/skills/git-conventions/SKILL.md`** — fixed two pre-existing statements that contradicted the new policy: line 117 "every merge to main gets at least a patch bump" replaced with release-carries-bump wording; line 124 table row for docs/CI/tests changed from `patch` to `none (no release)`. `templates/skills/universal/git-conventions.md` already said "no bump" so no contradiction-fix was needed there; both files now have the new `### Per-PR bump declarations` + `### Edge cases` subsections appended identically. Unrelated wording divergence between the two trees left alone.
- **`README.md`** — short "Batched releases" bullet in the "Why Worclaude" section.
- ⚠ **PR #98 (`fix(upstream): advance state on SKIP_ISSUE`)** — no `Version bump:` declaration (merged 2026-04-21 14:58 UTC, before PR #99 introduced the workflow). Treated as `none` with warning per bootstrap handling. Under-documentation made visible here rather than silently lost. The fix itself advances `.github/upstream-state.json` whenever Claude returns `SKIP_ISSUE` so no-new-item runs don't re-evaluate the same feed indefinitely.

## [2.4.12] — 2026-04-20

Internal fix release — first post-v2.4.11 `upstream-check` run on `main` (workflow run 24693290867) failed with `error_max_turns / num_turns: 16` at the Claude cross-reference step. Not a parser issue: the v2.4.11 format-drift fix still works; Claude simply couldn't fit the workload into 15 turns. The prompt requires ~9 `Read` calls (feed inputs + `.claude/commands/upstream-check.md` + cross-reference against agents/commands/hooks templates, `src/data/agents.js`, `src/data/agent-registry.js`, `docs/spec/BACKLOG-v2.1.md`, `CLAUDE.md`) before the final response — each Read burns a turn, so 15 was tight by luck, not by design.

### Fixed

- `.github/workflows/upstream-check.yml` — `--max-turns` bumped from 15 to 25 in the `claude_args` string. Gives comfortable headroom for reads + reasoning + response without being excessive. If the cross-reference list grows further, revisit.

## [2.4.11] — 2026-04-20

Internal fix release — the `upstream-check` workflow parser has been unable to classify any item correctly since the `anthropics/claude-code-action` SHA was pinned to v1.0.101. The action writes `$RUNNER_TEMP/claude-execution-output.json` as a pretty-printed JSON array (`JSON.stringify(messages, null, 2)`), not the newline-delimited JSONL our parser assumed. Every per-line `JSON.parse` failed on fragments like `[` and `{`, so `extractAssistantText` always returned `null` and the parser fell through to the raw-content fallback — which never matched the `SKIP_ISSUE` / `# Title: ` contract, producing a parse-error fallback issue on every run with new items. Misdiagnosed as prompt/contract drift (issue #89); the 2.4.10 fallback-size fix delivered the diagnostic (issue #91) that revealed the real cause.

### Fixed

- `scripts/upstream-parse.mjs` — `extractAssistantText` now parses the execution file as a single JSON array and pulls text-only content from the last non-empty `assistant` event. `tool_use` blocks are filtered out so tool-call turns (Claude reading feed files) cannot clobber the real final response. Falls back to treating the raw content as the response only when JSON parsing fails — preserves the existing plaintext path. JSONL support removed entirely: the action SHA is pinned and the format is deterministic.

### Changed

- `scripts/upstream-parse.mjs` — post-implementation cleanup (PR #92 follow-up): removed the unreachable "empty title" branch and the redundant `stripBomAndLeading()` (ECMAScript `trim()` already strips U+FEFF); hoisted parser grammar to named constants (`SKIP_MARKER`, `TITLE_PREFIX`, `BODY_MARKER`) and the empty-output template to `EMPTY_OUTPUTS`; added defaults to `reportParseError`; fixed a double UTF-8 encoding in `buildRawBody` (encode once, reuse `buf.byteLength`). Script reduced from 205 to 188 lines with no behavior change.

### Tests

- `tests/scripts/upstream-parse.test.js` — 14 → 20 tests. New fixtures `exec-with-tool-use.json` (tool_use filtering across multiple turns) and `exec-with-hooks.json` (worclaude's dogfooded `SessionStart` hook emits `system:hook_response` events carrying a payload that includes the literal token `SKIP_ISSUE` in prose — parser must NOT treat hook output as Claude's response). Old `.jsonl` fixtures deleted and regenerated as `.json` arrays to match the real on-disk filename. Suite now 559 tests across 33 files.

## [2.4.10] — 2026-04-20

Internal fix release — the `upstream-check` workflow's parse-error fallback (which files a diagnostic issue when Claude's response fails the parser contract) itself failed on 2026-04-20 with `GraphQL: Body is too long (maximum is 65536 characters) (createIssue)`. The fallback wrote the entire `.jsonl` execution transcript — assistant turns plus every `Read` tool call and result — as the issue body. Claude reads three input files per run, so the transcript routinely exceeds GitHub's 65 KB issue body limit. The fallback path broke precisely when it was supposed to deliver diagnostic data.

### Fixed

- `scripts/upstream-parse.mjs` — `buildRawBody()` now prefers the extracted last assistant turn over the full transcript (no tool-result noise). Falls back to the transcript only when assistant text is empty or unparseable. Truncates at 60,000 bytes with a `[truncated]` marker, byte-aware so UTF-8 sequences aren't split. The next parse-error will open a readable fallback issue with Claude's actual response, enabling diagnosis of contract drift (tracked in issue #89).

### Changed

- `scripts/upstream-parse.mjs` now exports `runParse`, `buildRawBody`, `extractAssistantText`, and `MAX_RAW_BYTES`. The CLI entry is guarded with an `import.meta.url` check — still directly executable via `node scripts/upstream-parse.mjs`, now also unit-testable.
- `scripts/_gha-outputs.mjs` moves the `GITHUB_OUTPUT` env read from module-load into `writeOutputs()`. No production behavior change; enables tests that set the env after importing the helper.

### Tests

- New `tests/scripts/upstream-parse.test.js` — 14 tests covering happy paths, every error branch, the new truncation logic, the assistant-text-only fallback, and `extractAssistantText` unit cases. Suite now 553 tests across 33 files.

## [2.4.9] — 2026-04-20

CI fix release — the daily `upstream-check` workflow failed at `anthropics/claude-code-action` with `Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable`. The action exchanges an OIDC token for a GitHub App token before the Anthropic API auth layer runs; that exchange requires `id-token: write` in workflow permissions regardless of `CLAUDE_CODE_OAUTH_TOKEN`. Prior runs succeeded intermittently because GitHub does not consistently inject the token URL when no job in the run declares the permission.

### Fixed

- `.github/workflows/upstream-check.yml` now grants `id-token: write` alongside `contents: write` and `issues: write`. Matches the canonical workflow template at `anthropics/claude-code-action/examples/claude.yml`.

### Changed

- `docs/reference/upstream-automation.md` — permissions row lists all three permissions with a note on why `id-token: write` is required.

## [2.4.8] — 2026-04-20

Bug fix release — `worclaude doctor` reported `File integrity: 1/54 files missing` on every v2.4.6+ install. `checkHashIntegrity` resolved every `workflow-meta.json` `fileHashes` key under `.claude/`, so `root/AGENTS.md` (tracked at project root since v2.4.6) got looked up at `.claude/root/AGENTS.md` — which doesn't exist. `worclaude upgrade` already handled the `root/` prefix correctly; only doctor had missed the update.

### Fixed

- `worclaude doctor` now uses the shared `resolveKeyPath` helper from `src/core/file-categorizer.js` for every `fileHashes` key, so `root/<path>` entries resolve at the project root and `hooks/<name>` entries resolve under `.claude/hooks/`. No behavior change for `agents/`, `commands/`, or `skills/` keys.

### Changed

- `docs/reference/configuration.md` — `fileHashes` example extended with `hooks/` and `root/` entries and a one-line description of the key-prefix vocabulary. The field description no longer claims scope is "all files in `.claude/`" — that stopped being true in v2.4.6 when `root/AGENTS.md` started being tracked.

## [2.4.7] — 2026-04-20

Bug fix release — the learn-capture Stop hook writes `.claude/.stop-hook-active` as a runtime re-entry guard, but the scaffolded `.gitignore` never covered it. Every project scaffolded or upgraded to 2.4.6 saw a dirty `git status` right after the Stop hook fired. `worclaude delete` also left the now-stale line in `.gitignore`. Both are fixed symmetrically.

### Fixed

- `worclaude init` and `worclaude upgrade` now append `.claude/.stop-hook-active` to `.gitignore`. Pre-v2.4.7 installs pick up the missing entry on the next `upgrade`.
- `worclaude delete` now removes the `.claude/.stop-hook-active` line from `.gitignore` alongside the other worclaude entries. `.claude-backup-*/` and `.claude/learnings/` remain intentionally preserved so personal/backup content stays ignored after uninstall.

### Changed

- `docs/reference/configuration.md` — gitignore entries reference now lists all 7 entries (previously out of date — missing `.claude/learnings/` too) with a one-line note on the stop-hook flag.

## [2.4.6] — 2026-04-19

Bug fix release — `worclaude upgrade` was silently no-oping when the installed and CLI versions matched, even when on-disk files were missing. `worclaude doctor` flagged drift, but the upgrade command refused to reconcile it. This release adds a drift-repair pass to `upgrade` and exposes new flags.

### Fixed

- `upgrade` now repairs on-disk drift (files listed in `workflow-meta.json` `fileHashes` but missing from disk) instead of pruning their hash entries. When versions match and drift exists, `upgrade` enters a "Repair-only" flow (preview → confirm → apply), version unchanged. When the installation is clean, behavior is unchanged — `Already up to date (vX.Y.Z)` and exit.
- Hook scripts (`.claude/hooks/*.{cjs,js}`) and `AGENTS.md` (tracked as `root/AGENTS.md`) are now part of `buildTemplateHashMap`, so missing copies are detected and restored. Pre-v2.4.6 installs pick them up via the `newFiles` path on first upgrade. User-edited copies on disk with no corresponding `fileHashes` entry are preserved — a `.workflow-ref` sidecar is written instead of overwriting.
- `.claude/learnings/` directory is re-created (with `.gitkeep`) when missing.
- When `CLAUDE.md` lacks memory-architecture guidance keywords, `CLAUDE.md.workflow-ref.md` is written alongside with suggested additions. `CLAUDE.md` itself is never auto-modified.

### Added

- `worclaude upgrade --dry-run` — preview repair + template changes without writing.
- `worclaude upgrade --yes` — skip confirmation prompts (useful in CI / scripted flows).
- `worclaude upgrade --repair-only` — restore missing files without applying template updates, even when versions differ.
- New `src/core/drift-checks.js` module (`hasClaudeMdMemoryGuidance`, `ensureLearningsDir`, `writeMemoryGuidanceSidecar`) shared by `doctor` and `upgrade` so keyword checks stay aligned.
- New `src/core/variables.js` module — extracted `LANGUAGE_COMMANDS` / `buildCommandsBlock` from `init.js` and added `buildAgentsMdVariables(meta, projectRoot)` for repair flows. `init.js` now imports from it.

### Changed

- `categorizeFiles` now returns `missingExpected` and `missingUntracked` instead of a single `deleted` array. `diff.js` renders them as "Missing (will be restored by upgrade)" and "Deleted (removed in current version)" respectively. `upgrade.js` only prunes hashes for `missingUntracked`.
- `doctor.js` `checkClaudeMdMemoryGuidance` now points users to the sidecar flow: `"Run worclaude upgrade to write a CLAUDE.md.workflow-ref.md sidecar with suggested additions."`
- `computeFileHashes` now also hashes `AGENTS.md` at the project root (as `root/AGENTS.md`) so freshly-initialized projects track it from the start.

## [2.4.5] — 2026-04-19

Internal CI tooling patch. No change to the scaffolded output or the npm package surface — `worclaude init` / `upgrade` produce identical output to 2.4.4.

### Changed

- All three GitHub Actions workflows (`ci.yml`, `deploy-docs.yml`, `upstream-check.yml`) bumped past the Node.js 20 runtime deprecation. GitHub is force-running Node 20 actions on Node 24 starting 2026-06-02 and removing Node 20 from runners on 2026-09-16. Target versions (all ship a Node 24 runtime): `actions/checkout@v4 → @v6`, `actions/setup-node@v4 → @v6`, `actions/configure-pages@v4 → @v6`, `actions/deploy-pages@v4 → @v5`, `actions/upload-pages-artifact@v3 → @v5`. `setup-node@v6` limits automatic caching to npm, but every usage already sets `cache: 'npm'` explicitly — no-op. `anthropics/claude-code-action` (Docker action, SHA-pinned per v2.4.3 policy) is unaffected and untouched.
- `docs/reference/upstream-automation.md` — new **2.4.5** entry in the "Version history" section recording the supporting-action bump in `upstream-check.yml` and reaffirming that the SHA-pinned Anthropic action was not touched.

## [2.4.4] — 2026-04-19

Docs-only patch. Adds an Acknowledgments section to the README crediting 13 community sources that informed Worclaude's design.

### Added

- `README.md` — new `## Acknowledgments` section listing upstream inspirations (Boris Cherny's patterns, everything-claude-code, Karpathy's coding principles, pro-workflow, Anthropic Engineering Blog, awesome-claude-code, awesome-claude-code-toolkit, claude-skills-cli, SuperClaude, ccusage / claude-devtools, claude-flow, Vercel SkillKit, claude-code-templates). Footer line preserved.

## [2.4.3] — 2026-04-18

Hygiene patch closing three drifts surfaced by the 2026-04-18 anthropic-watch feed audit, plus a packaging fix. No user-facing CLI surface change; `worclaude init` / `upgrade` produce identical output to 2.4.1.

### Added

- `worclaude doctor` now recognizes the 7 hook events introduced since Claude Code 2.1.101: `TaskCreated`, `TaskCompleted`, `StopFailure`, `InstructionsLoaded`, `ConfigChange`, `Elicitation`, `ElicitationResult`. `VALID_HOOK_EVENTS` grew from 20 to 27 — matching `docs/reference/hooks.md` and `docs/spec/SPEC.md`, which already documented 27.
- `worclaude doctor` warns on agents declaring `claude-sonnet-4` / `sonnet-4` (Anthropic retires these model IDs on 2026-06-15).
- New `docs/spec/BACKLOG-v2.1.md` entry — "Sandbox defaults in scaffolded settings" — captures open design questions for scaffolding the Claude Code 2.1.113 `sandbox.network.deniedDomains` feature in a future minor.
- `docs/reference/upstream-automation.md` — new "Action pinning" policy paragraph and "Version history" section (2.4.0 → 2.4.3).

### Changed

- `.github/workflows/upstream-check.yml` — `anthropics/claude-code-action` pinned from floating `@v1` to commit SHA `38ec876110f9fbf8b950c79f534430740c3ac009` (v1.0.101). Closes the pre-existing `TODO(security):` comment in the workflow. Feed content is untrusted user input; floating `@v1` let any future action release run unreviewed against the repo's `CLAUDE_CODE_OAUTH_TOKEN`.
- `src/commands/doctor.js` version-stamp comment refreshed from v2.1.101 to v2.1.114. `Setup` retained in the hook event set with an inline rationale comment (older worclaude scaffolds may still declare it).
- `package.json` — `bin.worclaude` path normalized from `./src/index.js` to `src/index.js` to silence a cosmetic `npm publish` warning. The installed binary is unchanged; npm already normalized the value at publish time.

## [2.4.1] — 2026-04-18

Internal CI tooling — no change to the scaffolded output or npm package surface.

### Added

- Daily `upstream-check` GitHub Actions workflow (09:30 UTC cron) that fetches the anthropic-watch feeds, diffs against committed state, and opens a GitHub issue when a Worclaude-relevant change appears. Completes the emit half of the anthropic-watch integration ([#69](https://github.com/sefaertunc/Worclaude/pull/69)).
- `scripts/upstream-precheck.mjs` — zero-dep Node 20 parallel feed fetch with 10s timeout, Set-based delta detection, 90-day firstSeen prune, and a 3-strike feed-unreachable watchdog with auto-recovery.
- `scripts/upstream-parse.mjs` — reads `claude-code-action` execution JSONL, applies a strict `SKIP_ISSUE` / `# Title:` / `# Body` contract with a plaintext fallback.
- `scripts/_gha-outputs.mjs` — shared zero-dep GitHub Actions helpers.
- `.github/upstream-state.json` — schema v2 state file (seeded from live `all.json`); every mutation gated on `github.ref == 'refs/heads/main'` so feature-branch dispatches stay read-only.
- `tests/fixtures/upstream/` — four parser fixtures (skip, issue, malformed, plaintext-fallback).
- `docs/reference/upstream-automation.md` — operations runbook and required branch-protection settings for the workflow.

### Changed

- `docs/reference/slash-commands.md` — cross-link to the new upstream-automation reference page.
- `docs/.vitepress/config.mjs` — sidebar entry for upstream-automation; `phases/**` added to `srcExclude`.

### Removed

- `docs/research/PHASE-1-DIAGNOSIS-REPORT.md` — retired investigation scratchpad (preserved in git history).

## [2.4.0] — 2026-04-16

Worclaude 2.4.0 adds **upstream awareness**: every scaffolded project now ships a `/upstream-check` command and an `upstream-watcher` universal agent that consume the [anthropic-watch](https://github.com/sefaertunc/anthropic-watch) feeds at runtime (16 Anthropic sources — Claude Code releases, SDK changelogs, docs, engineering blog, status page, and more) and report what's new, what's critical, and what affects the current project. No new npm dependencies — fetching happens via `curl` inside Claude Code.

### Added

- `/upstream-check` command (scaffolded template) — on-demand, stateless status check. Fetches `run-report.json` and `all.json`, reports source health (`Y/16 healthy`) and the 10 most recent items grouped by category, and flags items from `claude-code-releases`, `claude-code-changelog`, `npm-claude-code`, `agent-sdk-ts-changelog`, or `agent-sdk-py-changelog` as `[CRITICAL]`. Graceful fetch-failure handling.
- `upstream-watcher` universal agent — deep upstream impact analysis (Sonnet, `isolation: none`, read-only: `disallowedTools: [Edit, Write, NotebookEdit]`). Cross-references new upstream items against the project's scaffolded `.claude/` surface area (agents, commands, hooks, skills, settings) and produces a three-part report: direct impact, informational, recommended actions. Feeds fetched in parallel to bound worst-case latency by a single `--max-time`.
- Agent routing entry for `upstream-watcher` (manual trigger, Stage 1: Context, `/upstream-check` as the paired command).
- Worclaude-internal `.claude/commands/upstream-check.md` (dogfood) — same fetch/flag behavior as the scaffolded template, plus a Worclaude-specific cross-reference layer that checks each `[CRITICAL]` item against `src/data/agents.js`, `src/data/agent-registry.js`, `src/core/scaffolder.js`, `src/core/merger.js`, `templates/hooks/*.cjs`, `docs/spec/BACKLOG-v2.1.md`, `templates/skills/universal/*.md`, and `CLAUDE.md` Critical Rules. Each cross-reference classified as Action needed / No impact detected / Needs investigation.

### Changed

- `UNIVERSAL_AGENTS` 5 → 6, `COMMAND_FILES` 17 → 18, `AGENT_REGISTRY` 25 → 26. Manifest audit tests and `init` / `merger` / `agent-routing` generator tests updated to iterate over `UNIVERSAL_AGENTS` instead of hardcoded lists — adding future universals no longer requires updating those tests.
- Stale literal counts dropped from `src/data/agent-registry.js` doc-comment and Universal section header so they stop drifting.

## [2.3.0] — 2026-04-15

Worclaude 2.3.0 expands the workflow from a setup scaffold into a full **learning system**: Claude captures corrections automatically, replays them across sessions, and now generates cross-tool rule files so switching from Claude Code to Cursor or Codex does not mean re-writing your conventions. Eight lifecycle hooks (up from three) plus a dedicated `coding-principles` reference card tighten the feedback loop between you and Claude.

### Learning loop: capture once, replay everywhere

- New `/learn <rule>` slash command writes rules to `.claude/learnings/{category}.md` with structured YAML frontmatter. Trigger phrases (`remember this`, `learn this`, `save this rule`) also invoke it.
- New `correction-detect.cjs` hook (UserPromptSubmit) watches for correction signals in your prompts — "no, that's wrong", "you forgot", "actually, …" — and surfaces a suggestion to capture the correction as a `[LEARN]` block.
- New `learn-capture.cjs` hook (Stop) scans the session transcript for `[LEARN]` blocks and persists them automatically, updating `.claude/learnings/index.json`.
- SessionStart hook now reloads the most recent learnings on every session start, so rules you captured last week are already in context when you open Claude today.
- Learnings are gitignored by default — personal to the developer, not shared. Promote a learning into CLAUDE.md when it matures into a team-wide rule.

### Hook lifecycle: 3 → 8 events

- **PreCompact** — new emergency git snapshot to `.claude/sessions/` before auto-compaction, so context truncation never loses in-flight state.
- **UserPromptSubmit** — correction detection (above) + skill-hint matcher that surfaces relevant installed skills based on token overlap with your prompt.
- **Stop** — learning capture (above) and desktop notification.
- **SessionEnd / Notification** — quiet-by-default session-end and tool-use alerts.
- Existing `SessionStart`, `PostToolUse`, `PostCompact` hooks retained and enriched.

### Cross-tool compatibility: AGENTS.md

- `worclaude init` now writes `AGENTS.md` alongside `CLAUDE.md`. Cursor, OpenAI Codex, GitHub Copilot, and other tools read `AGENTS.md`; Claude Code reads `CLAUDE.md`. Both are generated from the same source, so switching tools does not require maintaining parallel rule files.
- `worclaude upgrade` and `/sync` regenerate `AGENTS.md` when `CLAUDE.md` changes.
- `worclaude doctor` verifies `AGENTS.md` exists and flags drift.

### New universal skill: `coding-principles`

- Karpathy-derived reference card covering four behavioral principles: **Think Before Coding** (state assumptions, surface ambiguity), **Simplicity First** (minimum code, no speculative abstractions), **Surgical Changes** (touch only what traces to the request), **Goal-Driven Execution** (define success criteria up front, close the feedback loop before committing).
- Three new critical rules (10–12 in the scaffolded CLAUDE.md) enforce these principles at the always-loaded layer.

### Agent enrichment (all 25 agents)

Every agent template now includes:

- **Confidence thresholds** for when to spawn vs defer
- **Worked examples** showing input → output shape
- **Verification depth levels** (quick check vs full audit)
- **Severity classification** for findings
- New frontmatter fields: `tools`, `effort`, `color`, `permissionMode`, `mcpServers`, per-agent `hooks`, `criticalSystemReminder`, `skills`, `initialPrompt`, `memory`.

### Skill enrichment (all 12 universal skills)

- **Must-Haves Contract** (planning-with-files) — lists non-negotiable elements of a good implementation plan.
- **Gate Taxonomy** (verification) — classifies verification gates by cost and confidence.
- **Context Budget Tiers** (context-management) — explicit budgets for main-session vs subagent context.
- `version: "1.0.0"` frontmatter on all universal + template skills for future migration tracking.

### Command enrichment (17 slash commands)

- **Trigger phrases** — every command template declares natural-language triggers (e.g., `/learn` triggers on "remember this", "save this rule").
- **`$ARGUMENTS` placeholders** — `/start`, `/end`, `/verify`, `/refactor-clean` now support explicit arguments.

### Doctor improvements

- **Hook-event validation** — flags invalid event names, deprecated events, and hook handlers referencing nonexistent scripts. `BLOCKING_BY_DESIGN_EVENTS` set correctly exempts events (SessionStart, PreToolUse, etc.) that must be blocking by design and should not be flagged as needing `async: true`.
- **CLAUDE.md line budget check** — fails at the 200-line threshold so the always-loaded file stays lean.
- **Deprecated-model check** — warns when agents reference models scheduled for retirement.
- **Learnings integrity check** — validates `index.json` parses, referenced files exist, no orphans, frontmatter is well-formed.
- **Gitignore coverage** — verifies `.claude/sessions/`, `.claude/learnings/`, and backup directories are properly ignored.

### `plugin.json` generation (opt-in)

- `worclaude init` can now write a Claude Code plugin manifest. Useful for publishing your scaffolded workflow as a shareable plugin.
- Paired with `templates/hooks/README.md` and a `disableSkillShellExecution` awareness note on shell-heavy skill templates.

### GTD memory scaffold (opt-in)

- Optional structured-memory layer at `docs/memory/decisions.md` and `docs/memory/preferences.md` for teams that want a more explicit GTD-style capture than `.claude/learnings/` provides.

### Other

- Template version fields synced: all skill templates carry `version: "1.0.0"`.
- `$ARGUMENTS` placeholder added to `/start`, `/end`, `/verify`, `/refactor-clean` templates so their argument descriptions match the actual runtime substitution.
- 497 tests across 31 test files (up from 383 / 26).

### Upgrade notes

Upgrading from 2.2.x:

```bash
npm install -g worclaude@latest
cd your-project
worclaude upgrade
```

`worclaude upgrade` preserves your customizations via the partial-hash update fixed in 2.2.5. New templates (coding-principles skill, /learn command, four hook scripts, AGENTS.md) land automatically; files you modified stay untouched. Run `worclaude doctor` after upgrade to verify everything registered.

If you have customizations to files that changed in 2.3.0, `upgrade` saves the new templates as `.workflow-ref.md` sidecars for manual reconciliation — see the [Upgrading guide](https://sefaertunc.github.io/Worclaude/guide/upgrading) for the reconciliation flow.

### Breaking changes

None. All 2.3.0 changes are additive.
