# Phase 4: Doctor Enhancements

**Items:** #11, #12, #13
**Branch:** `feat/v2-phase-4-doctor-checks`
**Depends on:** Phase 1 merged (skill format + agent description must be the expected format)
**Can run in parallel with:** Phase 2, Phase 3, Phase 6
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-4-doctor-checks

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

`worclaude doctor` currently runs 4 categories of health checks (core files, components, docs, integrity). This phase adds 3 new checks based on Claude Code source analysis.

Claude Code's own `/doctor` screen checks agent parsing and context warnings. Worclaude's doctor should complement that by catching problems BEFORE they reach Claude Code — specifically the format and frontmatter issues that cause silent failures.

**File to modify:** `src/commands/doctor.js` (currently 319 lines)

---

## Item 11: CLAUDE.md Size Check

Claude Code caps CLAUDE.md content at 40,000 characters. CLAUDE.md is re-read on EVERY query turn, so oversized files waste context on every interaction.

### Implementation

Add a new check function:

```javascript
async function checkClaudeMdSize(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) {
    return []; // Already covered by existing checkClaudeMd
  }
  try {
    const content = await readFile(claudeMdPath);
    const charCount = content.length;
    const WARN_THRESHOLD = 30000;
    const FAIL_THRESHOLD = 38000;
    const HARD_LIMIT = 40000;

    if (charCount > FAIL_THRESHOLD) {
      return [
        result(
          FAIL,
          `CLAUDE.md size: ${charCount.toLocaleString()} chars`,
          `Exceeds recommended limit (${FAIL_THRESHOLD.toLocaleString()}/${HARD_LIMIT.toLocaleString()}). Claude Code caps at ${HARD_LIMIT.toLocaleString()} chars. Move domain-specific content to conditional skills with paths frontmatter.`
        ),
      ];
    }
    if (charCount > WARN_THRESHOLD) {
      return [
        result(
          WARN,
          `CLAUDE.md size: ${charCount.toLocaleString()} chars`,
          `Approaching limit (${WARN_THRESHOLD.toLocaleString()}/${HARD_LIMIT.toLocaleString()}). Consider moving content to skills.`
        ),
      ];
    }
    return [
      result(
        PASS,
        `CLAUDE.md size: ${charCount.toLocaleString()} chars (limit: ${HARD_LIMIT.toLocaleString()})`,
        null
      ),
    ];
  } catch {
    return [];
  }
}
```

Add to the core files check category.

---

## Item 12: Skill Format Check

Detect the old broken flat `.md` format in `.claude/skills/`. After Phase 1, Worclaude scaffolds the correct directory format, but existing projects may still have flat files from pre-v2.0.0.

### Implementation

```javascript
async function checkSkillFormat(projectRoot) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const results = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const flatMdFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name);

    if (flatMdFiles.length > 0) {
      results.push(
        result(
          FAIL,
          `skills/ has ${flatMdFiles.length} flat .md file(s)`,
          `Flat .md files in .claude/skills/ are invisible to Claude Code. Expected format: skill-name/SKILL.md. Run \`worclaude upgrade\` to migrate. Files: ${flatMdFiles.join(', ')}`
        )
      );
    }

    // Also check directory-format skills exist
    const skillDirs = entries.filter((e) => e.isDirectory());
    let validDirSkills = 0;
    for (const dir of skillDirs) {
      const skillMd = path.join(skillsDir, dir.name, 'SKILL.md');
      if (await fileExists(skillMd)) {
        validDirSkills++;
      }
    }

    if (validDirSkills > 0 && flatMdFiles.length === 0) {
      results.push(
        result(PASS, `skills/ format (${validDirSkills} directory-format skills)`, null)
      );
    }
  } catch {
    // skills/ doesn't exist — covered by existing component checks
  }

  return results;
}
```

Add to the components check category, after the existing skill existence checks.

---

## Item 13: Agent `description` Check

Detect agents missing the required `description` frontmatter. Without it, Claude Code's agent parser returns null and the agent is invisible.

### Implementation

```javascript
async function checkAgentDescription(projectRoot) {
  const agentsDir = path.join(projectRoot, '.claude', 'agents');
  const results = [];

  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(agentsDir, file.name);
      const content = await readFile(filePath);

      // Parse YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        results.push(
          result(
            FAIL,
            `agents/${file.name}`,
            'No YAML frontmatter — agent is invisible to Claude Code'
          )
        );
        continue;
      }

      const frontmatter = frontmatterMatch[1];
      const hasName = /^name:\s*.+/m.test(frontmatter);
      const hasDescription = /^description:\s*.+/m.test(frontmatter);

      if (!hasName) {
        results.push(
          result(FAIL, `agents/${file.name}`, 'Missing required "name" field in frontmatter')
        );
      } else if (!hasDescription) {
        results.push(
          result(
            FAIL,
            `agents/${file.name}`,
            'Missing required "description" field — agent is invisible to Claude Code\'s /agents and routing'
          )
        );
      }
    }

    if (results.length === 0 && mdFiles.length > 0) {
      results.push(
        result(PASS, `agents/ frontmatter (${mdFiles.length} agents have required fields)`, null)
      );
    }
  } catch {
    // agents/ doesn't exist — covered by existing component checks
  }

  return results;
}
```

Add to the components check category, after the existing agent checks.

---

## Integration

Wire the new checks into the existing doctor output structure. They should appear in their respective categories:

- **Core Files** section: add `checkClaudeMdSize` results after `checkClaudeMd`
- **Components** section: add `checkSkillFormat` and `checkAgentDescription` after existing skill/agent checks

### Tests

Add tests for the new checks in `tests/commands/doctor.test.js`:

- CLAUDE.md size: test PASS (small), WARN (31K chars), FAIL (39K chars)
- Skill format: test PASS (directory format), FAIL (flat `.md` files), mixed (both formats)
- Agent description: test PASS (has name+description), FAIL (missing description), FAIL (no frontmatter)

---

## Verification Checklist

### Automated

```bash
npm test && npm run lint
```

### Manual

```bash
# Test on a clean v2.0.0 project (after Phase 1)
cd /tmp/test-phase1
node ~/SEFA/GIT/Claude-Workflow/src/index.js doctor
# Should show all PASS for new checks

# Test with deliberately broken project
mkdir -p /tmp/test-doctor && cd /tmp/test-doctor && git init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
# Create a flat skill to trigger format check:
echo "# bad" > .claude/skills/broken.md
# Create an agent without description:
echo -e "---\nname: broken-agent\n---\nBroken" > .claude/agents/broken.md
node ~/SEFA/GIT/Claude-Workflow/src/index.js doctor
# Should show FAIL for skill format and agent description
```

---

## Do NOT Change in This Phase

- Template files (skills, agents, commands)
- Other source files (`init.js`, `merger.js`, `upgrade.js`)
- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files)
