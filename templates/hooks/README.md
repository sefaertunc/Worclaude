# Worclaude Hooks

This directory holds Node.js hook scripts that `worclaude init` copies
into `.claude/hooks/` of the scaffolded project. Each script corresponds
to a `hooks[<event>]` entry in `templates/settings/base.json`.

`scaffoldHooks()` only copies `*.cjs` and `*.js` files — this `README.md`
and everything under `examples/` stays in the Worclaude repo and is NOT
shipped into user projects.

## Scaffolded hooks

| File | Event | Purpose |
|---|---|---|
| `pre-compact-save.cjs` | `PreCompact` | Writes a git context snapshot to `.claude/sessions/` before auto-compaction so nothing is lost if compaction truncates state. |
| `correction-detect.cjs` | `UserPromptSubmit` | Regex-matches user prompts against correction patterns and learn signals. On match, writes a hint to `.claude/.correction-hint`. |
| `learn-capture.cjs` | `Stop` | Scans the session transcript for `[LEARN] …` blocks and persists them to `.claude/learnings/` with an `index.json`. Uses a file-based re-entry flag to tolerate hypothetical re-entrant Stop events. |
| `skill-hint.cjs` | `UserPromptSubmit` | Token-overlap match between the user's prompt and installed skill directory names. Emits a `[Skill hint]` line when a match is found. |

All scripts:
- use the `.cjs` extension so `require()` works regardless of the host project's `package.json` `"type": "module"` setting
- read JSON from stdin, handle malformed input gracefully, and always exit 0
- suppress stderr noise from git or filesystem helpers

## Hook profiles

Every hook except `SessionStart`, `PostCompact`, and `PreCompact` is
gated by the `WORCLAUDE_HOOK_PROFILE` environment variable:

| Profile | Runs |
|---|---|
| `minimal` | Only context-loading hooks (`SessionStart`, `PostCompact`, `PreCompact`). All other hooks exit immediately. |
| `standard` (default) | All hooks including formatter on `PostToolUse`, learnings capture on `Stop`, notifications on `SessionEnd`/`Notification`. |
| `strict` | Standard + TypeScript type-checking after every `Write`/`Edit`. |

Users override the profile via shell env: `export WORCLAUDE_HOOK_PROFILE=minimal`.

## Handler types

Claude Code supports three hook handler types. Worclaude scaffolds
`type: "command"` hooks; the others are available for custom use.

### `command` (what we scaffold)

Runs a shell command. Stdin receives JSON context; stdout/stderr are
surfaced in the session.

```json
{
  "type": "command",
  "command": "node .claude/hooks/my-hook.cjs",
  "async": true
}
```

### `prompt` (cheap LLM-powered validation)

Runs a small prompt through a Claude model (defaults to Haiku).
`$ARGUMENTS` is replaced with the hook's input JSON. The model must
reply with `{"ok": true}` or `{"ok": false, "reason": "..."}`. An `ok:
false` response blocks the tool with the reason displayed.

```json
{
  "type": "prompt",
  "prompt": "Check this: $ARGUMENTS. Reply {\"ok\": true} or {\"ok\": false, \"reason\": \"...\"}.",
  "model": "haiku",
  "timeout": 30
}
```

`model` is a sibling of `type`; the `model` field accepts aliases
(`haiku`, `sonnet`, `opus`) or full model IDs. Default timeout is 30s.

### `agent` (full subagent invocation)

Runs a subagent. Heaviest option — use sparingly.

## Prompt-hook example

`examples/prompt-hook-commit-validator.json` is a complete, valid
`PreToolUse` prompt hook that validates git commit messages against
Conventional Commits. To enable it in a scaffolded project:

1. Open the project's `.claude/settings.json`.
2. Merge the `PreToolUse` entry from the example into the `hooks`
   object (or append if `PreToolUse` already exists).
3. Test by running `git commit -m 'bad message'` inside a Claude Code
   session — the hook should reject with a reason.

Prompt hooks consume Haiku tokens. Expect a few cents per 1000 commits.

## Adding custom hooks

- Drop a new `.cjs` or `.js` into `.claude/hooks/`.
- Reference it from `.claude/settings.json` under the appropriate event.
- Gate it on `WORCLAUDE_HOOK_PROFILE` if it is expensive or optional.
- `disableSkillShellExecution` in Claude Code settings does NOT affect
  hook scripts — hooks are executed by the Claude Code hook runtime,
  not by skill inline-shell evaluation. Hook scripts run even when
  `disableSkillShellExecution` is enabled.

## Further reading

- Claude Code hooks reference: `/docs/reference/hooks.md` in this repo.
- Worclaude hook profiles: `CLAUDE.md` of this repo, "Hook Profiles" section.
