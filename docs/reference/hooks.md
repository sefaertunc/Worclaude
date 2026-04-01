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

**Hook events:**

| Event          | When It Fires                                                                            |
| -------------- | ---------------------------------------------------------------------------------------- |
| `SessionStart` | When a Claude Code session begins. `matcher` is typically empty (fires on all sessions). |
| `PostToolUse`  | After Claude uses a tool. `matcher` filters by tool name (e.g., `Write\|Edit`, `Stop`).  |
| `PostCompact`  | After context compaction. `matcher` is typically empty (fires on all compactions).       |

**Custom hook examples:**

```json
// Run tests after every file write
{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "npm test 2>/dev/null || true"
  }]
}

// Log tool usage
{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": "echo \"$(date): tool used\" >> .claude-log.txt"
  }]
}
```

---

## See Also

- [Permissions](/reference/permissions) -- the other half of settings.json
- [Configuration](/reference/configuration) -- full settings.json structure, environment variables
- [Slash Commands](/reference/slash-commands) -- `/compact-safe` relies on the PostCompact hook, `/start` supplements SessionStart
