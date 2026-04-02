# Phase 5: Upgrade Migration

**Items:** #14, #15
**Branch:** `feat/v2-phase-5-upgrade-migration`
**Depends on:** Phases 1–4 merged (needs correct formats, doctor can verify pre/post state)
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-5-upgrade-migration

/start
Plan
/review-plan
Execute
/refactor-clean
/verify
/commit-push-pr
```

---

## Background

Projects initialized with Worclaude v1.x have two structural problems:
1. Skills are flat `.md` files in `.claude/skills/` (invisible to Claude Code)
2. Agents lack the required `description` frontmatter (invisible to `/agents`)

`worclaude upgrade` must detect and fix both when upgrading from v1.x to v2.0.0.

**File to modify:** `src/commands/upgrade.js` (currently 261 lines)
**May also modify:** `src/core/file-categorizer.js`, `src/utils/file.js`

---

## Item 14: Skill Format Migration

During upgrade, detect flat `.md` files in `.claude/skills/` and migrate them to directory format.

### Detection

```javascript
// Find flat .md files in .claude/skills/ (old format)
const skillsDir = path.join(projectRoot, '.claude', 'skills');
const entries = await fs.readdir(skillsDir, { withFileTypes: true });
const flatSkills = entries
  .filter((e) => e.isFile() && e.name.endsWith('.md'))
  .map((e) => e.name);
```

### Migration Logic

For each flat skill file:
1. Extract the skill name: `testing.md` → `testing`
2. Create the directory: `.claude/skills/testing/`
3. Move the file: `.claude/skills/testing.md` → `.claude/skills/testing/SKILL.md`
4. Update `workflow-meta.json` hash key: `skills/testing.md` → `skills/testing/SKILL.md`

```javascript
for (const flatFile of flatSkills) {
  const skillName = flatFile.replace(/\.md$/, '');
  const oldPath = path.join(skillsDir, flatFile);
  const newDir = path.join(skillsDir, skillName);
  const newPath = path.join(newDir, 'SKILL.md');

  // Don't overwrite if directory format already exists
  if (await fs.pathExists(newDir)) {
    // Already migrated or user has a directory — skip
    continue;
  }

  await fs.ensureDir(newDir);
  await fs.move(oldPath, newPath);
}
```

### Merge Strategy

This is **additive tier** — safe to auto-apply because:
- The old flat format was never functional (skills were invisible)
- The migration preserves file content exactly (just moves the file)
- No user customization is lost

However, still report what was done:
```
Migrated 13 skills to directory format (skill-name/SKILL.md)
```

### Hash Key Migration

Also update `workflow-meta.json` fileHashes:
```javascript
const meta = await readWorkflowMeta(projectRoot);
if (meta && meta.fileHashes) {
  const newHashes = {};
  for (const [key, hash] of Object.entries(meta.fileHashes)) {
    if (key.startsWith('skills/') && !key.includes('/SKILL.md')) {
      // Old format: skills/testing.md → skills/testing/SKILL.md
      const skillName = key.replace('skills/', '').replace('.md', '');
      newHashes[`skills/${skillName}/SKILL.md`] = hash;
    } else {
      newHashes[key] = key;
    }
  }
  meta.fileHashes = newHashes;
  await writeWorkflowMeta(projectRoot, meta);
}
```

### Also handle `.workflow-ref.md` files

If there are `.workflow-ref.md` conflict files from previous upgrades:
- `testing.workflow-ref.md` → move to `testing/SKILL.workflow-ref.md`

---

## Item 15: Agent Frontmatter Patch

During upgrade, scan `.claude/agents/*.md` and add `description` to agents that are missing it.

### Detection

```javascript
const agentsDir = path.join(projectRoot, '.claude', 'agents');
const agentFiles = (await fs.readdir(agentsDir, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith('.md'))
  .map((e) => e.name);

const agentsMissingDescription = [];
for (const file of agentFiles) {
  const content = await readFile(path.join(agentsDir, file));
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) continue;

  const hasDescription = /^description:\s*.+/m.test(frontmatterMatch[1]);
  if (!hasDescription) {
    agentsMissingDescription.push(file);
  }
}
```

### Patching Logic

For agents missing `description`, look up the agent name in `AGENT_CATALOG` and inject the description.

```javascript
import { AGENT_CATALOG } from '../data/agents.js';

// Descriptions for universal agents (not in AGENT_CATALOG)
const UNIVERSAL_AGENT_DESCRIPTIONS = {
  'plan-reviewer': 'Reviews implementation plans for specificity, gaps, and executability',
  'code-simplifier': 'Reviews changed code and simplifies overly complex implementations',
  'test-writer': 'Writes comprehensive, meaningful tests for recently changed code',
  'build-validator': 'Validates that the project builds and all tests pass',
  'verify-app': 'Verifies the running application end-to-end — tests actual behavior, not just code reading',
};

function getAgentDescription(agentName) {
  // Check universal agents first
  if (UNIVERSAL_AGENT_DESCRIPTIONS[agentName]) {
    return UNIVERSAL_AGENT_DESCRIPTIONS[agentName];
  }
  // Check catalog
  if (AGENT_CATALOG[agentName]) {
    return AGENT_CATALOG[agentName].description;
  }
  return null;
}
```

For each agent missing description:
1. Parse frontmatter
2. Look up description from catalog
3. Insert `description` line after `name` line
4. Write updated file

```javascript
for (const file of agentsMissingDescription) {
  const filePath = path.join(agentsDir, file);
  const content = await readFile(filePath);
  const agentName = file.replace('.md', '');
  const description = getAgentDescription(agentName);

  if (!description) {
    // Unknown agent — user-created, skip
    continue;
  }

  // Insert description after name line
  const updated = content.replace(
    /^(name:\s*.+)$/m,
    `$1\ndescription: "${description}"`
  );

  await writeFile(filePath, updated);
}
```

### Merge Strategy

This is **interactive tier** for user-modified agents:
- If the agent file hash matches the original template hash in workflow-meta → auto-patch (user hasn't customized)
- If the agent file hash differs → prompt: "Agent {name} has been customized. Add missing `description` field? (y/n)"
- For unknown agents (user-created, not in catalog) → skip with info message

Report:
```
Patched 12 agents with description frontmatter (5 auto, 7 prompted)
Skipped 2 user-created agents (my-custom-agent, project-helper)
```

---

## Integration into Upgrade Flow

Add these migrations to the existing upgrade flow in `upgrade.js`. They should run:
1. After the backup step (so user can restore if anything goes wrong)
2. Before the normal file update/merge step
3. With a clear section header in the output:

```
Worclaude v2.0.0 Migrations
  ✓ Migrated 13 skills to directory format
  ✓ Patched 12 agents with description frontmatter
```

### Version-Gated Migrations

Only run these migrations when upgrading FROM a version before 2.0.0:

```javascript
const currentVersion = meta.version;
if (semverLt(currentVersion, '2.0.0')) {
  // Run v2.0.0 migrations
  await migrateSkillFormat(projectRoot);
  await patchAgentDescriptions(projectRoot);
}
```

This prevents re-running migrations on projects already at v2.0.0+.

---

## Tests

Add tests in `tests/commands/upgrade.test.js` (or create a new test file for migrations):

### Skill migration tests:
- Flat `.md` files are moved to `skill-name/SKILL.md` directory format
- Already-migrated skills (directory format) are not touched
- Mixed state (some flat, some directory) migrates only flat ones
- `.workflow-ref.md` conflict files are also migrated
- `workflow-meta.json` hash keys are updated
- Empty `.claude/skills/` doesn't error

### Agent frontmatter tests:
- Agents missing `description` get it from catalog
- Agents already having `description` are not modified
- Universal agents get correct descriptions
- Catalog agents get correct descriptions
- Unknown/user-created agents are skipped
- Customized agents prompt for confirmation (mock inquirer)
- Frontmatter structure is preserved (other fields untouched)

---

## Verification Checklist

### Automated
```bash
npm test && npm run lint
```

### Manual — Scenario C (upgrade from v1.9.0)
```bash
# Create a v1.9.0 project first (using the v1.9.0 code or a pre-Phase-1 state)
# Or manually create the old format:
rm -rf /tmp/test-upgrade && mkdir /tmp/test-upgrade && cd /tmp/test-upgrade && git init
# ... init with old worclaude, OR manually create flat skills + agents without description

# Then upgrade:
node ~/SEFA/GIT/Claude-Workflow/src/index.js upgrade
```

Verify:
- [ ] Flat `.md` files in `.claude/skills/` are gone — replaced by directories
- [ ] Each skill directory has `SKILL.md` inside
- [ ] All agents have `description` in frontmatter
- [ ] `workflow-meta.json` hash keys use new paths
- [ ] Backup was created before migration
- [ ] `/skills` in Claude Code shows migrated skills
- [ ] `/agents` in Claude Code shows patched agents
- [ ] `worclaude doctor` passes all checks post-upgrade

---

## Do NOT Change in This Phase

- Template files (already updated in Phases 1-3)
- `doctor.js` (already updated in Phase 4)
- `init.js`, `merger.js` (already updated in Phase 1)
- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files)
