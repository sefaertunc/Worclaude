# Phase 6a — Local observability (scaffolded feature)

## Goal

Ship local observability as a worclaude feature scaffolded into every
project. Capture per-project signals via hooks, aggregate via a
`worclaude observability` command, surface a Markdown health report.
Privacy: zero data leaves the machine.

This phase delivers the per-project view. Phase 6b (cross-user
aggregation) is carved out as a separate future cycle.

## Tasks

### Data schema and storage

**T6a.1 — Define observability schema.** Per-event JSONL files at
`.claude/observability/{event-type}.jsonl`. One line per event with
timestamp, event-specific payload, and any relevant identifiers
(session id, agent name, command name).

Example shapes:

```jsonl
// .claude/observability/skill-loads.jsonl
{"ts":"2026-04-26T12:00:00Z","skill":"git-conventions","trigger":"manual"}
{"ts":"2026-04-26T12:01:30Z","skill":"testing","trigger":"path-match"}

// .claude/observability/agent-invocations.jsonl
{"ts":"2026-04-26T12:05:00Z","agent":"verify-app","duration_ms":58000,"exit":"completed"}
{"ts":"2026-04-26T13:10:00Z","agent":"build-validator","duration_ms":5910,"exit":"completed"}

// .claude/observability/command-invocations.jsonl
{"ts":"2026-04-26T12:00:00Z","command":"/start"}
{"ts":"2026-04-26T12:30:00Z","command":"/verify"}
```

Folder is gitignored by default.

**Files:** `.gitignore` template (add
`.claude/observability/`), schema documentation in
`docs/reference/observability.md`.
**Source:** post-audit observability discussion (2026-04-26).
**Acceptance:** schema documented; folder created on init.

### Capture hooks

**T6a.2 — New hooks for capture.** Where existing hooks suffice,
extend them. Where they don't, add minimal new hook scripts. Capture
the 9 signals:

| Signal                  | Capture mechanism                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| Skill loads             | New hook on `InstructionsLoaded` event (Claude Code provides this; observability-only, can't block) |
| Agent invocations       | Extend `learn-capture.cjs` or new `Stop`/`SubagentStop` hook                                        |
| Command invocations     | New hook on `UserPromptSubmit` matching `/` prefix                                                  |
| Hook firings            | Each hook script appends a line to `hook-firings.jsonl`                                             |
| Correction patterns     | Extend `correction-detect.cjs` to persist its hits                                                  |
| Background-agent timing | Extend `SubagentStart`/`SubagentStop` capture                                                       |
| Verification results    | Parse session summaries already written by `/verify`/`/end`/`/commit-push-pr`                       |
| Learning re-mentions    | Pull-based via `worclaude observability` (no new hook)                                              |
| Drift longitudinally    | Pull-based: periodic `worclaude doctor` snapshots                                                   |

**Files:** new
`templates/hooks/observability/{skill-loads,command-invocations,
hook-firings,corrections}.cjs`; extensions to
`learn-capture.cjs`, `correction-detect.cjs`.
**Source:** post-audit observability discussion.
**Acceptance:** every signal has a working capture mechanism; hook
profile gating respected (`minimal` skips most observability).

### Settings.json hook event registrations

**T6a.3 — Wire new hooks into `settings.json`.** Update the templated
`settings.json` to register observability hooks on:

- `InstructionsLoaded` (skill loads)
- `UserPromptSubmit` (command invocations, in addition to existing
  hooks)
- `SubagentStart` and `SubagentStop` (agent timing)
- Plus all existing scripts append to `hook-firings.jsonl`

**Files:** `templates/settings/base.json` (and any per-language
settings that need the registrations).
**Source:** post-audit observability discussion.
**Acceptance:** new installs register the hooks; existing installs
get them via `upgrade`.

### Aggregation command

**T6a.4 — `worclaude observability` CLI subcommand.** Reads
`.claude/observability/*.jsonl` plus session summaries plus
workflow-meta.json. Produces a Markdown report covering:

- **Signal frequencies** (top 10 most-loaded skills, most-invoked
  agents, most-run commands).
- **Drift trends** (CLAUDE.md size over time from periodic doctor
  snapshots).
- **Anomalies** (skills never loaded; agents that fail more often
  than they succeed; correction patterns that recur).
- **Suggestions** (e.g., "skill X never loaded in 30 days — consider
  retiring").

Default output: stdout. Flags: `--json` for machine-readable, `--out
<file>` for writing to a file.

**Files:** new `src/commands/observability.js`, registered in
`src/index.js`.
**Source:** post-audit observability discussion.
**Acceptance:** command produces useful report; flags work.

**T6a.5 — `/observability` slash command.** Mirror of the CLI
subcommand for use inside Claude Code sessions.

**Files:** new `templates/commands/observability.md` and
`.claude/commands/observability.md` (after dogfooding).
**Source:** post-audit observability discussion.
**Acceptance:** users can ask "what's my project's observability
report?" and get the Markdown.

### Scaffolder integration

**T6a.6 — `init` and `upgrade` install observability infra.** Init
scaffolds:

- `.claude/observability/` directory
- Hook scripts under `.claude/hooks/observability/`
- `settings.json` event registrations
- `.gitignore` entry

Upgrade adds the same to existing installs (treat as a new optional
feature in T3.9's registry, or a baseline scaffold — decide which
during implementation).

**Files:** `src/core/scaffolder.js`, `src/commands/init.js`,
`src/commands/upgrade.js`, `templates/...` (the new files above).
**Source:** post-audit observability discussion.
**Acceptance:** `worclaude init` in a fresh project installs
observability; `worclaude upgrade` in an existing v2.8 project adds
it.

### Documentation

**T6a.7 — `docs/reference/observability.md` (VitePress).** New
reference page covering:

- What's captured (the 9 signals).
- Where it lives (`.claude/observability/`).
- How to read the report (`worclaude observability`).
- Privacy (zero data leaves the machine).
- How to opt out (set `WORCLAUDE_HOOK_PROFILE=minimal` to disable
  observability hooks; or delete the folder).

**Files:** new `docs/reference/observability.md`; sidebar entry in
`docs/.vitepress/config.ts`.
**Source:** post-audit observability discussion.
**Acceptance:** users can find observability docs from the public
site; sidebar lists it under Reference.

### Test coverage

**T6a.8 — Scenarios A/B/C verify observability scaffolding.** Extend
the manual test scenarios (and ideally automated tests under
`tests/`) to verify that:

- Init scaffolds observability infra.
- Hooks fire correctly under `standard` profile.
- Hooks skip under `minimal` profile.
- `worclaude observability` produces a report on a project with data.

**Files:** `tests/scaffolder/observability.test.js` (new),
CLAUDE.md verification section update (manual scenarios).
**Source:** Phase 6a goal.
**Acceptance:** tests pass; manual scenarios document the expected
behavior.

## Acceptance criteria for the phase

- Every project that runs `worclaude init` (and existing projects via
  `upgrade`) gets observability scaffolded.
- All 9 signals captured under `standard` and `strict` profiles.
- `worclaude observability` produces a meaningful per-project report.
- Privacy: zero data leaves the machine; folder gitignored;
  documented opt-out.
- Tests cover scaffolding and signal capture.

## Dependencies

- Phase 3 (`.claude/scratch/` and `.claude/plans/` conventions).
- Phase 5 (doc-lint script and source-of-truth markers; observability
  surfaces drift trends that doc-lint also catches).

## Anti-goals

- No dashboard, no service, no UI beyond Markdown.
- No telemetry that leaves the machine.
- No prompts to the user during normal sessions (capture is silent).
- No new drift source (auto-derive from existing artifacts where
  possible).
