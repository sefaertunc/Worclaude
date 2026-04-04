# Hooks

Worclaude configures Claude Code hooks in `.claude/settings.json`. Hooks are commands that run automatically in response to Claude's actions. Four hooks are installed by default, plus a strict-only hook that activates with the `strict` [hook profile](#hook-profiles).

## Installed Hooks

### SessionStart: Context Injection

Fires when a Claude Code session begins. Injects the full project context so Claude starts every session oriented.

```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "echo '=== CLAUDE.md ==='; cat CLAUDE.md 2>/dev/null; echo; echo '=== PROGRESS ==='; cat docs/spec/PROGRESS.md 2>/dev/null; echo; echo '=== LAST SESSION ==='; f=$(ls -t .claude/sessions/*.md 2>/dev/null | head -1); if [ -n \"$f\" ]; then cat \"$f\"; else echo 'No previous session found'; fi; echo; echo '=== BRANCH ==='; git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'not a git repo'"
    }
  ]
}
```

The empty `matcher` string means this hook fires on every session start. It reads four things:

1. **CLAUDE.md** -- project instructions and critical rules
2. **docs/spec/PROGRESS.md** -- what was completed, what is next
3. **Last session summary** -- the most recent file from `.claude/sessions/`, so the new session picks up where the previous one left off
4. **Current branch** -- via `git rev-parse`

This hook has no profile gate -- it always fires regardless of `WORCLAUDE_HOOK_PROFILE`, because losing project context is never desirable.

The `/start` slash command supplements this hook with drift detection (commits since last session), handoff file checks, and active implementation prompt loading.

---

### PostToolUse: Auto-Formatter

Runs the project's formatter after every `Write` or `Edit` tool use.

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "npx prettier --write . || true"
    }
  ]
}
```

The formatter command is selected based on the project's tech stack during `worclaude init`. The `|| true` suffix prevents formatter errors from blocking Claude's workflow.

**Formatter commands by stack:**

| Stack                | Formatter Command                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Python               | `ruff format . \|\| true`                                                                                |
| Node.js / TypeScript | `npx prettier --write . \|\| true`                                                                       |
| Java                 | `google-java-format -i $(find . -name '*.java' 2>/dev/null) \|\| true`                                   |
| C# / .NET            | `dotnet format \|\| true`                                                                                |
| C / C++              | `find . -name '*.c' -o -name '*.cpp' -o -name '*.h' -o -name '*.hpp' \| xargs clang-format -i \|\| true` |
| Go                   | `gofmt -w . \|\| true`                                                                                   |
| PHP                  | `php-cs-fixer fix . \|\| true`                                                                           |
| Ruby                 | `rubocop -A \|\| true`                                                                                   |
| Kotlin               | `ktlint -F \|\| true`                                                                                    |
| Swift                | `swift-format format -r . -i \|\| true`                                                                  |
| Rust                 | `cargo fmt \|\| true`                                                                                    |
| Dart / Flutter       | `dart format . \|\| true`                                                                                |
| Scala                | `scalafmt \|\| true`                                                                                     |
| Elixir               | `mix format \|\| true`                                                                                   |
| Zig                  | `zig fmt . \|\| true`                                                                                    |

When multiple languages are selected, the first language's formatter is used.

---

### PostToolUse: Stop Notification

Sends a desktop notification when Claude stops and needs user attention.

```json
{
  "matcher": "Stop",
  "hooks": [
    {
      "type": "command",
      "command": "notify-send 'Claude Code' 'Session needs attention' 2>/dev/null || true"
    }
  ]
}
```

The notification command is selected based on the operating system detected during `worclaude init`.

**Notification commands by OS:**

| OS      | Command                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Linux   | `notify-send 'Claude Code' 'Session needs attention' 2>/dev/null \|\| true`                                            |
| macOS   | `osascript -e 'display notification "Session needs attention" with title "Claude Code"' 2>/dev/null \|\| true`         |
| Windows | `powershell -command "New-BurntToastNotification -Text 'Claude Code','Session needs attention'" 2>/dev/null \|\| true` |

All commands include `2>/dev/null || true` to fail silently if the notification tool is not installed.

Both PostToolUse hooks (formatter and stop notification) are gated by the hook profile. They skip execution when `WORCLAUDE_HOOK_PROFILE=minimal`. See [Hook Profiles](#hook-profiles) below.

---

### PostToolUse: TypeScript Check (strict only)

Runs the TypeScript compiler after every `Write` or `Edit` tool use, but only when the `strict` hook profile is active.

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "p=${WORCLAUDE_HOOK_PROFILE:-standard}; case \"$p\" in strict) ;; *) exit 0;; esac; npx tsc --noEmit 2>/dev/null || echo '[Hook] TypeScript errors detected' >&2"
    }
  ]
}
```

The profile gate at the start of the command exits immediately on any profile other than `strict`. When active, it runs `npx tsc --noEmit` which type-checks the project without emitting files. Errors are reported to stderr without blocking Claude's workflow.

This hook is useful for TypeScript projects where you want immediate feedback on type errors after every file change. On non-TypeScript projects it exits silently (tsc not found).

---

### PostCompact: Context Re-injection

Re-reads CLAUDE.md and PROGRESS.md after context compaction.

```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "cat CLAUDE.md && cat docs/spec/PROGRESS.md 2>/dev/null || true"
    }
  ]
}
```

The empty `matcher` string means this hook fires on every compaction event. It ensures Claude never loses its bearings after `/compact` by re-injecting the two most critical files into the fresh context.

This hook works in tandem with the `/compact-safe` slash command, which triggers compaction and then confirms orientation.

---

## Hook Profiles

The `WORCLAUDE_HOOK_PROFILE` environment variable controls which hooks fire. The default is `standard`.

| Hook                          | `minimal` | `standard` | `strict` |
| ----------------------------- | --------- | ---------- | -------- |
| SessionStart: Context         | Yes       | Yes        | Yes      |
| PostToolUse: Formatter        | No        | Yes        | Yes      |
| PostToolUse: Stop             | No        | Yes        | Yes      |
| PostToolUse: TypeScript Check | No        | No         | Yes      |
| PostCompact: Context          | Yes       | Yes        | Yes      |

**Design rationale:** SessionStart and PostCompact always fire because losing project context is never desirable. The formatter and notification hooks can be disabled for environments where they cause issues (CI runners, constrained machines, or when the formatter is too slow). The TypeScript check is strict-only because it adds latency after every edit.

**Setting the profile:**

Per-session (does not persist):

```bash
WORCLAUDE_HOOK_PROFILE=minimal claude
```

Persistent (add to your shell profile):

```bash
export WORCLAUDE_HOOK_PROFILE=strict
```

---

## Windows Compatibility

Claude Code executes hook commands in **bash** on Windows, using Git Bash (from [Git for Windows](https://gitforwindows.org)) or WSL bash. All worclaude hook commands — including `cat`, `find`, `xargs`, and shell redirections — work without modification.

**Prerequisites:**

- Install [Git for Windows](https://gitforwindows.org) (includes Git Bash)
- Ensure `bash` is in your system PATH (Git for Windows adds this by default)
- If WSL is installed and Git Bash hooks fail, set the environment variable `CLAUDE_CODE_GIT_BASH_PATH` to the full path of your preferred bash (e.g., `C:\Program Files\Git\bin\bash.exe`)

---

## Adding Custom Hooks

Hooks are defined in `.claude/settings.json` under the `hooks` key. The structure is:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "shell command here"
          }
        ]
      }
    ]
  }
}
```

---

## Hook Events Reference

Claude Code supports 27 hook events. The `matcher` field filters when the hook fires within that event — leave empty to fire on every occurrence.

| Event                | Matcher Field                                                                                                         | Exit Code Behavior                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `PreToolUse`         | `tool_name` (e.g., `Bash`, `Write`)                                                                                   | 0=allow, 2=block (stderr to model), other=stderr to user                          |
| `PostToolUse`        | `tool_name`                                                                                                           | 0=stdout in transcript, 2=stderr to model, other=stderr to user                   |
| `PostToolUseFailure` | `tool_name`                                                                                                           | 0=stdout in transcript, 2=stderr to model, other=stderr to user                   |
| `Notification`       | `notification_type`                                                                                                   | 0=silent, other=stderr to user                                                    |
| `UserPromptSubmit`   | —                                                                                                                     | 0=stdout shown to Claude, 2=block prompt (stderr to user), other=stderr to user   |
| `SessionStart`       | `source` (startup, resume, clear, compact)                                                                            | 0=stdout shown to Claude, other=stderr to user                                    |
| `SessionEnd`         | `reason` (clear, logout, prompt_input_exit, other)                                                                    | 0=success, other=stderr to user                                                   |
| `Stop`               | —                                                                                                                     | 0=silent, 2=stderr to model (continues conversation), other=stderr to user        |
| `StopFailure`        | `error` (rate_limit, authentication_failed, billing_error, invalid_request, server_error, max_output_tokens, unknown) | Fire-and-forget — output ignored                                                  |
| `SubagentStart`      | `agent_type`                                                                                                          | 0=stdout shown to subagent, other=stderr to user                                  |
| `SubagentStop`       | `agent_type`                                                                                                          | 0=silent, 2=stderr to subagent (continues), other=stderr to user                  |
| `PreCompact`         | `trigger` (manual, auto)                                                                                              | 0=stdout as custom compact instructions, 2=block compaction, other=stderr to user |
| `PostCompact`        | `trigger` (manual, auto)                                                                                              | 0=stdout to user, other=stderr to user                                            |
| `PermissionRequest`  | `tool_name`                                                                                                           | 0=use hook decision if provided, other=stderr to user                             |
| `PermissionDenied`   | `tool_name`                                                                                                           | 0=stdout in transcript, other=stderr to user                                      |
| `Setup`              | `trigger` (init, maintenance)                                                                                         | 0=stdout shown to Claude, other=stderr to user                                    |
| `TeammateIdle`       | —                                                                                                                     | 0=silent, 2=stderr to teammate (prevents idle), other=stderr to user              |
| `TaskCreated`        | —                                                                                                                     | 0=silent, 2=stderr to model (blocks creation), other=stderr to user               |
| `TaskCompleted`      | —                                                                                                                     | 0=silent, 2=stderr to model (blocks completion), other=stderr to user             |
| `Elicitation`        | `mcp_server_name`                                                                                                     | 0=use hook response, 2=deny elicitation, other=stderr to user                     |
| `ElicitationResult`  | `mcp_server_name`                                                                                                     | 0=use hook response, 2=block response, other=stderr to user                       |
| `ConfigChange`       | `source` (user_settings, project_settings, local_settings, policy_settings, skills)                                   | 0=allow, 2=block change, other=stderr to user                                     |
| `InstructionsLoaded` | `load_reason` (session_start, nested_traversal, path_glob_match, include, compact)                                    | Observability-only — does not support blocking                                    |
| `WorktreeCreate`     | —                                                                                                                     | 0=stdout is worktree path, other=creation failed                                  |
| `WorktreeRemove`     | —                                                                                                                     | 0=success, other=removal failed                                                   |
| `CwdChanged`         | —                                                                                                                     | 0=silent, other=stderr to user                                                    |
| `FileChanged`        | —                                                                                                                     | 0=silent, other=stderr to user                                                    |

### Key Event Use Cases

**PreToolUse** — The most powerful hook event. Runs before any tool executes. Exit code 2 blocks the tool call entirely and sends stderr as feedback to the model. Use cases: block destructive git commands, validate file paths before writes, enforce coding standards before edits.

**UserPromptSubmit** — Runs when the user submits a prompt, before Claude processes it. Exit code 0 appends stdout to what Claude sees. Exit code 2 blocks the prompt entirely. Use cases: prompt linting, adding context to every prompt, blocking sensitive content.

**SubagentStart** — Fires when any subagent (Agent tool call) starts. Matcher filters by agent type. Use cases: inject per-agent context, log agent activity, enforce agent-specific rules.

**PreCompact** — Fires before compaction. Exit code 0 appends stdout as custom compact instructions (telling the summarizer what to preserve). Exit code 2 blocks compaction entirely. Use cases: preserve specific context during compaction, prevent compaction during critical operations.

**SessionEnd** — Fires when a session ends. Matcher values: `clear` (user cleared), `logout`, `prompt_input_exit` (user quit), `other`. Use cases: cleanup temp files, save session state, send notifications.

**InstructionsLoaded** — Observability-only hook that fires when CLAUDE.md or rule files are loaded. Cannot block loading. Input includes `file_path`, `memory_type`, `load_reason`, and optional `globs`/`trigger_file_path`/`parent_file_path`. Use cases: audit which instructions are active, log rule loading for debugging.

---

## Hook Types

Claude Code supports 4 hook types. Each type has different fields and execution models.

### Command Hook

Shell command executed in bash. The most common type.

```json
{
  "type": "command",
  "command": "npm test || true"
}
```

| Field           | Required | Type                       | Description                                                 |
| --------------- | -------- | -------------------------- | ----------------------------------------------------------- |
| `type`          | Yes      | `"command"`                | Hook type identifier                                        |
| `command`       | Yes      | string                     | Shell command to execute                                    |
| `if`            | No       | string                     | Permission rule syntax filter (e.g., `"Bash(git *)"`)       |
| `shell`         | No       | `"bash"` or `"powershell"` | Shell interpreter override                                  |
| `timeout`       | No       | number                     | Timeout in seconds                                          |
| `statusMessage` | No       | string                     | Custom spinner text while hook runs                         |
| `once`          | No       | boolean                    | If true, hook runs once then is removed                     |
| `async`         | No       | boolean                    | If true, runs in background without blocking                |
| `asyncRewake`   | No       | boolean                    | Background run; wakes model on exit code 2. Implies `async` |

### Prompt Hook

Sends a prompt to an LLM model for evaluation. The model returns `{ok: true}` or `{ok: false, reason: "..."}`.

```json
{
  "type": "prompt",
  "prompt": "Check if this edit is safe: $ARGUMENTS"
}
```

| Field           | Required | Type       | Description                                                    |
| --------------- | -------- | ---------- | -------------------------------------------------------------- |
| `type`          | Yes      | `"prompt"` | Hook type identifier                                           |
| `prompt`        | Yes      | string     | Prompt text. `$ARGUMENTS` is replaced with hook input JSON     |
| `if`            | No       | string     | Permission rule syntax filter                                  |
| `timeout`       | No       | number     | Timeout in seconds                                             |
| `model`         | No       | string     | Model ID (e.g., `"claude-sonnet-4-6"`). Defaults to fast model |
| `statusMessage` | No       | string     | Custom spinner text                                            |
| `once`          | No       | boolean    | Fire-once behavior                                             |

### HTTP Hook

POSTs hook input JSON to a URL. Useful for webhook integrations.

```json
{
  "type": "http",
  "url": "https://hooks.example.com/claude",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

| Field            | Required | Type         | Description                                                              |
| ---------------- | -------- | ------------ | ------------------------------------------------------------------------ |
| `type`           | Yes      | `"http"`     | Hook type identifier                                                     |
| `url`            | Yes      | string (URL) | Endpoint to POST to                                                      |
| `if`             | No       | string       | Permission rule syntax filter                                            |
| `timeout`        | No       | number       | Timeout in seconds                                                       |
| `headers`        | No       | object       | Additional headers. Values support `$VAR` / `${VAR}` syntax              |
| `allowedEnvVars` | No       | string[]     | Env vars allowed in header interpolation. Required for `$VAR` to resolve |
| `statusMessage`  | No       | string       | Custom spinner text                                                      |
| `once`           | No       | boolean      | Fire-once behavior                                                       |

### Agent Hook

Spawns a small agent to evaluate a prompt. More capable than prompt hooks — the agent can use tools.

```json
{
  "type": "agent",
  "prompt": "Verify that unit tests ran and passed. $ARGUMENTS"
}
```

| Field           | Required | Type      | Description                                                   |
| --------------- | -------- | --------- | ------------------------------------------------------------- |
| `type`          | Yes      | `"agent"` | Hook type identifier                                          |
| `prompt`        | Yes      | string    | What to verify. `$ARGUMENTS` is replaced with hook input JSON |
| `if`            | No       | string    | Permission rule syntax filter                                 |
| `timeout`       | No       | number    | Timeout in seconds (default 60)                               |
| `model`         | No       | string    | Model ID (e.g., `"claude-sonnet-4-6"`). Defaults to Haiku     |
| `statusMessage` | No       | string    | Custom spinner text                                           |
| `once`          | No       | boolean   | Fire-once behavior                                            |

---

## Custom Hook Examples

Block destructive git commands via PreToolUse:

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "input=$(cat); cmd=$(echo \"$input\" | jq -r '.command // empty'); case \"$cmd\" in *'git push --force'*|*'git reset --hard'*) echo 'Blocked: destructive git command' >&2; exit 2;; esac; exit 0",
          "statusMessage": "Checking command safety..."
        }
      ]
    }
  ]
}
```

Run tests after every file write:

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "npm test 2>/dev/null || true"
        }
      ]
    }
  ]
}
```

Webhook notification on session end:

```json
{
  "SessionEnd": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "http",
          "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
          "timeout": 5
        }
      ]
    }
  ]
}
```

---

## See Also

- [Permissions](/reference/permissions) -- the other half of settings.json
- [Configuration](/reference/configuration) -- full settings.json structure, environment variables
- [Slash Commands](/reference/slash-commands) -- `/compact-safe` relies on the PostCompact hook, `/start` supplements SessionStart
