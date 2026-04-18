# Upstream Automation

Worclaude ships a scheduled GitHub Actions workflow (`.github/workflows/upstream-check.yml`) that runs daily on the repository and opens an issue when Anthropic upstream changes are worth the maintainer's attention — even when no one's machine is on.

This page documents the server-side automation. For the on-demand counterpart, see [`/upstream-check`](./slash-commands.md#upstream-check).

## Overview

- **What it does:** fetches the [anthropic-watch](https://github.com/sefaertunc/anthropic-watch) feeds, diffs them against a committed state file, invokes Claude via [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action) to decide which new items matter, and opens a GitHub issue when the decision is non-empty.
- **Why it exists:** v2.4.0 shipped only the pull-based `/upstream-check` slash command. The scheduled issue-filing half completes the original integration goal — a passive inbox for upstream-driven maintenance work.
- **Where the feeds come from:** `https://sefaertunc.github.io/anthropic-watch/feeds/` — `run-report.json` (source health) and `all.json` (items).

## How It Runs

| Field             | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Trigger           | `schedule: '30 9 * * *'` (09:30 UTC daily) + `workflow_dispatch`                                  |
| Concurrency       | Group `upstream-check`, queued (no cancellation)                                                  |
| Permissions       | `contents: write`, `issues: write`                                                                |
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

## Relationship to `/upstream-check`

The slash command (`.claude/commands/upstream-check.md`) is stateless and user-driven — good for ad-hoc checks inside a Claude Code session. The automated workflow is stateful and passive — good for catching upstream drift when you haven't opened the repo in a while. Both are expected to coexist indefinitely.

## Version history

- **2.4.0** — `/upstream-check` slash command and `upstream-watcher` agent shipped. Manual, on-demand, stateless.
- **2.4.1** — `.github/workflows/upstream-check.yml` + `.github/upstream-state.json` (schema v2) + this reference page shipped. Daily cron at 09:30 UTC; classifies via `anthropics/claude-code-action@v1`; opens a labeled GitHub issue; pushes state updates to `main`.
- **2.4.2** — `anthropics/claude-code-action` pinned to a specific commit SHA (see **Action pinning** above). The floating `@v1` tag was replaced because feed content is untrusted and action upgrades would otherwise run unreviewed against the maintainer's `CLAUDE_CODE_OAUTH_TOKEN`.
