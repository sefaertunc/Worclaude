# Changelog

All notable changes to worclaude are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [semver](https://semver.org/). Older releases (pre-2.3.0) are documented in [docs/spec/PROGRESS.md](./docs/spec/PROGRESS.md) and the [GitHub releases page](https://github.com/sefaertunc/Worclaude/releases).

## [Unreleased]

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
