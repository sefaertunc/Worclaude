---
description: "CLI-specific conventions: npm registry interaction, filesystem operations, JSON handling, settings merge, and configuration patterns for worclaude"
---

# CLI & Data Conventions

worclaude is a CLI tool, not a backend service. This skill covers the patterns that serve a similar role to backend conventions: data access (filesystem), external service interaction (npm registry), configuration management, and data format handling (JSON).

## Filesystem Access Patterns

All file operations use `fs-extra` (not raw `fs`):
- `fs.ensureDir()` for creating directories (idempotent)
- `fs.copy()` for template-to-project file copying
- `fs.readJson()` / `fs.writeJson()` for JSON files
- `fs.pathExists()` for existence checks before operations

Cross-platform rules:
- Always `path.join()` — never concatenate with `/`
- Normalize CRLF before hashing (`content.replace(/\r\n/g, '\n')`)
- Use `os.platform()` for OS-specific behavior (notification commands)

File utilities live in `src/utils/file.js`: `copyDirectory()`, `removeDirectory()`.

## npm Registry Interaction

Single external dependency: `https://registry.npmjs.org/worclaude`

```js
// Shared utility: src/utils/npm.js — getLatestNpmVersion()
// - 5-second timeout (AbortController)
// - Returns null on any error (offline, timeout, 404)
// - Used by: upgrade command (self-update check), status command (version display)
```

No auth tokens. No environment variables. Plain HTTPS fetch. Graceful degradation — every caller handles `null` return.

## JSON Handling

### Settings builder flow
```
Read template JSON → JSON.parse() → merge objects → replaceHookCommands() → JSON.stringify()
```

**Critical:** `replaceHookCommands()` operates on the parsed object's string values, not on the full JSON string. The formatter command and notification command are replaced inside individual hook command strings after parsing.

### Settings merge (append-only)
`mergeSettingsPermissionsAndHooks()`:
- Permissions: append new rules to existing array, deduplicate by string equality
- Hooks: append new hooks, check for matcher conflicts before adding
- Never removes or replaces existing user rules

### parseUserJson() two-pass strategy
```
Pass 1: JSON.parse(raw) — handles well-formed JSON
Pass 2: JSON.parse(raw.replace(/\\{/g, '{').replace(/\\}/g, '}')) — handles zsh artifacts
Fail: throw Error('Could not parse JSON: clear message')
```

### Template variable substitution
Template files use `{variable_name}` placeholders (single braces). These are replaced in the parsed object, not in raw JSON strings. Variables: `{project_name}`, `{description}`, `{tech_stack}`, `{formatter_command}`, `{notification_command}`.

## Configuration Management

### workflow-meta.json
The project's state tracker. Created during init, updated during upgrade.

```json
{
  "version": "1.3.4",
  "installedAt": "ISO timestamp",
  "lastUpdated": "ISO timestamp",
  "projectTypes": ["cli"],
  "techStack": ["node"],
  "useDocker": false,
  "universalAgents": ["plan-reviewer", ...],
  "optionalAgents": ["bug-fixer", ...],
  "fileHashes": { "agents/plan-reviewer.md": "sha256", ... }
}
```

**Hash computation:** SHA-256 of CRLF-normalized file content. Used by upgrade and diff commands to detect which files the user has customized vs which are unchanged from install.

**useDocker field:** Added for settings rebuild during upgrade — determines whether docker.json permissions are included.

### Scenario detection (detector.js)
```
No .claude/ AND no CLAUDE.md → Scenario A (fresh)
.claude/ OR CLAUDE.md exists, but no .claude/workflow-meta.json → Scenario B (existing)
.claude/workflow-meta.json exists → Scenario C (upgrade)
```

## Error Handling

CLI-specific error patterns:
- **Malformed user JSON:** `parseUserJson()` throws with clear message naming the file
- **npm registry errors:** return `null`, caller shows "(offline)" or skips version check
- **EACCES on npm install:** catch specifically, suggest `sudo npm install -g worclaude`
- **Corrupted settings.json:** detected during Scenario B merge, shown as clear error, doesn't crash

All errors surface through `display.error()` (Chalk-styled red output), never raw `console.error`.
