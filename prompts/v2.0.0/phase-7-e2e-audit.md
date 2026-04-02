# Phase 7: E2E Audit

**Items:** #21 + deferred fixes from orchestrator
**Branch:** `feat/v2-phase-7-e2e-audit`
**Depends on:** Phases 1–6 ALL merged
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context — check "Deferred Fixes" section.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-7-e2e-audit

/start
Plan
/review-plan
Execute
/refactor-clean
/verify
/commit-push-pr
```

---

## Purpose

This phase is an end-to-end audit. No new features — only verification, fixes for issues discovered during testing, and deferred small fixes.

The goal: every path through Worclaude (init fresh, init existing, upgrade, doctor, status, delete, backup, restore, diff) produces correct output with all v2.0.0 changes in place.

---

## Part 1: Deferred Fixes

### Fix: `updateGitignore()` entries

**File:** `src/core/scaffolder.js`

The `entries` array in `updateGitignore()` is missing two entries. Update:

```javascript
// BEFORE:
const entries = ['.claude/sessions/', '.claude/workflow-meta.json', '.claude-backup-*/'];

// AFTER:
const entries = [
  '.claude/sessions/',
  '.claude/settings.local.json',
  '.claude/workflow-meta.json',
  '.claude/worktrees/',
  '.claude-backup-*/',
];
```

This ensures user projects ignore local settings overrides and ephemeral worktree directories.

Add a test that verifies all 5 entries are written to `.gitignore`.

### Fix: Any issues discovered during Phases 1–6

If any phase introduced bugs or edge cases that were deferred to "fix in Phase 7," address them here. Check PR comments and any TODO notes from earlier phases.

---

## Part 2: Scenario A — Fresh Project

```bash
rm -rf /tmp/test-e2e-fresh && mkdir /tmp/test-e2e-fresh && cd /tmp/test-e2e-fresh && git init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
```

Select: "Full-stack web application", Node.js + Python, pick all agents, opt into MEMORY.md.

### Checklist

**Skills (Phase 1 + 2):**
- [ ] All skills are in directory format: `.claude/skills/testing/SKILL.md` (NOT flat `.md`)
- [ ] No flat `.md` files in `.claude/skills/` (only directories)
- [ ] Every `SKILL.md` has `description` AND `when_to_use` in frontmatter
- [ ] 6 conditional skills have `paths` frontmatter (testing, verification, security-checklist, backend-conventions, frontend-design-system, project-patterns)
- [ ] 7+ always-loaded skills do NOT have `paths` (context-management, git-conventions, etc.)
- [ ] `coordinator-mode` skill is present (Phase 6)
- [ ] `agent-routing/SKILL.md` exists and is generated correctly

**Agents (Phase 1 + 3):**
- [ ] Every agent has `name` AND `description` in frontmatter
- [ ] Read-only agents (plan-reviewer, security-reviewer, etc.) have `disallowedTools`
- [ ] Async agents (verify-app, build-validator, e2e-runner) have `background: true`
- [ ] All agents have `maxTurns`
- [ ] Read-only agents (plan-reviewer, security-reviewer, performance-auditor, changelog-generator) have `omitClaudeMd: true`
- [ ] test-writer, security-reviewer, doc-writer have `memory: project`
- [ ] verify-app has enhanced body with VERDICT format and anti-rationalization (Phase 6)

**Commands (Phase 2):**
- [ ] Every command in `.claude/commands/` has `description` frontmatter
- [ ] Command body content is unchanged (only frontmatter added)

**Settings (Phase 6):**
- [ ] Settings include Python-specific permissions (pytest, pip, etc.)
- [ ] Settings include Node-specific permissions (already in base)
- [ ] Permissions from both selected stacks are merged correctly

**Core files:**
- [ ] `CLAUDE.md` exists and references skills
- [ ] `MEMORY.md` exists (opted in)
- [ ] `.mcp.json` exists
- [ ] `workflow-meta.json` has correct version and hash keys using `skills/name/SKILL.md` format
- [ ] `.gitignore` has all 5 entries (sessions, settings.local.json, workflow-meta, worktrees, backup)
- [ ] `docs/spec/PROGRESS.md` and `docs/spec/SPEC.md` exist

**Doctor:**
- [ ] `worclaude doctor` shows all PASS

**Claude Code integration:**
- [ ] `/skills` shows skills from `.claude/skills/` directories
- [ ] `/agents` shows all scaffolded agents (not "No agents found")
- [ ] Conditional skills only appear after touching matching files

---

## Part 3: Scenario B — Existing Project

```bash
rm -rf /tmp/test-e2e-existing && mkdir /tmp/test-e2e-existing && cd /tmp/test-e2e-existing && git init

# Create pre-existing content
mkdir -p .claude/skills .claude/agents
echo "# My CLAUDE" > CLAUDE.md
echo -e "---\ndescription: my custom skill\n---\n# Custom" > .claude/skills/my-custom.md
echo -e "---\nname: my-agent\ndescription: custom agent\n---\nDo stuff" > .claude/agents/my-agent.md

node ~/SEFA/GIT/Claude-Workflow/src/index.js init
```

### Checklist

- [ ] Existing `CLAUDE.md` is not overwritten (suggestions file created instead)
- [ ] Existing custom skill `.claude/skills/my-custom.md` is preserved (not deleted, not moved)
- [ ] Existing custom agent `.claude/agents/my-agent.md` is preserved
- [ ] New skills are added in directory format alongside existing flat file
- [ ] New agents have `description` frontmatter
- [ ] Conflict files (`.workflow-ref.md`) created for clashing names
- [ ] `worclaude doctor` warns about the flat custom skill file

---

## Part 4: Scenario C — Upgrade from v1.9.0

```bash
# First create a v1.9.0-style project (flat skills, agents without description)
rm -rf /tmp/test-e2e-upgrade && mkdir /tmp/test-e2e-upgrade && cd /tmp/test-e2e-upgrade && git init

# Simulate v1.9.0 output:
mkdir -p .claude/skills .claude/agents .claude/commands .claude/sessions docs/spec
echo '{"version":"1.9.0","projectTypes":["CLI tool"],"techStack":["node"],"fileHashes":{"skills/testing.md":"abc123"}}' > .claude/workflow-meta.json
echo "---\ndescription: test\n---\n# Testing" > .claude/skills/testing.md
echo "---\nname: verify-app\nmodel: sonnet\n---\nVerify" > .claude/agents/verify-app.md
echo "# start" > .claude/commands/start.md
echo "# CLAUDE" > CLAUDE.md

node ~/SEFA/GIT/Claude-Workflow/src/index.js upgrade
```

### Checklist

- [ ] Backup created before migration
- [ ] Flat skills migrated: `.claude/skills/testing.md` → `.claude/skills/testing/SKILL.md`
- [ ] Agent frontmatter patched: `verify-app.md` now has `description`
- [ ] `workflow-meta.json` hash keys updated to `skills/testing/SKILL.md` format
- [ ] Version in workflow-meta updated
- [ ] New template files added (commands, agents, skills from newer versions)
- [ ] `/skills` in Claude Code shows migrated skills
- [ ] `/agents` in Claude Code shows patched agents
- [ ] `worclaude doctor` passes all checks post-upgrade

---

## Part 5: Other Commands

### `worclaude status`
```bash
cd /tmp/test-e2e-fresh
node ~/SEFA/GIT/Claude-Workflow/src/index.js status
```
- [ ] Shows correct version
- [ ] Shows correct skill count (including coordinator-mode)
- [ ] Shows correct agent count
- [ ] Shows correct command count

### `worclaude backup` + `worclaude restore`
```bash
cd /tmp/test-e2e-fresh
node ~/SEFA/GIT/Claude-Workflow/src/index.js backup
# Modify a file
echo "extra" >> .claude/skills/testing/SKILL.md
node ~/SEFA/GIT/Claude-Workflow/src/index.js restore
```
- [ ] Backup captures directory-format skills correctly
- [ ] Restore recreates directory-format skills correctly

### `worclaude diff`
```bash
cd /tmp/test-e2e-fresh
echo "extra" >> .claude/skills/testing/SKILL.md
node ~/SEFA/GIT/Claude-Workflow/src/index.js diff
```
- [ ] Shows `testing/SKILL.md` as modified (not `testing.md`)

### `worclaude delete`
```bash
cd /tmp/test-e2e-fresh
node ~/SEFA/GIT/Claude-Workflow/src/index.js delete
```
- [ ] Correctly identifies directory-format skills for deletion
- [ ] Doesn't leave orphaned empty skill directories

---

## Part 6: Cross-Cutting Checks

- [ ] `npm test` — all tests pass (full suite)
- [ ] `npm run lint` — passes
- [ ] `npm run docs:build` — docs build without errors
- [ ] Template file count matches constants in `agents.js` (UNIVERSAL_SKILLS, TEMPLATE_SKILLS, COMMAND_FILES, agent counts)
- [ ] No hardcoded old-format paths (`skills/testing.md`) remain in source code (`grep -r "skills/.*\.md" src/`)
- [ ] No stale references to old skill count numbers in templates or docs
- [ ] Hash computation in `config.js` picks up all new file paths

---

## Verification

This phase's output is fixes + confidence that everything works. Report:

| Scenario | Result | Issues Found |
|---|---|---|
| A (fresh) | PASS/FAIL | list |
| B (existing) | PASS/FAIL | list |
| C (upgrade) | PASS/FAIL | list |
| Status | PASS/FAIL | list |
| Backup/Restore | PASS/FAIL | list |
| Diff | PASS/FAIL | list |
| Delete | PASS/FAIL | list |
| Tests | PASS/FAIL | count |
| Lint | PASS/FAIL | list |
| Docs build | PASS/FAIL | list |

---

## Do NOT Change in This Phase

- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files — updated via /sync after all phases)
