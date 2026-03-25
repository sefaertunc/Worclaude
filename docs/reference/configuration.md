# Configuration

Worclaude manages three configuration files. Two live inside `.claude/` and one at the project root.

## settings.json

**Path:** `.claude/settings.json`

The Claude Code settings file. Controls what tools Claude can use without confirmation and what commands run automatically in response to events.

**Structure:**

```json
{
  "permissions": {
    "allow": ["// -- Section Comment --", "Bash(command:*)", "Edit(pattern)"]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "formatter" }]
      },
      {
        "matcher": "Stop",
        "hooks": [{ "type": "command", "command": "notification" }]
      }
    ],
    "PostCompact": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "re-read context" }]
      }
    ]
  }
}
```

| Section             | Purpose                             | Details                                   |
| ------------------- | ----------------------------------- | ----------------------------------------- |
| `permissions.allow` | Pre-approved tool invocations       | See [Permissions](/reference/permissions) |
| `hooks.PostToolUse` | Commands triggered after tool use   | See [Hooks](/reference/hooks)             |
| `hooks.PostCompact` | Commands triggered after compaction | See [Hooks](/reference/hooks)             |

**Built from:** Base permissions (`templates/settings/base.json`) merged with per-stack permissions (e.g., `templates/settings/python.json`, `templates/settings/node.json`) based on selected tech stack. Formatter and notification commands are substituted from stack and OS detection.

**Merge behavior:** During `worclaude init` (Scenario B) and `worclaude upgrade`, new permissions are appended to the existing allow list. Duplicates are skipped. Existing permissions are never removed. Hook merging adds new hooks and reports conflicts for manual resolution.

---

## workflow-meta.json

**Path:** `.claude/workflow-meta.json`

Installation metadata used by `worclaude upgrade`, `worclaude status`, and `worclaude diff` to track what was installed and detect changes.

**Structure:**

```json
{
  "version": "1.1.0",
  "installedAt": "2026-03-25T14:30:22.000Z",
  "lastUpdated": "2026-03-25T14:30:22.000Z",
  "projectTypes": ["Backend / API", "CLI tool"],
  "techStack": ["node", "python"],
  "universalAgents": [
    "plan-reviewer",
    "code-simplifier",
    "test-writer",
    "build-validator",
    "verify-app"
  ],
  "optionalAgents": ["api-designer", "bug-fixer"],
  "useDocker": false,
  "fileHashes": {
    "agents/plan-reviewer.md": "a1b2c3...",
    "commands/start.md": "d4e5f6...",
    "skills/testing.md": "g7h8i9..."
  }
}
```

| Field             | Type     | Purpose                                                                                                        |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `version`         | string   | Worclaude CLI version at install/upgrade time                                                                  |
| `installedAt`     | ISO 8601 | When `worclaude init` was first run                                                                            |
| `lastUpdated`     | ISO 8601 | When `worclaude init` or `worclaude upgrade` last ran                                                          |
| `projectTypes`    | string[] | Selected project types from init                                                                               |
| `techStack`       | string[] | Selected language identifiers (e.g., `"node"`, `"python"`)                                                     |
| `universalAgents` | string[] | Names of installed universal agents                                                                            |
| `optionalAgents`  | string[] | Names of installed optional agents                                                                             |
| `useDocker`       | boolean  | Whether Docker was selected during init                                                                        |
| `fileHashes`      | object   | SHA-256 hashes of all files in `.claude/` at install time (excluding `workflow-meta.json` and `settings.json`) |

**Hash tracking:** File hashes enable `worclaude diff` to detect user modifications and `worclaude upgrade` to determine which files can be auto-updated (unchanged) vs which need conflict resolution (modified by user).

**This file should not be edited manually.** It is maintained by `worclaude init` and `worclaude upgrade`.

---

## .mcp.json

**Path:** `.mcp.json` (project root)

MCP (Model Context Protocol) server configuration. Scaffolded with an empty server map.

**Structure:**

```json
{
  "mcpServers": {}
}
```

This file is a placeholder. MCP servers can be added to give Claude access to external tools and data sources (databases, APIs, custom tooling). The file is backed up and restored by `worclaude backup` and `worclaude restore`.

**Example with servers configured:**

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

---

## File Relationships

```
project-root/
  CLAUDE.md                     ← main instruction file (never auto-merged)
  .mcp.json                     ← MCP server config
  .claude/
    settings.json               ← permissions + hooks
    workflow-meta.json           ← installation metadata
    agents/                     ← agent definitions
    commands/                   ← slash commands
    skills/                     ← knowledge files
```

---

## See Also

- [Permissions](/reference/permissions) -- details on the permissions allow list
- [Hooks](/reference/hooks) -- details on the three installed hooks
- [CLI Commands](/reference/commands) -- `worclaude status` reads workflow-meta.json, `worclaude diff` uses file hashes
