# Phase 1: Critical Fixes — Skills Format + Agent Description

**Items:** #1, #2
**Branch:** `feat/v2-phase-1-critical-fixes`
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-1-critical-fixes

/start                          # Load context, read this prompt
Plan                            # Design the approach from tasks below
/review-plan                    # Send plan to plan-reviewer
Execute                         # Implement Task A + Task B
/refactor-clean                 # Clean up changed code
/verify                         # npm test && npm run lint
/commit-push-pr                 # PR to develop
```

---

## Why This Phase Matters

Two critical bugs make Worclaude's scaffolded skills and agents invisible to Claude Code's runtime:

1. **Skills** are scaffolded as flat `.md` files (e.g., `.claude/skills/testing.md`).
   Claude Code's skill loader (`loadSkillsFromSkillsDir()`) only accepts directory format.
   Flat `.md` files are silently ignored — the loader does:

   ```typescript
   if (!entry.isDirectory() && !entry.isSymbolicLink()) {
     return null; // Single .md files are NOT supported in /skills/ directory
   }
   ```

   Only the legacy `/commands/` loader supports flat files.

2. **Agents** are scaffolded without the required `description` frontmatter field.
   Claude Code's agent parser (`parseAgentFromMarkdown()`) requires both `name` AND `description`:
   ```typescript
   if (!whenToUse || typeof whenToUse !== 'string') {
     logForDebugging(`Agent file ${filePath} is missing required 'description' in frontmatter`);
     return null;
   }
   ```
   Without `description`, agents return null and `/agents` shows "No agents found."

**Verified:** `/skills` shows 0 skill files. `/agents` shows "No agents found." Only commands work (16 from `.claude/commands/`).

---

## Task A: Migrate Skills to Directory Format

### Required output format change

```
Before: .claude/skills/testing.md
After:  .claude/skills/testing/SKILL.md

Before: .claude/skills/agent-routing.md
After:  .claude/skills/agent-routing/SKILL.md
```

Template source paths in `templates/` do NOT change. Only the output destination paths change.

### Files to modify

#### 1. `src/commands/init.js` — Scenario A (fresh scaffolding)

**Lines 410-417** — Universal skills loop:

```javascript
// BEFORE:
for (const skill of UNIVERSAL_SKILLS) {
  await scaffoldFile(
    `skills/universal/${skill}.md`,
    path.join('.claude', 'skills', `${skill}.md`),
    {},
    projectRoot
  );
}

// AFTER:
for (const skill of UNIVERSAL_SKILLS) {
  await scaffoldFile(
    `skills/universal/${skill}.md`,
    path.join('.claude', 'skills', skill, 'SKILL.md'),
    {},
    projectRoot
  );
}
```

**Lines 420-427** — Template skills loop: same change.

```javascript
// BEFORE:
path.join('.claude', 'skills', `${skill}.md`),
// AFTER:
path.join('.claude', 'skills', skill, 'SKILL.md'),
```

**Lines 430-434** — Agent routing skill:

```javascript
// BEFORE:
await writeFile(
  path.join(projectRoot, '.claude', 'skills', 'agent-routing.md'),
  agentRoutingContent
);

// AFTER:
const agentRoutingDir = path.join(projectRoot, '.claude', 'skills', 'agent-routing');
await fs.ensureDir(agentRoutingDir);
await writeFile(path.join(agentRoutingDir, 'SKILL.md'), agentRoutingContent);
```

**Line 335** — Display text for CLAUDE.md template variable:

```javascript
// BEFORE:
const skillsLines = TEMPLATE_SKILLS.map((s) => `- ${s}.md — Run /setup to fill automatically`);
// AFTER:
const skillsLines = TEMPLATE_SKILLS.map(
  (s) => `- ${s}/SKILL.md — Run /setup to fill automatically`
);
```

#### 2. `src/core/merger.js` — Scenario B (existing project merge)

**Lines 101-129** — Skill merge loop. Change destination from flat file to directory format:

The key changes:

- `filename` should become the directory name, not `${skill.name}.md`
- Destination path: `path.join('.claude', 'skills', skill.name, 'SKILL.md')`
- Existence check: check if the skill directory OR the old flat file exists (backward compat)
- Conflict file: `path.join('.claude', 'skills', skill.name, 'SKILL.workflow-ref.md')`

For detecting existing skills (line 117), check BOTH formats:

```javascript
const existsAsDir = existingScan.existingSkillDirs.includes(skill.name);
const existsAsFlat = existingScan.existingSkills.includes(`${skill.name}.md`);
if (existsAsDir || existsAsFlat) {
  // conflict handling
}
```

**Lines 133-146** — Agent routing: same pattern, write to `agent-routing/SKILL.md`.

#### 3. `src/core/detector.js` — Scenario B detection

**Line 37** — `existingSkills` currently uses `listFiles()` which only returns flat files.
Add detection for both formats:

```javascript
// Current:
existingSkills: await listFiles(path.join(projectRoot, '.claude', 'skills')),

// Replace with both:
existingSkills: await listFiles(path.join(projectRoot, '.claude', 'skills')),
existingSkillDirs: await listSkillDirs(path.join(projectRoot, '.claude', 'skills')),
```

Add a `listSkillDirs` utility to `src/utils/file.js`:

```javascript
export async function listSkillDirs(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const valid = [];
    for (const dir of dirs) {
      const skillFile = path.join(dirPath, dir, 'SKILL.md');
      if (await fileExists(skillFile)) {
        valid.push(dir);
      }
    }
    return valid;
  } catch {
    return [];
  }
}
```

#### 4. `src/core/file-categorizer.js` — Hash map keys

**Lines 44-49** — Universal skills:

```javascript
// BEFORE:
const key = `skills/${name}.md`;
// AFTER:
const key = `skills/${name}/SKILL.md`;
```

**Lines 52-58** — Template skills: same change.

#### 5. `src/commands/doctor.js` — Health checks

**Lines 155-169** — Skill existence check:

```javascript
// BEFORE:
const skillPath = path.join(skillsDir, `${skill}.md`);
// AFTER:
const skillPath = path.join(skillsDir, skill, 'SKILL.md');
```

Update display text on line 169:

```javascript
// BEFORE:
return missing.map((s) => result(WARN, `skills/${s}.md`, 'Missing skill'));
// AFTER:
return missing.map((s) => result(WARN, `skills/${s}/SKILL.md`, 'Missing skill'));
```

#### 6. Tests

Find and update all test assertions that reference the old `skills/${name}.md` path format.

Search across all test files for:

- `skills/` path references
- `\.md` skill file assertions
- Mock filesystem setups with flat skill files
- Scaffolder output assertions

Key test files to check:

- `tests/core/file-categorizer.test.js`
- `tests/commands/doctor.test.js`
- `tests/core/merger.test.js`
- `tests/commands/init.test.js` (if it exists)
- Any test that creates or asserts on skill file paths

---

## Task B: Add `description` to All Agent Templates

Every agent template needs a `description` field in its YAML frontmatter. This is the field Claude Code uses for agent routing — without it, the agent is silently dropped.

### Universal agents — `templates/agents/universal/`

**plan-reviewer.md:**

```yaml
---
name: plan-reviewer
description: 'Reviews implementation plans for specificity, gaps, and executability'
model: opus
isolation: none
---
```

**code-simplifier.md:**

```yaml
---
name: code-simplifier
description: 'Reviews changed code and simplifies overly complex implementations'
model: sonnet
isolation: worktree
---
```

**test-writer.md:**

```yaml
---
name: test-writer
description: 'Writes comprehensive, meaningful tests for recently changed code'
model: sonnet
isolation: worktree
---
```

**build-validator.md:**

```yaml
---
name: build-validator
description: 'Validates that the project builds and all tests pass'
model: sonnet
isolation: worktree
---
```

**verify-app.md:**

```yaml
---
name: verify-app
description: 'Verifies the running application end-to-end — tests actual behavior, not just code reading'
model: sonnet
isolation: worktree
---
```

### Optional agents — `templates/agents/optional/`

**frontend/ui-reviewer.md:** Add `description: "Reviews UI for consistency and accessibility"`
**frontend/style-enforcer.md:** Add `description: "Ensures design system compliance"`
**backend/api-designer.md:** Add `description: "Reviews API design for RESTful conventions"`
**backend/database-analyst.md:** Add `description: "Reviews database schemas and queries"`
**backend/auth-auditor.md:** Add `description: "Audits authentication and authorization"`
**quality/security-reviewer.md:** Add `description: "Reviews code for security vulnerabilities"`
**quality/performance-auditor.md:** Add `description: "Analyzes code for performance issues"`
**quality/bug-fixer.md:** Add `description: "Diagnoses and fixes bugs"`
**quality/refactorer.md:** Add `description: "Refactors code to improve maintainability"`
**quality/build-fixer.md:** Add `description: "Diagnoses and fixes build failures"`
**quality/e2e-runner.md:** Add `description: "Writes and runs end-to-end tests"`
**devops/dependency-manager.md:** Add `description: "Reviews dependency health and updates"`
**devops/ci-fixer.md:** Add `description: "Diagnoses and fixes CI/CD failures"`
**devops/docker-helper.md:** Add `description: "Reviews Docker configs for best practices"`
**devops/deploy-validator.md:** Add `description: "Validates deployment readiness"`
**docs/doc-writer.md:** Add `description: "Writes and updates documentation"`
**docs/changelog-generator.md:** Add `description: "Generates changelog from commits"`
**data/data-pipeline-reviewer.md:** Add `description: "Reviews data pipeline correctness"`
**data/ml-experiment-tracker.md:** Add `description: "Reviews ML experiment reproducibility"`
**data/prompt-engineer.md:** Add `description: "Reviews and improves LLM prompts"`

In each case, add the `description` line immediately after the `name` line in the existing YAML frontmatter block. Do not modify any other frontmatter fields or the markdown body.

---

## Verification Checklist

After completing both tasks:

### Automated

```bash
npm test        # All tests must pass (update assertions for new paths)
npm run lint    # Must pass
```

### Manual — Scenario A

```bash
rm -rf /tmp/test-phase1 && mkdir /tmp/test-phase1 && cd /tmp/test-phase1 && git init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
# Select any project type, pick some agents
```

Then verify:

- [ ] `.claude/skills/testing/SKILL.md` exists (NOT `.claude/skills/testing.md`)
- [ ] `.claude/skills/context-management/SKILL.md` exists
- [ ] `.claude/skills/agent-routing/SKILL.md` exists
- [ ] All 13 skill directories created with SKILL.md inside
- [ ] All agent files in `.claude/agents/` have `description` in frontmatter
- [ ] No flat `.md` files remain in `.claude/skills/` (only directories)
- [ ] `workflow-meta.json` fileHashes keys use new paths (`skills/testing/SKILL.md`)

### Manual — Claude Code Integration

In the scaffolded test project, start Claude Code and run:

- [ ] `/skills` — should show skills from `.claude/skills/` (not just commands)
- [ ] `/agents` — should show scaffolded agents (not "No agents found")

---

## Do NOT Change in This Phase

- Template file content (no `when_to_use`, `paths`, `disallowedTools` — those are Phases 2-3)
- `src/commands/upgrade.js` (migration is Phase 5)
- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files — updated via /sync after merge)
- No version bump yet (happens after all phases via /sync on develop)
