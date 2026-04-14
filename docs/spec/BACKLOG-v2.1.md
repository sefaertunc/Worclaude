# Backlog — v2.1.0+ Enhancements

Items informed by Claude Code source code analysis (April 2026).
Items marked ✅ were implemented in v2.0.1 or later.

## Phase 4 (implemented in feat/phase-4, pending release)

- ✅ plugin.json generation (opt-in) — scaffolds `.claude-plugin/plugin.json` during `worclaude init` with paths matching Worclaude's `.claude/` layout (`./.claude/agents/<name>.md`, `./.claude/skills/`, `./.claude/commands/`). Built via `JSON.stringify` (never string-substitution on JSON). No `hooks` field (Claude Code v2.1+ auto-loads `hooks/hooks.json`; declaring it causes "Duplicate hooks file" errors). Idempotent — skips if file exists. Default off.
- ✅ Skill activation hint hook (`templates/hooks/skill-hint.cjs`) — `UserPromptSubmit` token-overlap match against installed skill directory names. Gated on `standard`/`strict` profiles.
- ✅ `disableSkillShellExecution` awareness notes on shell-heavy skill templates (verification, git-conventions, review-and-handoff, and related). Advises users to run commands manually if the setting is enabled.
- ✅ GTD memory scaffold (opt-in) — creates `docs/memory/decisions.md` and `docs/memory/preferences.md` for team-shared, version-controlled decision logs. Idempotent per file. CLAUDE.md Memory Architecture section gets pointer bullets via `{memory_architecture_extras}` variable substitution when opted in. Default off.
- ✅ Prompt-hook example + `templates/hooks/README.md` — ships a complete valid `PreToolUse` prompt hook for commit-message validation using the verified schema (`$ARGUMENTS` placeholder, `model` sibling of `type`, `{ok, reason}` response). README documents all four scaffolded hooks, the three handler types, hook profiles, and the `disableSkillShellExecution` non-interaction with hook scripts.

Follow-up items discovered during Phase 4 implementation:

### `worclaude upgrade --with-plugin` / `--with-memory` flags

Retrofit opt-in extras onto existing workflows. Currently once `workflow-meta.json` exists the `init` scenario short-circuits with an upgrade message, so users cannot re-run `init` to add plugin.json or memory scaffolding later. These flags would let existing users opt in via `upgrade`.

### skill-hint frontmatter enrichment

`skill-hint.cjs` currently matches user-prompt keywords against skill directory names only. Reading each skill's `description:` frontmatter would produce richer keyword coverage and a higher auto-activation hit rate.

### Claude Code plugin validator CI

Once `worclaude init --plugin-json` is used in CI, add a step that runs `claude plugin validate` on the generated `.claude-plugin/plugin.json` to catch schema drift as Claude Code evolves.

## Phase 2 (implemented in feat/phase-2, pending release)

- ✅ Hook lifecycle expansion: 3 → 8 event types (PostToolUse, PostCompact, SessionStart, PreCompact, Stop, UserPromptSubmit, Notification, SessionEnd). Fixed Stop-matcher-on-PostToolUse bug.
- ✅ PreCompact emergency save hook (`templates/hooks/pre-compact-save.cjs`) — writes git context snapshot to `.claude/sessions/` before compaction
- ✅ Correction detection hook (`templates/hooks/correction-detect.cjs`) — regex-based pattern matching on UserPromptSubmit
- ✅ Learning capture hook (`templates/hooks/learn-capture.cjs`) — parses `[LEARN]` blocks from transcript on Stop, persists to `.claude/learnings/`
- ✅ `/learn` command for explicit learning capture
- ✅ `HOOK_FILES` manifest + `scaffoldHooks()` pipeline in scaffolder.js
- ✅ SessionStart hook loads recent learnings from `.claude/learnings/index.json`
- ✅ CLAUDE.md Memory Architecture + Learnings sections
- ✅ AGENTS.md generation for cross-tool compatibility (Cursor, Codex, etc.)
- ✅ Agent enrichment: confidence thresholds, worked examples, severity classification, 4-level verification depth
- ✅ Skill enrichment: Must-Haves Contract (planning-with-files), Gate Taxonomy (verification), Context Budget Tiers (context-management)
- ✅ Command enrichment: trigger phrases on all 17 commands, `$ARGUMENTS` support on start/end/verify/refactor-clean

## Agent Enhancements

### ✅ `criticalSystemReminder_EXPERIMENTAL`

A short message re-injected at every user turn for agents that tend to drift from constraints.
Applied to: verify-app, plan-reviewer, security-reviewer (read-only enforcement).
**Frontmatter:** `criticalSystemReminder: "CRITICAL: You CANNOT edit files. Report findings only."`

### ✅ Agent `skills` preloading

Agents can declare which skills to preload automatically, bypassing conditional activation.
Applied to: test-writer (testing), security-reviewer (security-checklist).
**Frontmatter:** `skills: [testing]`

### ✅ Agent `initialPrompt`

Text prepended to the agent's first turn. Slash commands work inside it.
Applied to: verify-app with `initialPrompt: "/start"` to auto-load session context.
**Frontmatter:** `initialPrompt: "/start"`

### Agent `mcpServers`

Per-agent MCP server configuration. Agents can declare which MCP servers they need.
Example: a deployment agent that requires a specific CI/CD MCP server.
**Frontmatter:** `mcpServers: ["slack", {"custom-server": {"command": "node", "args": ["server.js"]}}]`

### Agent `requiredMcpServers`

Availability gating — agent only appears if required MCP servers are connected.
**Frontmatter:** `requiredMcpServers: ["github"]`

## Skill Enhancements

### Skill `context: fork`

Skills can run in forked subagents for isolation. Useful for heavyweight skills
that do analysis without polluting the main agent's context.
**Frontmatter:** `context: fork`

### Skill `model` override

Per-skill model selection. Lightweight skills could use haiku, complex analysis skills could use opus.
**Frontmatter:** `model: haiku`

### ✅ Skill `version` field

Version tracking for skills. Useful for upgrade path detection and changelog generation.
Applied to: all 11 universal skill templates.
**Frontmatter:** `version: "1.0.0"`

### Skill `agent` routing

Skills can route to a specific agent type when invoked.
**Frontmatter:** `agent: test-writer`

## Doctor Enhancements

### ✅ Content-aware CLAUDE.md recommendations

When CLAUDE.md exceeds 20KB, doctor analyzes sections by size and suggests extracting
the largest ones to conditional skills. Identifies top 3 sections > 2KB with sizes.

### ✅ Agent frontmatter completeness scoring

Doctor scores agents on optional field usage (model, maxTurns, disallowedTools, background,
memory, skills, initialPrompt, criticalSystemReminder, etc.) and suggests additions for
read-only agents missing criticalSystemReminder.

## Testing Enhancements

### ✅ Template output validation matrix

Settings validation matrix test (settings-matrix.test.js): 46 tests covering all 16 tech
stacks (single + docker), multi-stack merges, "Other/None" edge case, permission
deduplication, and agent category recommendations for all 7 project types.

## Infrastructure

### `claude --worktree` command visibility

Claude Code's `--worktree` flag creates a minimal `.claude/` inside the worktree that may
override git-tracked commands/skills/agents. This causes commands like `/review-plan` to
be missing in worktree sessions. Investigate whether this is fixable from Worclaude's side
(e.g., symlinks, documentation, workaround) or is a Claude Code behavior to document as
a limitation.

### ✅ MEMORY.md integration depth

~~Removed in v2.2.x — Claude Code's native memory system at `~/.claude/projects/<slug>/memory/` handles everything automatically. The project-root MEMORY.md template was redundant and pointed to the wrong directory.~~

## Competitive Awareness

### Similar npm packages

- `claude-flow` (Ruflo) — orchestration framework, 5900+ commits, WASM kernels. Different scope (runtime vs scaffolding) but overlapping audience.
- `claude-code-templates` — component catalog with 100+ agents/commands/hooks. Complementary to Worclaude (they provide individual components, we provide an opinionated full workflow).
  Neither is a direct competitor, but worth tracking for feature ideas and differentiation.
