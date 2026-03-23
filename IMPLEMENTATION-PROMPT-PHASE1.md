# Implementation Prompt: Phase 1 — Foundation

## Context
Read `docs/spec/SPEC.md` first. It contains the complete product specification for claude-workflow, a CLI tool that scaffolds a Claude Code workflow system into any project.

Read `docs/spec/PROGRESS.md` for current state.

## Objective
Implement Phase 1: Foundation. This includes project setup, all template files, and the basic `init` command for Scenario A (fresh project only).

## Tasks

### 1. Project Setup
- Initialize package.json with name "claude-workflow", version "1.0.0"
- Add bin entry: `"claude-workflow": "./src/index.js"`
- Install dependencies: commander, inquirer, chalk, ora, fs-extra
- Install dev dependencies: vitest, eslint, prettier
- Set up ESLint and Prettier configs
- Add npm scripts: test, lint, format
- Add `#!/usr/bin/env node` shebang to src/index.js

### 2. CLI Entry Point (src/index.js)
- Set up Commander with program name, version, description
- Register all 6 commands (init, upgrade, status, backup, restore, diff)
- For Phase 1, only `init` has real implementation
- Other commands print "Coming in Phase 4" placeholder message

### 3. All Template Files
Create every template file as specified in SPEC.md. This is the bulk of Phase 1.

**Critical:** These are user-facing files that get installed into projects. Quality of content matters — they're not placeholders. Write them as real, useful agent prompts, skill guides, and command instructions.

Templates to create:
- `templates/claude-md.md` — CLAUDE.md template with {variable} placeholders
- `templates/mcp-json.json` — .mcp.json baseline
- `templates/workflow-meta.json` — metadata template
- `templates/progress-md.md` — PROGRESS.md template
- `templates/spec-md.md` — SPEC.md template
- `templates/settings/base.json` — universal permissions + hooks
- `templates/settings/python.json` — Python-specific additions
- `templates/settings/node.json` — Node/TS-specific additions  
- `templates/settings/rust.json` — Rust-specific additions
- `templates/settings/go.json` — Go-specific additions
- `templates/settings/docker.json` — Docker-specific additions
- `templates/agents/universal/` — all 5 universal agent .md files
- `templates/agents/optional/` — all 17 optional agent .md files organized by category
- `templates/commands/` — all 9 slash command .md files
- `templates/skills/universal/` — all 9 universal skill .md files
- `templates/skills/templates/` — all 3 template skill .md files

Use SPEC.md for the content of agents, commands, and the settings structure. For skills, write substantive content — these should be real guides, not stubs.

### 4. Basic Init Command (Scenario A only)
Implement `src/commands/init.js` for fresh projects:

1. Check if .claude/ exists → if yes, print message and exit (Scenario B/C handling comes in Phase 3)
2. Run interactive prompts:
   - Project name and description
   - Project type selection (multi-select with overlap warning)
   - Tech stack selection (based on project type)
   - Agent selection (universal shown, optional with category recommendations)
3. Scaffold all files:
   - Create CLAUDE.md from template with variables filled
   - Create .claude/settings.json by merging base + stack-specific settings
   - Create .claude/agents/ with universal + selected optional agents
   - Create .claude/commands/ with all 9 commands
   - Create .claude/skills/ with all universal + template skills
   - Create .mcp.json from template
   - Create docs/spec/PROGRESS.md and SPEC.md from templates
   - Create .claude/workflow-meta.json with installation metadata
4. Set OS-appropriate notification command in hooks
5. Set stack-appropriate formatter command in hooks
6. Display success message with next steps

### 5. Supporting Modules
- `src/core/scaffolder.js` — reads templates, substitutes variables, writes files
- `src/core/config.js` — creates/reads workflow-meta.json
- `src/utils/file.js` — file existence checks, directory creation, copy helpers
- `src/utils/display.js` — consistent terminal output formatting (success, error, info, header)
- `src/prompts/project-type.js` — project type multi-select with overlap warning
- `src/prompts/tech-stack.js` — tech stack questions based on project type
- `src/prompts/agent-selection.js` — agent catalog with category recommendations

## Verification
After implementation:
1. Run `node src/index.js init` in a temp directory — full flow should work
2. Verify all files are created in correct locations
3. Verify CLAUDE.md has project name and tech stack filled in
4. Verify settings.json has correct permissions for selected stack
5. Verify settings.json hooks have correct formatter and notification for the OS
6. Verify workflow-meta.json has correct metadata
7. Run `npm test` — basic tests should pass
8. Run `npm run lint` — no lint errors

## Constraints
- Use ES modules (import/export), not CommonJS
- Cross-platform: use path.join(), os.platform(), never hardcode path separators
- All user-facing output goes through src/utils/display.js for consistency
- Template variables use {variable_name} syntax
- No hardcoded paths — everything relative to process.cwd() for the target project
