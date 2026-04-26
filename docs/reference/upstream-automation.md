# Upstream Automation

Worclaude ships a scheduled GitHub Actions workflow (`.github/workflows/upstream-check.yml`) that runs daily on the repository and opens an issue when Anthropic upstream changes are worth the maintainer's attention — even when no one's machine is on.

::: warning Slash command retired
The on-demand `/upstream-check` slash command (Phase 2 retirement, 2026-04) has been removed in favor of this scheduled automation. The classification rules previously lived in `.claude/commands/upstream-check.md`; they now live in this page (see [Classification Rules](#classification-rules) below) and the GitHub workflow reads them from here. The `upstream-watcher` agent is preserved for future revival.
:::

## Overview

- **What it does:** fetches the [anthropic-watch](https://github.com/sefaertunc/anthropic-watch) feeds, diffs them against a committed state file, invokes Claude via [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) to decide which new items matter, and opens a GitHub issue when the decision is non-empty.
- **Why it exists:** v2.4.0 shipped only the pull-based `/upstream-check` slash command. The scheduled issue-filing half completes the original integration goal — a passive inbox for upstream-driven maintenance work.
- **Where the feeds come from:** `https://sefaertunc.github.io/anthropic-watch/feeds/` — `run-report.json` (source health) and `all.json` (items).

## How It Runs

| Field             | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Trigger           | `schedule: '30 9 * * *'` (09:30 UTC daily) + `workflow_dispatch`                                  |
| Concurrency       | Group `upstream-check`, queued (no cancellation)                                                  |
| Permissions       | `contents: write`, `issues: write`, `id-token: write` (required by `claude-code-action` for OIDC) |
| Runner            | `ubuntu-latest`                                                                                   |
| Model             | `claude-sonnet-4-6` (pinned)                                                                      |
| Auth              | Repo secret `CLAUDE_CODE_OAUTH_TOKEN` (uses the maintainer's Max plan quota)                      |
| Tool restrictions | `--disallowedTools Edit Write Bash NotebookEdit` — feed content is untrusted; Claude is read-only |

**Action pinning:** `anthropics/claude-code-action` is pinned to a specific commit SHA rather than the floating `@v1` tag. Feed content is untrusted user input, so every action upgrade would otherwise run unreviewed against the maintainer's `CLAUDE_CODE_OAUTH_TOKEN`. Bumping the pin is a deliberate maintainer step — review the [upstream release notes](https://github.com/anthropics/claude-code-action/releases), then update the SHA (and the trailing `# vX.Y.Z` annotation) in `.github/workflows/upstream-check.yml`.

The cron runs at a fixed UTC time; DST drift (±1h local) is accepted.

## State File

`.github/upstream-state.json` (schema version `2`) is the durable memory:

```json
{
  "version": 2,
  "lastRun": "2026-04-18T09:08:21.145Z",
  "consecutiveFetchFailures": 0,
  "openWatchdogIssueNumber": null,
  "lastSeenItems": [{ "id": "2.1.114", "firstSeen": "2026-04-18T09:08:21.145Z" }]
}
```

- `lastSeenItems` — items that have already been surfaced. Pruned by `firstSeen > 90 days` on every successful run.
- `consecutiveFetchFailures` — reset to `0` on any successful fetch.
- `openWatchdogIssueNumber` — link to the currently-open feed-unreachable watchdog issue (see below). The workflow uses `gh issue list --label fetch-error --state open` as the authoritative dedupe, not this field alone.

The pre-check script (`scripts/upstream-precheck.mjs`) supports a `STATE_PATH` environment override for local testing without mutating the committed seed.

## Delivery

- Issues are labelled `upstream` and `automated`. Titles match `upstream: {N} new items to review ({YYYY-MM-DD})`.
- **Silent skip** when the delta is empty or Claude replies `SKIP_ISSUE`. Actions run history is the liveness signal.
- **State advances on SKIP.** When Claude replies `SKIP_ISSUE`, `.github/upstream-state.json` is still pushed so the same items are not re-evaluated on the next cron run. Only parse errors (or a failed fetch) leave state un-advanced, so the items get a fresh look after a fix.
- **Ordering guarantee:** `.github/upstream-state.json` is committed and pushed to `main` **before** `gh issue create`. A push failure aborts issue creation, so retries never duplicate.

## Watchdog

To prevent silent-forever outages:

- Each fetch failure increments `consecutiveFetchFailures` (the pre-check writes the state file directly so the counter survives skipped downstream steps).
- On the **3rd consecutive failure**, the workflow opens a tracked issue labelled `upstream`, `automated`, `fetch-error`. Subsequent failures do not spam — `gh issue list --label fetch-error --state open` is the lock.
- On the next successful fetch, the watchdog issue is closed automatically with a `feeds recovered at {timestamp}` comment.

## Rollback

After opening a new `upstream` issue, the workflow scans all other open `upstream`-labelled issues. Any that are older than 24h with zero comments and zero reactions are closed with a `Superseded by #NN` comment, keeping the list focused on the latest daily brief.

## Operations

### Force a run

```bash
gh workflow run upstream-check.yml           # on the default branch (main)
gh workflow run upstream-check.yml --ref feat/some-branch  # feature-branch run — diagnostic only, cannot push
```

Feature-branch runs exercise pre-check, Claude, and the parser but skip every step gated on `github.ref == 'refs/heads/main'`.

### Rotate the OAuth token

The `CLAUDE_CODE_OAUTH_TOKEN` secret is long-lived but eventually expires. If the workflow begins failing on authentication:

```bash
claude setup-token           # regenerate locally
gh secret set CLAUDE_CODE_OAUTH_TOKEN  # paste the new token
```

### Required branch protection for `main`

The workflow pushes state updates directly to `main`:

- The `github-actions[bot]` user (or the provided `GITHUB_TOKEN`) must be allowed to push to `main`.
- If `main` has **Require a pull request before merging**, either exempt `github-actions[bot]` or convert this workflow to a PR-based state update (out of scope for now).
- If `main` has **Require status checks to pass before merging**, the scheduled push will be rejected — adjust or exempt.

The workflow fails loudly on a rejected push; it does not attempt to retry around protection rules.

## Classification Rules

The GitHub workflow uses these rules to decide whether an upstream item is worth a Worclaude issue. They previously lived in `.claude/commands/upstream-check.md` (retired in Phase 2). The workflow reads this section directly via the Read tool.

### Critical sources

Items whose `source` is one of these directly affect Worclaude scaffolded infrastructure — prefix as `[CRITICAL]` in the listing:

- `claude-code-releases`
- `claude-code-changelog`
- `npm-claude-code`
- `agent-sdk-ts-changelog`
- `agent-sdk-py-changelog`

### Worclaude-specific cross-reference

For every `[CRITICAL]` item and every item from `engineering-blog`, do a targeted cross-reference against Worclaude's own architecture. Report under the heading **"Worclaude Impact"** with one subsection per item.

- **Claude Code version / changelog / npm-claude-code** — a new Claude Code release can change agent frontmatter syntax, hook event names, command syntax, or tool names. Check:
  - `templates/agents/**/*.md` and `templates/agents/universal/*.md` frontmatter fields (`model`, `isolation`, `disallowedTools`, `criticalSystemReminder`, `initialPrompt`)
  - `templates/commands/*.md` frontmatter and bash examples
  - `templates/hooks/*.cjs` — hook event names, input shapes, exit-code semantics (especially `pre-compact-save.cjs`, `correction-detect.cjs`, `learn-capture.cjs`, `skill-hint.cjs`)
  - `src/data/agents.js` `AGENT_CATALOG` entries — any deprecated model names?

- **Agent SDK TS/Py changelog** — SDK changes can affect spawned-agent capabilities and hook schemas. Check:
  - `src/data/agent-registry.js` — `isolation`, `triggerType`, `model` fields still valid?
  - `src/data/agents.js` `AGENT_CATALOG` — tool availability per category
  - `src/core/scaffolder.js` and `src/core/merger.js` — do they emit frontmatter fields that the new SDK still understands?

- **Anthropic API / docs** — only relevant if Worclaude adds direct SDK usage. Today Worclaude has no `@anthropic-ai/sdk` dependency; grep `package.json` to confirm, and flag informational only if absent.

- **Engineering blog posts** — look for new workflow patterns, agent-design recommendations, or context-management techniques. Cross-reference against:
  - `docs/spec/BACKLOG.md` — any pending item that this post would unblock or invalidate?
  - `templates/skills/universal/*.md` — new best-practice skills that Worclaude should scaffold?
  - `CLAUDE.md` Critical Rules section — any rule that this post contradicts?

- **Status page incidents** — informational only. Note but do not cross-reference; no Worclaude impact.

For each cross-reference, produce one of:

- **Action needed:** specific file + what to check/update, plus a 1-line reason tied to the upstream item
- **No impact detected:** the change does not touch any file listed above
- **Needs investigation:** ambiguous; name the file and the uncertainty

### Operational rules for the classifier

- Use only `curl` and shell builtins. Do not invoke `node` or `npm`.
- Do not cache, persist, or diff against prior runs — the classifier is stateless.
- Reference specific Worclaude files by path. "Check the agents" is not enough; "Check `src/data/agents.js` line 10 — `ui-reviewer` model field" is.
- If confidence that an item affects Worclaude is low, classify as "Needs investigation" rather than "Action needed".
- Be concise. A maintainer skimming the issue should decide in 30 seconds whether to act.

## Version history

- **2.4.0** — `/upstream-check` slash command and `upstream-watcher` agent shipped. Manual, on-demand, stateless.
- **2.4.1** — `.github/workflows/upstream-check.yml` + `.github/upstream-state.json` (schema v2) + this reference page shipped. Daily cron at 09:30 UTC; classifies via `anthropics/claude-code-action@v1`; opens a labeled GitHub issue; pushes state updates to `main`.
- **2.4.2** — `anthropics/claude-code-action` pinned to a specific commit SHA (see **Action pinning** above). The floating `@v1` tag was replaced because feed content is untrusted and action upgrades would otherwise run unreviewed against the maintainer's `CLAUDE_CODE_OAUTH_TOKEN`.
- **2.4.5** — Supporting GitHub-official actions in `.github/workflows/upstream-check.yml` (`actions/checkout`, `actions/setup-node`) bumped past the Node 20 runtime deprecation (force-run on Node 24 on 2026-06-02; removed 2026-09-16). `anthropics/claude-code-action` SHA pin unchanged.
