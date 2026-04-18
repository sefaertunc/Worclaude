# Worclaude v2.4.2 — Closing Loops on Upstream Awareness

**v2.4.1 automated it. v2.4.2 hardens it.**

A small patch that ties up loose ends left behind by the 2.4.0 → 2.4.1 arc: the daily cron that opens GitHub issues for Anthropic upstream changes now runs against a SHA-pinned action, and `worclaude doctor` has caught up with Claude Code 2.1.114 (13 releases ahead of where the doctor's data sets were pinned).

> **Heads up — this release is repo-internal hardening plus a doctor catch-up.** The npm package surface is unchanged; `worclaude init` / `worclaude upgrade` produce identical output to 2.4.1. The two user-visible differences are (a) `worclaude doctor` no longer false-flags valid Claude Code 2.1.114 hook events and (b) it now warns on `claude-sonnet-4` agents ahead of Anthropic's 2026-06-15 retirement.

---

## What's new

- **SHA-pinned `anthropics/claude-code-action`** — `.github/workflows/upstream-check.yml` no longer rides the floating `@v1` tag. The cron is now pinned to `38ec876…` (v1.0.101). Feed content is untrusted user input; every upgrade of the action ran unreviewed against our `CLAUDE_CODE_OAUTH_TOKEN` under `@v1`. Bumping the pin is now a deliberate maintainer step.
- **`worclaude doctor` knows Claude Code 2.1.114** — the `VALID_HOOK_EVENTS` set grew from 20 to 27, matching `docs/reference/hooks.md`. Newly recognized: `TaskCreated`, `TaskCompleted`, `StopFailure`, `InstructionsLoaded`, `ConfigChange`, `Elicitation`, `ElicitationResult`. Users who scaffolded these hooks will no longer see spurious _"Unknown hook event"_ failures.
- **`worclaude doctor` warns on `claude-sonnet-4`** — added to `DEPRECATED_MODELS` alongside the existing `opus-4` / `opus-4.1` entries. Anthropic retires `claude-sonnet-4` on **2026-06-15**; the doctor now surfaces it while there's time to migrate.
- **Sandbox scaffolding on the backlog** — Claude Code 2.1.113 added `sandbox.network.deniedDomains`. Worclaude's settings templates don't scaffold a default block today; a new entry in `docs/spec/BACKLOG-v2.1.md` captures the open design questions (deny-list contents, per-language overrides, merger semantics) for a future minor.

## Why it matters

Two of these are drift closures. `docs/spec/SPEC.md` and `docs/reference/hooks.md` already documented **27** hook events — the doctor's validation set was 13 Claude Code releases stale and silently producing false-FAILs for anyone scaffolding a `TaskCompleted` hook. That drift is now gone. The SHA pin is the other loop: the v2.4.1 workflow shipped with a `TODO(security):` comment flagging exactly this. That comment is deleted because the thing it described is done.

## Who this is for

If you maintain a fork of Worclaude or operate the upstream cron in your own repo, pull this patch — the SHA pin is the supply-chain-hardening step that v2.4.1 deferred. If you only consume `worclaude init` / `upgrade`, the only change you'll see is `worclaude doctor` catching two classes of stale scaffolds it used to miss.

## Upgrade

```bash
npm install -g worclaude@latest
```

Then, in any project you previously scaffolded:

```bash
worclaude doctor
```

A clean scaffold should still PASS. If you see a new WARN for `claude-sonnet-4` on one of your agents, open the agent file and update the model alias to `sonnet` (or explicitly to `claude-sonnet-4-6`) before the June 2026 retirement.

## Full version arc

- **2.4.0** — `/upstream-check` slash command + `upstream-watcher` agent. Manual, on-demand.
- **2.4.1** — daily GitHub Actions workflow, state file, reference runbook. Automated, passive.
- **2.4.2** — SHA pin for the action, doctor catch-up to Claude Code 2.1.114, sandbox backlog entry. Hardened.
