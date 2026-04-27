# Observability

Worclaude scaffolds local observability into every project. Hooks fire on Claude Code lifecycle events and append to JSONL files under `.claude/observability/`. The `worclaude observability` command aggregates the data into a per-project Markdown report. **Zero data leaves the machine** — the folder is gitignored, and the entire pipeline is opt-out via a single environment variable.

This page covers what is captured, where it lives, how to read it, and how to opt out.

## What's Captured

Three signals ship by default. Each lives in its own JSONL file under `.claude/observability/` and is appended one line per event.

### Skill loads

`skill-loads.jsonl` — every time Claude Code's skill loader fires the `InstructionsLoaded` event.

```jsonl
{"ts":"2026-04-27T12:00:00.000Z","skill":"git-conventions","trigger":"manual"}
{"ts":"2026-04-27T12:01:30.000Z","skill":"testing","trigger":"path-match"}
```

| Field     | Meaning                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `ts`      | ISO-8601 UTC timestamp captured by the hook.                                         |
| `skill`   | Skill identifier — derived from `skill_name`, `instructions_name`, or path fallback. |
| `trigger` | Why the skill loaded — usually `manual`, `path-match`, or `unknown`.                 |

The hook script is `templates/hooks/obs-skill-loads.cjs` (installed at `.claude/hooks/obs-skill-loads.cjs`). It is registered on `InstructionsLoaded` in `settings.json` with the standard profile gate.

### Command invocations

`command-invocations.jsonl` — every slash-prefixed user prompt.

```jsonl
{"ts":"2026-04-27T12:00:00.000Z","command":"/start"}
{"ts":"2026-04-27T12:30:00.000Z","command":"/verify","session":"abc-123"}
```

| Field     | Meaning                                                   |
| --------- | --------------------------------------------------------- |
| `ts`      | When the user sent the prompt.                            |
| `command` | The slash command, e.g. `/start`. Arguments are stripped. |
| `session` | Claude Code session id when present.                      |

The hook script is `obs-command-invocations.cjs`. It is registered as a third hook on `UserPromptSubmit` (alongside `correction-detect` and `skill-hint`). Non-slash prompts are skipped — the JSONL file only grows when the user actually invokes a command.

### Agent events

`agent-events.jsonl` — every `SubagentStart` and `SubagentStop`. Stored as separate events, **paired at read time** by the aggregator.

```jsonl
{"ts":"2026-04-27T12:05:00.000Z","event":"start","agent":"verify-app","session":"abc"}
{"ts":"2026-04-27T12:05:58.000Z","event":"stop","agent":"verify-app","session":"abc","exit":"completed"}
```

| Field     | Meaning                                                                      |
| --------- | ---------------------------------------------------------------------------- |
| `ts`      | When the start or stop fired.                                                |
| `event`   | `start` or `stop`.                                                           |
| `agent`   | Agent identifier (`agent_name` / `subagent_type` / `agent`).                 |
| `session` | Session id; used to pair starts and stops.                                   |
| `exit`    | On `stop`: `completed`, `failed`, or `error` if the agent exited abnormally. |

The hook script is `obs-agent-events.cjs`, registered on both `SubagentStart` and `SubagentStop`. Pairing keeps the hook stateless — no on-disk state file to coordinate across invocations.

## Where It Lives

```
.claude/observability/
├── skill-loads.jsonl           (hook-appended)
├── command-invocations.jsonl   (hook-appended)
└── agent-events.jsonl          (hook-appended)
```

The entire folder is added to `.gitignore` when `worclaude init` or `worclaude upgrade` runs. Captured data is local-only by design.

## Reading the Report

Run the CLI subcommand:

```bash
worclaude observability                      # Markdown to stdout
worclaude observability --json               # Raw report object as JSON
worclaude observability --out report.md      # Write to a file (relative paths anchor to projectRoot)
worclaude observability --json --out r.json  # Combine flags
```

Or use the `/observability` slash command from inside a Claude Code session — the LLM runs the CLI and inlines the Markdown.

The report covers six sections:

| Section               | What it answers                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Captured Volume**   | How many raw events have accrued since the folder was created.                                                                |
| **Top Skills**        | Top 10 skills by load count, with last-seen timestamp.                                                                        |
| **Top Commands**      | Top 10 slash commands by invocation count.                                                                                    |
| **Agent Invocations** | Top 10 agents by invocation count, with completed / failed counts and average duration.                                       |
| **Anomalies**         | Installed-but-never-loaded skills (suppressed when no skill data exists yet); agents with >50% failure rate (≥3 invocations). |
| **Suggestions**       | Skills not loaded in 30+ days — retirement candidates.                                                                        |

The thresholds are deliberately conservative: false-positive noise discourages users from running the report.

## Privacy

- **Zero network egress.** The report is built entirely from local JSONL files. No telemetry, no upload, no opt-in dashboard.
- **Gitignored by default.** `worclaude init` and `worclaude upgrade` ensure `.claude/observability/` is in `.gitignore`. Captured data does not get committed accidentally.
- **No prompts during sessions.** Capture is silent — no banners, no side panels.
- **Single env-var opt-out.** Set `WORCLAUDE_HOOK_PROFILE=minimal` to disable the observability hooks (along with `learn-capture` and `correction-detect`). The capture stops; the existing folder is left in place. To purge data too, delete the folder — it is recreated empty on the next session.

## Use Cases

1. **Skill hygiene.** A skill that never loads is noise. Either rename to match prompts users actually type, update its `description:` frontmatter so `skill-hint.cjs` keyword match catches it, or retire it.
2. **Agent reliability.** Agents like `bug-fixer` and `verify-app` should sit near 100% completion. A high failure ratio is a signal that the agent's prompt or scope is wrong.
3. **Command surface review.** A command with zero invocations after weeks of use is not earning its slot — consider retiring per the principle established in `decisions/2026-04/05-analysis-cluster.md`.

## Hook Profile Gating

All three observability hooks short-circuit when `WORCLAUDE_HOOK_PROFILE=minimal`:

```bash
WORCLAUDE_HOOK_PROFILE=minimal claude    # No capture, no learnings, no correction detection.
```

Default (`standard`) and `strict` both run the observability capture.

## Implementation Reference

| Concern               | File                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Capture: skill loads  | `templates/hooks/obs-skill-loads.cjs`                                                              |
| Capture: commands     | `templates/hooks/obs-command-invocations.cjs`                                                      |
| Capture: agent events | `templates/hooks/obs-agent-events.cjs`                                                             |
| Settings registration | `templates/settings/base.json` (InstructionsLoaded, SubagentStart, SubagentStop, UserPromptSubmit) |
| Aggregation module    | `src/utils/observability.js`                                                                       |
| CLI subcommand        | `src/commands/observability.js`                                                                    |
| Slash command         | `templates/commands/observability.md`                                                              |

## Related

- [Hooks](./hooks.md) — full hook contract reference.
- [Slash Commands](./slash-commands.md) — `/observability` and other in-session commands.
- [Configuration](./configuration.md) — `WORCLAUDE_HOOK_PROFILE` and other env vars.
