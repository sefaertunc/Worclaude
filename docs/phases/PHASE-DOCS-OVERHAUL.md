# Phase: Documentation Overhaul v2.2.6

## Branch

Create `docs/overhaul-v2.2.6` from `develop`.

## Context

The documentation has accumulated cruft across many version bumps. This phase cleans it up in three areas: README trim, demo removal, and VitePress docs refresh to match v2.2.x reality.

## Part 1: README.md — Trim to essentials

The README is too long. Remove the entire "What's New in v2.x" section (from `## What's New in v2.x` through the line before `## Quick Start`). This is changelog material, not README material — it belongs in release notes and the docs site.

Also remove the "Interactive Demo" link from the top links line and from the bottom Links section, since we're removing the demo.

The README should have these sections only:

1. Title + tagline + badges
2. Top links (Full Documentation · npm — no demo)
3. One-paragraph description
4. What You Get (agents, commands, skills, hooks, config — keep as-is)
5. Quick Start
6. Commands table
7. Links (no demo)

## Part 2: Remove interactive demo entirely

Delete these files/directories:

- `docs/demo/` (entire directory)
- `docs/.vitepress/theme/components/WorkflowDemo.vue`
- `docs/RECORDING-INSTRUCTIONS.md`

Update these files:

- `docs/.vitepress/config.mjs` — remove Demo from nav bar, remove any demo-related theme config
- `docs/index.md` — remove the "Try the Demo" action button from the hero section

Check if `docs/.vitepress/theme/` has an `index.js` or `index.ts` that registers WorkflowDemo — if so, remove that registration. If the theme directory becomes empty after removing the component, remove the entire custom theme setup and let VitePress use defaults.

## Part 3: VitePress docs content refresh

Read ALL doc pages and verify accuracy against the current templates on `develop`. Key things to check and fix:

1. **docs/index.md** — verify feature counts (agents, commands, skills) match actual template counts. Currently says "25 Specialized Agents", "16 Slash Commands", "15 Skills" — count the actual files in `templates/agents/` (universal + optional) and `templates/commands/` and `templates/skills/` to verify.

2. **docs/guide/introduction.md** — verify all claims match current reality. Check version references.

3. **docs/guide/getting-started.md** — verify the init flow description matches current `src/commands/init.js` behavior. Check that project types, tech stacks, and agent categories listed match what the code actually offers.

4. **docs/guide/workflow-tips.md** — verify command names and usage patterns are current.

5. **docs/guide/claude-code-integration.md** — verify frontmatter field names and examples match what templates actually generate. Cross-reference with `templates/agents/`, `templates/skills/`, `templates/settings/`.

6. **docs/guide/upgrading.md** — verify upgrade path descriptions are current for v2.2.x.

7. **docs/reference/commands.md** — verify all CLI commands listed match `src/commands/`. Check `worclaude doctor` is documented.

8. **docs/reference/agents.md** — verify agent list matches `templates/agents/universal/` and `templates/agents/optional/`. Check frontmatter field descriptions are accurate.

9. **docs/reference/skills.md** — verify skill list matches `templates/skills/`. Check conditional vs always-loaded classification.

10. **docs/reference/slash-commands.md** — verify all slash commands listed match `templates/commands/`. Check each command's description against its actual template content.

11. **docs/reference/hooks.md** — verify hook descriptions match `templates/settings/hooks.json` (or wherever hooks are configured).

12. **docs/reference/permissions.md** — verify permission presets match `templates/settings/`.

13. **docs/reference/configuration.md** — verify settings descriptions are current.

14. **docs/reference/claude-md.md** — verify CLAUDE.md template description matches `templates/core/`.

For each page: if counts, names, or descriptions are wrong, fix them. If a feature was added or removed since the docs were written, update accordingly.

## Part 4: Version bump

Update `package.json` version to `2.2.6`.

## Rules

- Do NOT change the structure/layout of the VitePress site beyond removing the demo
- Do NOT add new pages — only update existing ones
- Every count or claim in the docs must be verified against actual source files before writing
- Remove the `docs/reference/claude-code-workflow-system.docx` file — binary docs don't belong in a VitePress site

## Validation

```bash
npm test && npm run lint
npm run docs:build
```

Both must pass. The docs:build will catch broken links from the demo removal.

## PR

Target `develop`. Title: `docs: documentation overhaul for v2.2.6`
