# Phase 8: Documentation Update & Deployment

**Items:** #22
**Branch:** `feat/v2-phase-8-docs-deploy`
**Depends on:** Phases 1–7 ALL merged
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-8-docs-deploy

/start
Plan
/review-plan
Execute
/refactor-clean
/verify                         # npm run docs:build must pass
/commit-push-pr                 # PR to develop
```

After merge:

```
git checkout develop && git pull
/sync                           # Update PROGRESS.md, SPEC.md, version → v2.0.0
```

Then merge develop → main and publish:

```
git checkout main && git merge develop && git push
npm publish
git checkout develop && git merge main && git push
```

**This is the final phase.** `/sync` and version bump happen HERE.

---

## Pages to Update

### 1. `docs/index.md` — Landing page

Add a new feature card for v2.0.0:

**Title:** "Claude Code Runtime Integration"
**Description:** Skills and agents now register with Claude Code's runtime systems. Skills support conditional activation via file path patterns. Agents support tool restrictions, background execution, and persistent memory.

Update any existing feature cards that reference skill/agent counts to match current numbers.

### 2. `docs/guide/getting-started.md` — Getting started

Add verification steps after `worclaude init`:

- Run `/skills` in Claude Code to verify skills loaded
- Run `/agents` in Claude Code to verify agents loaded
- Mention `worclaude doctor` as a health check

Add a note about the optional MEMORY.md template.

### 3. `docs/guide/upgrading.md` — Upgrading

Add a new section: **"Upgrading from v1.x to v2.0.0"**

Content:

- What changed: skill format (flat → directory), agent frontmatter (`description` required)
- What `worclaude upgrade` does automatically: migrates skills, patches agents
- How to verify: run `/skills` and `/agents` in Claude Code
- How to check health: run `worclaude doctor`

### 4. `docs/guide/workflow-tips.md` — Workflow tips

Add three new sections:

**Conditional Skills:**

- What they are (skills that load only when matching files are touched)
- How `paths` frontmatter works
- Which Worclaude skills are conditional vs always-loaded
- How to make your own skills conditional

**Coordinator Mode:**

- When to use multi-agent coordination
- Worker prompt best practices
- Continue vs spawn decision framework
- Link to the coordinator-mode skill

**Memory System:**

- What MEMORY.md is (optional index file)
- Four memory types: user, feedback, project, reference
- What NOT to store
- How agents with `memory: project` learn across sessions

### 5. `docs/guide/existing-projects.md` — Existing projects

Update merge behavior description:

- Skills now scaffolded in directory format
- Backward compatibility: detects both flat files and directories
- Conflict handling: `.workflow-ref.md` files go inside skill directories

### 6. `docs/reference/skills.md` — Skills reference

Major update:

- Explain the directory format requirement (`skill-name/SKILL.md`)
- Document all frontmatter fields: `description`, `when_to_use`, `paths`
- List which skills are conditional vs always-loaded with their path patterns
- Note that flat `.md` files in `/skills/` are silently ignored by Claude Code
- Add coordinator-mode to the skill list

### 7. `docs/reference/agents.md` — Agents reference

Major update:

- Document all frontmatter fields: `name`, `description` (required), `model`, `isolation`, `disallowedTools`, `background`, `maxTurns`, `omitClaudeMd`, `memory`
- Note that `description` is required — without it, agents are invisible
- Update the agent catalog table with new fields per agent
- Document which agents are read-only (have `disallowedTools`)
- Document which agents run in background
- Document which agents have persistent memory

### 8. `docs/reference/configuration.md` — Configuration

Add:

- MEMORY.md reference (optional, experimental)
- Updated permission presets per tech stack
- Note about `.gitignore` entries (all 5 entries)

### 9. `docs/reference/slash-commands.md` — Slash commands

Update command descriptions to match the new `description` frontmatter added in Phase 2.

### 10. `docs/reference/commands.md` — CLI commands

Update:

- `worclaude doctor` — document the 3 new checks (CLAUDE.md size, skill format, agent description)
- `worclaude upgrade` — document the v2.0.0 migration behavior (skill format migration, agent patching)
- `worclaude init` — mention the optional MEMORY.md prompt

### 11. `docs/reference/hooks.md` — Hooks reference

No changes expected unless Phase 6 modified hook behavior.

---

## New Page

### `docs/guide/claude-code-integration.md` — Claude Code Integration

A new guide page explaining HOW Worclaude integrates with Claude Code's runtime systems. This is the "why" behind v2.0.0.

**Outline:**

1. **How Claude Code Loads Skills**
   - Directory format: `skill-name/SKILL.md`
   - Frontmatter fields: `description`, `when_to_use`, `paths`
   - Loading hierarchy: managed → user → project → additional dirs → legacy commands
   - Flat `.md` files in `/skills/` are silently ignored

2. **How Claude Code Loads Agents**
   - Markdown files in `.claude/agents/`
   - Required frontmatter: `name` + `description`
   - Optional fields: `disallowedTools`, `background`, `maxTurns`, `omitClaudeMd`, `memory`, `isolation`
   - Without `description`, agents return null (invisible)

3. **Conditional Skill Activation**
   - How `paths` frontmatter works (gitignore-style patterns)
   - Why conditional activation matters (context window budget)
   - Which Worclaude skills are conditional vs always-loaded
   - How to add your own conditional skills

4. **Agent Tool Restrictions**
   - How `disallowedTools` prevents read-only agents from writing
   - Why prompt instructions alone aren't sufficient
   - Which Worclaude agents have tool restrictions

5. **Background Agents**
   - How `background: true` enables async execution
   - Which Worclaude agents run in background
   - When to use background vs foreground agents

6. **Memory System**
   - MEMORY.md as an index (not storage)
   - Four memory types
   - Per-agent `memory` scope
   - The 200-line / 25KB limit

7. **Verifying Integration**
   - `/skills` — check skills are registered
   - `/agents` — check agents are registered
   - `worclaude doctor` — check for format/frontmatter issues

### VitePress config

Add the new page to `docs/.vitepress/config.mjs` sidebar:

```javascript
// In the Guide section:
{ text: 'Claude Code Integration', link: '/guide/claude-code-integration' }
```

---

## Verification Checklist

### Build

```bash
npm run docs:build    # Must pass — this is the primary check for this phase
npm run docs:dev      # Verify locally — check each updated page
npm test              # Still passes
npm run lint          # Still passes
```

### Content review

- [ ] All updated pages render correctly in VitePress dev server
- [ ] New "Claude Code Integration" page is accessible from sidebar
- [ ] Feature cards on landing page look correct
- [ ] Agent reference table has all new frontmatter fields
- [ ] Skills reference explains directory format clearly
- [ ] Upgrade guide covers v1.x → v2.0.0 migration
- [ ] No broken internal links
- [ ] No references to old skill format (`skills/testing.md`) in docs

### Post-merge

- [ ] `/sync` run on develop — PROGRESS.md, SPEC.md, version updated to v2.0.0
- [ ] Merge develop → main
- [ ] `npm publish` from main
- [ ] GitHub Pages auto-deploys via GitHub Actions
- [ ] Live site at `sefaertunc.github.io/Worclaude` shows updated docs

---

## Do NOT Change in This Phase

- Source code (`init.js`, `doctor.js`, etc.) — unless a doc-related bug is found
- Template files — unless a doc references incorrect template content
- Test files — unless a test needs to be fixed for docs build
