# Manual Testing Checklist: v1.8.0 → v1.9.0 → v2.0.0

Use this file to manually verify the complete Worclaude experience after all v2.0.0 phases are merged. This covers changes across three release milestones.

---

## Setup

```bash
# Clean test directory
rm -rf ~/SEFA/tmp/test-manual && mkdir -p ~/SEFA/tmp/test-manual && cd ~/SEFA/tmp/test-manual && git init

# Run init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
# Select: Full-stack web application
# Stacks: Node.js + Python
# Agents: select all
# MEMORY.md: Yes
```

---

## v1.8.0 Changes (Agent Enrichment & New Commands)

### Agents
- [ ] `build-fixer` agent present in `.claude/agents/` when quality category selected
- [ ] `e2e-runner` agent present in `.claude/agents/` when quality category selected
- [ ] All 5 universal agent templates have structured guidance sections (not just basic prompts)
- [ ] Agent routing includes `build-fixer` and `e2e-runner` in relevant categories

### Commands
- [ ] `/build-fix` command exists in `.claude/commands/`
- [ ] `/refactor-clean` command exists in `.claude/commands/`
- [ ] `/test-coverage` command exists in `.claude/commands/`
- [ ] All 3 new commands appear in `/skills` output in Claude Code

### Skills
- [ ] `security-checklist` skill present (OWASP-based reference)

### Counts
- [ ] 25 total agents (5 universal + 20 optional)
- [ ] 16 commands in `.claude/commands/`
- [ ] 11+ skills in `.claude/skills/` (10 universal + templates + agent-routing + coordinator-mode)

---

## v1.9.0 Changes (Session Persistence & Hooks)

### SessionStart Hook
- [ ] Open Claude Code in the test project
- [ ] Verify that CLAUDE.md content is in context (ask "what project is this?")
- [ ] Verify that PROGRESS.md content is in context (ask "what's the project status?")
- [ ] Verify current branch is shown

### PostCompact Hook
- [ ] Run `/compact` in Claude Code
- [ ] Verify CLAUDE.md is re-injected after compaction (ask "what project is this?" again)

### Session Summaries
- [ ] Run `/commit-push-pr` (or `/end`) after making a small change
- [ ] Verify a session summary file was written to `.claude/sessions/`
- [ ] Start a new Claude Code session
- [ ] Verify the previous session summary is loaded by SessionStart hook

### Drift Detection
- [ ] Create a previous session file: `echo "# test" > .claude/sessions/2026-04-01-test.md`
- [ ] Make some commits
- [ ] Run `/start`
- [ ] Verify drift detection shows commit count and one-liners

### Doctor
- [ ] Run `worclaude doctor`
- [ ] Verify 4 categories: core files, components, docs, integrity
- [ ] All checks show PASS on a clean project

### Hook Profiles
- [ ] `WORCLAUDE_HOOK_PROFILE=minimal claude` — only SessionStart and PostCompact fire
- [ ] `WORCLAUDE_HOOK_PROFILE=standard claude` — all hooks fire (default)
- [ ] `WORCLAUDE_HOOK_PROFILE=strict claude` — TypeScript checking hook fires on file edits (if applicable)

### Sessions Directory
- [ ] `.claude/sessions/` directory created during init
- [ ] `.gitignore` includes `.claude/sessions/`

---

## v2.0.0 Changes (Claude Code Runtime Integration)

### Skills — Format Fix (Phase 1)
- [ ] All skills are directories: `.claude/skills/testing/SKILL.md` (NOT `.claude/skills/testing.md`)
- [ ] No flat `.md` files in `.claude/skills/` (only directories)
- [ ] `agent-routing/SKILL.md` exists in directory format
- [ ] `/skills` in Claude Code shows skills from `.claude/skills/` (not just commands)

### Skills — Frontmatter (Phase 2)
- [ ] Every `SKILL.md` has both `description` AND `when_to_use` in frontmatter
- [ ] 6 conditional skills have `paths`: testing, verification, security-checklist, backend-conventions, frontend-design-system, project-patterns
- [ ] 7+ always-loaded skills do NOT have `paths`: context-management, git-conventions, planning-with-files, review-and-handoff, prompt-engineering, claude-md-maintenance, subagent-usage
- [ ] Conditional skill test: edit a test file, then check if `testing` skill appears in `/skills`

### Commands — Frontmatter (Phase 2)
- [ ] Every `.claude/commands/*.md` file has `description` frontmatter
- [ ] Command body content is unchanged (only frontmatter was added above it)
- [ ] All commands still work: `/start`, `/verify`, `/commit-push-pr`

### Agents — Description (Phase 1)
- [ ] Every agent in `.claude/agents/` has `description` in frontmatter
- [ ] `/agents` in Claude Code shows all scaffolded agents (NOT "No agents found")

### Agents — Enrichment (Phase 3)
- [ ] Read-only agents have `disallowedTools` (check `plan-reviewer`, `security-reviewer`)
- [ ] Async agents have `background: true` (check `verify-app`, `build-validator`, `e2e-runner`)
- [ ] Every agent has `maxTurns`
- [ ] Read-only agents have `omitClaudeMd: true` (check `plan-reviewer`, `changelog-generator`)
- [ ] Select agents have `memory: project` (check `test-writer`, `security-reviewer`, `doc-writer`)
- [ ] Test: ask `plan-reviewer` to edit a file — should refuse (tools blocked)
- [ ] Test: trigger `verify-app` — should run as background task

### Doctor — New Checks (Phase 4)
- [ ] `worclaude doctor` reports CLAUDE.md size vs 40K limit
- [ ] Create a flat skill to test: `echo "# bad" > .claude/skills/broken.md`
- [ ] `worclaude doctor` shows FAIL for flat `.md` skill file
- [ ] Create agent without description: `echo -e "---\nname: broken\n---\nBad" > .claude/agents/broken.md`
- [ ] `worclaude doctor` shows FAIL for missing agent description
- [ ] Clean up test files, run doctor again — all PASS

### Upgrade — Migration (Phase 5)
```bash
# Create a v1.9.0-style project to test upgrade
rm -rf ~/SEFA/tmp/test-upgrade && mkdir -p ~/SEFA/tmp/test-upgrade && cd ~/SEFA/tmp/test-upgrade && git init
mkdir -p .claude/skills .claude/agents .claude/commands .claude/sessions docs/spec
echo '{"version":"1.9.0","projectTypes":["CLI tool"],"techStack":["node"],"fileHashes":{"skills/testing.md":"abc"}}' > .claude/workflow-meta.json
echo -e "---\ndescription: test\n---\n# Testing" > .claude/skills/testing.md
echo -e "---\nname: verify-app\nmodel: sonnet\n---\nVerify" > .claude/agents/verify-app.md
echo "# start" > .claude/commands/start.md
echo "# CLAUDE" > CLAUDE.md
node ~/SEFA/GIT/Claude-Workflow/src/index.js upgrade
```
- [ ] Backup created before migration
- [ ] Flat skills migrated to directory format
- [ ] Agent frontmatter patched with `description`
- [ ] `workflow-meta.json` hash keys updated
- [ ] Post-upgrade: `/skills` shows migrated skills
- [ ] Post-upgrade: `/agents` shows patched agents
- [ ] Post-upgrade: `worclaude doctor` passes

### New Content (Phase 6)
- [ ] `MEMORY.md` template offered during init (optional prompt, defaults to No)
- [ ] When accepted: `MEMORY.md` exists with four-type taxonomy
- [ ] `coordinator-mode/SKILL.md` scaffolded in universal skills
- [ ] `verify-app` agent has structured VERDICT output, anti-rationalization section, type-specific strategies
- [ ] `/end` command mentions worktree safety (check for uncommitted changes)
- [ ] Python stack settings include `Bash(pytest:*)`, `Bash(pip:*)`, etc.
- [ ] Node stack settings include `Bash(npm test:*)`, `Bash(npm run:*)` (already in base)

### Gitignore (Phase 7)
- [ ] `.gitignore` has all 5 entries: sessions/, settings.local.json, workflow-meta.json, worktrees/, .claude-backup-*/
- [ ] Old blanket `.claude/` entry is removed if present (migration logic)

### Documentation (Phase 8)
- [ ] `npm run docs:build` passes
- [ ] New "Claude Code Integration" page exists in sidebar
- [ ] Skills reference documents directory format requirement
- [ ] Agents reference documents all new frontmatter fields
- [ ] Upgrade guide covers v1.x → v2.0.0 migration
- [ ] Landing page has "Claude Code Runtime Integration" feature card

---

## Final Cross-Cutting Checks

- [ ] `npm test` — all tests pass
- [ ] `npm run lint` — passes
- [ ] `npm run docs:build` — passes
- [ ] `worclaude status` — shows correct counts for skills, agents, commands
- [ ] `worclaude backup` + `worclaude restore` — works with directory-format skills
- [ ] `worclaude diff` — shows `skills/testing/SKILL.md` format (not `skills/testing.md`)
- [ ] `worclaude delete` — correctly removes directory-format skills
- [ ] No references to old skill format in source: `grep -r "skills/.*\.md" src/` returns nothing unexpected
- [ ] Template counts match `agents.js` constants

---

## Sign-Off

| Area | Status | Notes |
|---|---|---|
| Skills format | ☐ | |
| Skills frontmatter | ☐ | |
| Agents description | ☐ | |
| Agents enrichment | ☐ | |
| Commands frontmatter | ☐ | |
| Doctor checks | ☐ | |
| Upgrade migration | ☐ | |
| New content | ☐ | |
| Gitignore | ☐ | |
| Documentation | ☐ | |
| Tests pass | ☐ | |
| Lint passes | ☐ | |
| Docs build | ☐ | |

**Version:** v2.0.0
**Date:** ___________
**Tested by:** ___________
