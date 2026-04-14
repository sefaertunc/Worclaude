# Phase 6 — Documentation Update

## Context

You are working on **Worclaude** (`sefaertunc/Worclaude`). Phases 2-5 are complete. You are on the `develop` branch (or a `feat/documentation` branch from develop). This phase updates all documentation to reflect the new features and prepares the project for public visibility.

**Before starting, read these files to understand the current state:**

```bash
# Current README
cat README.md

# Current VitePress docs
ls docs/guide/
ls docs/reference/
cat docs/guide/introduction.md
cat docs/guide/getting-started.md
cat docs/reference/commands.md
cat docs/reference/hooks.md
cat docs/reference/skills.md
cat docs/reference/agents.md
cat docs/reference/configuration.md

# VitePress config (sidebar, nav)
cat docs/.vitepress/config.mjs

# Source of truth for counts
cat src/data/agents.js

# What Phase 2-5 added (read the backlog for completed items)
cat docs/spec/BACKLOG-v2.1.md
```

---

## Task 1: Update README.md

The current README is outdated — it lists 16 commands, 15 skills, and doesn't mention hooks beyond basics, the correction system, AGENTS.md, the learnings system, or the doctor improvements.

### 1.1 Add banner image

The banner is at `assets/worclaude.png`. Add it as the first element:

```markdown
<p align="center">
  <img src="assets/worclaude.png" alt="Worclaude — The Workflow Layer for Claude Code" width="100%" />
</p>
```

### 1.2 Update badge row

Replace the current 2 badges with a full row. Verify each URL works before committing:

```markdown
<p align="center">
  <a href="https://www.npmjs.com/package/worclaude"><img src="https://img.shields.io/npm/v/worclaude" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/worclaude"><img src="https://img.shields.io/npm/dm/worclaude" alt="downloads" /></a>
  <a href="https://github.com/sefaertunc/Worclaude/actions"><img src="https://img.shields.io/github/actions/workflow/status/sefaertunc/Worclaude/ci.yml?label=tests" alt="tests" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/sefaertunc/Worclaude" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node >= 18" />
  <a href="https://img.shields.io/badge/built%20for-Claude%20Code-cc785c"><img src="https://img.shields.io/badge/built%20for-Claude%20Code-cc785c" alt="Built for Claude Code" /></a>
</p>
```

Check: does a CI workflow file exist at `.github/workflows/ci.yml`? If not, either create one or remove the tests badge. Run `ls .github/workflows/` to verify.

### 1.3 Add stats table

After the intro paragraph, add a stats table. Count the ACTUAL numbers from `src/data/agents.js`:

```markdown
<div align="center">

| Commands | Agents | Skills | Hooks | Tech Stacks |
|----------|--------|--------|-------|-------------|
| {COMMAND_FILES.length} | {UNIVERSAL_AGENTS.length} + {AGENT_CATALOG keys count} | {UNIVERSAL_SKILLS.length} | {count hook events in base.json} | {TECH_STACKS.length} |
| Slash Commands | Universal + Optional | Workflow Skills | Lifecycle Events | Auto-detected |

</div>
```

Read the actual arrays and count — do NOT hardcode numbers from the old README.

### 1.4 Update "What You Get" section

Update ALL counts and lists to match current state:

- **Agents**: Count from `UNIVERSAL_AGENTS` and `AGENT_CATALOG`
- **Commands**: List from `COMMAND_FILES` — Phase 2 added `/learn`
- **Skills**: Count from `UNIVERSAL_SKILLS` — Phase 5 added `coding-principles`
- **Hooks**: Update to reflect Phase 2's expanded hook coverage (PreCompact, UserPromptSubmit, Stop, SessionEnd, Notification — not just the original 3)
- **New section — Learnings**: Brief mention of the correction capture system (`/learn`, `[LEARN]` blocks, `.claude/learnings/`)
- **New section — Cross-tool**: Mention AGENTS.md generation for Cursor/Codex/Copilot compatibility
- **New section — Doctor**: Mention `worclaude doctor` validates hook events, CLAUDE.md size, deprecated models, learnings integrity, gitignore coverage

### 1.5 Update Quick Start

Keep it short but add the one-liner npx option at the top:

```markdown
## Quick Start

```bash
npx worclaude init
```

Or install globally:

```bash
npm install -g worclaude
cd your-project
worclaude init
```
```

### 1.6 Update Commands table

Add any new commands from Phase 2-4. Currently missing from the table: `doctor` is there but verify all CLI commands match `src/index.js`.

### 1.7 Add Support section

At the bottom, before Links:

```markdown
## Support

If Worclaude saves you time, consider supporting the project:

<a href="https://buymeacoffee.com/sefaertunc"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buymeacoffee" alt="Buy Me a Coffee" /></a>
<a href="https://github.com/sponsors/sefaertunc"><img src="https://img.shields.io/badge/GitHub%20Sponsors-support-ea4aaa?logo=githubsponsors" alt="GitHub Sponsors" /></a>
```

### 1.8 Update Links section

Add docs link and community links:

```markdown
## Links

- [Full Documentation](https://sefaertunc.github.io/Worclaude/)
- [npm Package](https://www.npmjs.com/package/worclaude)
- [GitHub Issues](https://github.com/sefaertunc/Worclaude/issues)
- [Contributing](CONTRIBUTING.md)
- [License: MIT](LICENSE)
```

---

## Task 2: Update VitePress reference docs

### 2.1 Update `docs/reference/hooks.md`

This page must document ALL hook events Worclaude scaffolds (not just the original 3). Phase 2 expanded from 3 to 7+ event types. Read `templates/settings/base.json` and document each:

- **PostToolUse** (Edit|Write formatter, TypeScript checker)
- **PostCompact** (context re-read)
- **PreCompact** (emergency save — NEW)
- **SessionStart** (context loading + learnings)
- **Stop** (learning capture — NEW)
- **SessionEnd** (notification — NEW)
- **UserPromptSubmit** (correction detection, skill hints — NEW)
- **Notification** (desktop alerts — NEW)

For each, document: what it does, when it fires, what the hook profile behavior is (minimal/standard/strict), and whether it's async.

### 2.2 Update `docs/reference/commands.md`

Verify this page lists ALL commands from `COMMAND_FILES`. Phase 2 added `/learn`. Check if it's documented.

### 2.3 Update `docs/reference/skills.md`

Phase 5 added `coding-principles`. Update the skills list and add its description.

### 2.4 Update `docs/reference/agents.md`

Phase 2 enriched all 5 universal agents with confidence thresholds, worked examples, verification depth levels, etc. Update the descriptions to reflect the new capabilities.

### 2.5 Add `docs/reference/learnings.md` (new page)

Create a new reference page documenting the learnings system:

- How correction detection works (regex patterns, UserPromptSubmit hook)
- How learning capture works ([LEARN] blocks, Stop hook)
- How learnings load at session start (SessionStart hook, index.json)
- The `/learn` command
- File format (`.claude/learnings/{category-slug}.md` with YAML frontmatter)
- The `index.json` structure
- Why learnings are gitignored (personal, not shared)

### 2.6 Update VitePress sidebar

Read `docs/.vitepress/config.mjs` and add the new `learnings.md` page to the sidebar under Reference.

---

## Task 3: Update VitePress guide docs

### 3.1 Update `docs/guide/getting-started.md`

Verify the getting-started guide reflects the current `worclaude init` output — does it mention `.claude/hooks/`, `.claude/learnings/`, `AGENTS.md`?

### 3.2 Update `docs/guide/claude-code-integration.md`

This should cover the new hook events, the learnings system, and AGENTS.md.

### 3.3 Update `docs/guide/workflow-tips.md`

Add tips about:
- Using `/learn` to capture corrections
- The coding-principles skill for behavioral guidance
- CLAUDE.md line budget (keep under 200 lines)
- Split architecture (static rules in CLAUDE.md, auto-learnings in `.claude/learnings/`)

---

## Task 4: GitHub repository polish

### 4.1 Set repository social preview

Note for user: manually upload `assets/worclaude.png` as the GitHub social preview at: Settings → General → Social preview. This can't be done via CLI.

### 4.2 Update repository description

Note for user: update the GitHub repo description to: "The Workflow Layer for Claude Code — scaffold agents, commands, skills, hooks, and memory into any project"

### 4.3 Update repository topics

Note for user: set these topics on the GitHub repo: `claude-code`, `claude-code-workflow`, `claude-code-scaffolding`, `cli`, `developer-tools`, `ai`, `anthropic`, `agents`, `workflow`, `scaffolding`

### 4.4 Verify `.github/` community files

Check these exist (Phase v2.2.6 added community standards):
```bash
ls .github/
cat .github/ISSUE_TEMPLATE/ 2>/dev/null
cat .github/PULL_REQUEST_TEMPLATE.md 2>/dev/null
cat CODE_OF_CONDUCT.md 2>/dev/null
cat SECURITY.md 2>/dev/null
```

If any are missing, note it but don't create them in this phase — they were supposedly added in v2.2.6.

---

## Task 5: Verify npm package metadata

### 5.1 Check package.json keywords

Read `package.json` keywords array. Add these if missing:
- `claude-code-workflow`
- `claude-code-scaffolding`
- `workflow`
- `memory`
- `hooks`

These improve npm discoverability.

### 5.2 Check package.json description

Verify the description is compelling for npm search results. Current: "CLI tool that scaffolds a comprehensive Claude Code workflow into any project". Consider: "The Workflow Layer for Claude Code — scaffold agents, commands, skills, hooks, and memory into any project"

---

## Task 6: Version bump preparation

Do NOT publish yet, but prepare:

1. Decide the next version number. Given the scope of Phases 2-5 (new features, not breaking changes):
   - If correction system + hooks + AGENTS.md + doctor improvements + coding-principles = **minor bump → v2.3.0**
   
2. Do NOT run `npm version` or change package.json version — that happens during the release process via `/commit-push-pr` or `/sync`

3. Draft a CHANGELOG entry or release notes covering:
   - Correction capture system (`/learn`, `[LEARN]` blocks, `.claude/learnings/`)
   - Hook lifecycle expansion (3 → 7+ event types)
   - PreCompact emergency save hook
   - AGENTS.md cross-tool compatibility
   - Agent enrichment (confidence thresholds, verification depth, worked examples)
   - Skill enrichment (must-haves, gate taxonomy, context budget tiers)
   - Command enrichment (trigger phrases, $ARGUMENTS)
   - Coding-principles skill (Karpathy-derived behavioral reference)
   - Doctor improvements (hook validation, line count, deprecated models, learnings checks)
   - Plugin.json generation (optional)
   - Skill activation hints (UserPromptSubmit hook)

   Write this to `docs/phases/CHANGELOG-v2.3.0-DRAFT.md` for review before release.

---

## Task 7: Final checks

```bash
npm test
npm run lint
npm run format
npm run docs:build  # Verify VitePress builds without errors
```

Fix any failures.

---

## Execution Order

1. **Task 1** (README) — highest visibility, do first
2. **Task 2** (VitePress reference) — deepest content update
3. **Task 3** (VitePress guides) — lighter updates
4. **Task 4** (GitHub polish) — some items are manual notes for the user
5. **Task 5** (npm metadata) — quick keyword additions
6. **Task 6** (version prep) — changelog draft
7. **Task 7** (final checks) — validate everything

## Critical Rules

- **Read existing docs before rewriting** — update, don't replace wholesale. Preserve structure and tone.
- **Count from source** — all numbers (commands, agents, skills, hooks) must come from `src/data/agents.js` and `templates/settings/base.json`, not from memory or old README
- **Check every badge URL** — broken badges look worse than no badges
- **VitePress must build** — `npm run docs:build` must succeed after changes
- **Don't duplicate content** — README is the overview, VitePress is the detail. Don't put the same long explanation in both.
- **Feature branches don't modify shared-state files** — if README.md is considered shared-state in your branching model, handle accordingly (same issue Phase 4 surfaced). Check the project's git-conventions skill or CLAUDE.md rule #8 for guidance.
- **Commit messages** — `docs:` prefix for all changes
- **The banner image is at `assets/worclaude.png`** — verify the file exists before referencing it in README
