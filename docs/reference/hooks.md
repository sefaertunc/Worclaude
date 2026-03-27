# Hooks

Worclaude configures Claude Code hooks in `.claude/settings.json`. Hooks are commands that run automatically in response to Claude's actions. Three hooks are installed by default.

## Installed Hooks

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

| Event         | When It Fires                                                                           |
| ------------- | --------------------------------------------------------------------------------------- |
| `PostToolUse` | After Claude uses a tool. `matcher` filters by tool name (e.g., `Write\|Edit`, `Stop`). |
| `PostCompact` | After context compaction. `matcher` is typically empty (fires on all compactions).      |

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
- [Configuration](/reference/configuration) -- full settings.json structure
- [Slash Commands](/reference/slash-commands) -- `/compact-safe` relies on the PostCompact hook
