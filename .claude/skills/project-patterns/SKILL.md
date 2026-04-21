---
description: "Architectural patterns, naming conventions, file organization, and error handling for the worclaude CLI project"
---

# Project Patterns

## Architecture Overview

Single-process Node.js CLI tool. No server, no database, no external service dependencies (except npm registry for version checks with 5s timeout). Pure filesystem operations — reads templates, writes scaffolded files, merges with existing user files.

**Layer diagram:**
```
CLI Entry (index.js)
  └── Commands (commands/*.js) — orchestration, user flow
        ├── Prompts (prompts/*.js) — Inquirer interactions, isolated from logic
        ├── Core (core/*.js) — business logic, no user interaction*
        ├── Generators (generators/*.js) — produce file content dynamically
        ├── Data (data/*.js) — constants, catalogs, registries
        └── Utils (utils/*.js) — pure helpers, no side effects
```

*Exception: `merger.js` calls `promptHookConflict()` directly — pragmatic compromise.

**Key invariant:** Commands orchestrate between prompts and core. Prompts never call core directly. Core never prompts the user (except merger.js).

## Naming Conventions

- **Files:** kebab-case everywhere, no exceptions (`agent-routing.js`, `file-categorizer.js`, `claude-md-merge.js`)
- **Test files:** mirror source name + `.test.js` suffix (`merger.test.js`, `agent-routing-integration.test.js`)
- **Functions:** camelCase (`buildSettingsJson`, `mergeSettingsPermissionsAndHooks`)
- **Constants:** UPPER_SNAKE_CASE (`UNIVERSAL_AGENTS`, `AGENT_CATALOG`)
- **No private prefix:** unexported functions are private by convention — no underscore prefix

## File Organization

Layer-based (not feature-based):

```
src/
├── index.js              # CLI entry point (Commander.js setup)
├── commands/             # One file per CLI command (init, upgrade, status, backup, restore, diff)
├── core/                 # Business logic: scaffolder, merger, detector, backup, config, file-categorizer
├── prompts/              # Inquirer prompt definitions: project-type, tech-stack, agent-selection, conflicts
├── generators/           # Dynamic content builders (agent-routing.js)
├── data/                 # Constants: agents.js (catalogs), agent-registry.js (routing metadata)
└── utils/                # Pure helpers: display.js, file.js, hash.js, time.js, npm.js

templates/                # User-facing template files (quality matters — these ship to users)
├── settings/             # 16 language-specific + base + docker JSON templates
├── agents/               # universal/ (5) + optional/ (18 across 6 categories)
├── commands/             # 10 slash command templates
└── skills/               # universal/ (9) + templates/ (3 placeholder skills)

tests/
├── commands/             # Tests mirror src/ structure
├── core/
├── prompts/
├── utils/
└── fixtures/             # Test projects: fresh-project, existing-project, workflow-project
```

**Where new things go:**
- New CLI command → `src/commands/` + register in `src/index.js`
- New agent → template in `templates/agents/` + entry in `agents.js` + entry in `agent-registry.js`
- New skill → template in `templates/skills/` + scaffolder reference + hash computation
- New utility → `src/utils/` (must be pure, no side effects)

## Common Patterns

### Display namespace pattern
All user-facing output goes through `display.*`:
```js
import * as display from '../utils/display.js';
display.success('Done!');
display.error('Something failed');
display.newline();
```
Never use `console.log` for user output.

### JSON manipulation pattern
Always operate on parsed objects, never on stringified JSON:
```js
// CORRECT
const settings = JSON.parse(templateContent);
settings.permissions.allow.push(...newPermissions);
const output = JSON.stringify(settings, null, 2);

// WRONG — will break on special characters
const output = templateString.replace('{{permissions}}', newPermissions);
```

### Two-pass JSON parsing (parseUserJson)
User JSON files may have shell-escaped braces from zsh heredoc artifacts:
```js
// Pass 1: try raw JSON.parse
// Pass 2: strip \{ → { and \} → }, then JSON.parse
// Both fail: throw with clear error message
```
Don't simplify to a single pass.

### Tiered merge hierarchy
- **Tier 1 (additive):** only when target file doesn't exist at all
- **Tier 2 (reference copy):** always saves the template under `.claude/workflow-ref/<path>` when same-name file exists (even if content is identical). Preserves the original filename so `diff` against the live file is trivial. Kept out of `.claude/commands/` and `.claude/agents/` to avoid being discovered as a phantom command or agent.
- **Tier 3 (interactive):** only for CLAUDE.md and hook matcher conflicts

### Adding a new agent end-to-end
1. Create template in `templates/agents/optional/{category}/`
2. Add to `AGENT_CATALOG` in `src/data/agents.js`
3. Add routing metadata in `src/data/agent-registry.js`
4. Add to scaffolder file list for hash computation
5. Write tests
6. Test Scenario A (fresh) and Scenario B (existing with conflicts)

## Error Handling Philosophy

No central error handler. Try/catch at the command level:

```js
// Pattern in every command file
try {
  // ... main work
} catch (err) {
  spinner?.fail('Human-readable failure message');
  display.error(err.message);
  process.exit(1);
}
```

- **Operational errors** (malformed JSON, missing files): throw with clear message from the detecting function, bubble up to command-level catch
- **User errors** (invalid input): handled inline by Inquirer validation, never throw
- **Network errors** (npm registry): caught with timeout, graceful degradation (skip version check)
- **Permission errors** (EACCES on npm install): caught specifically, suggest `sudo`

No retry logic anywhere. No circuit breakers. Operations are local and idempotent — if something fails, the user re-runs the command.
