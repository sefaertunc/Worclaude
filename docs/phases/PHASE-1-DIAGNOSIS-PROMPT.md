# Phase 1 — Diagnosis of External Workflow Repos

## Context

You are working on **Worclaude** (`sefaertunc/Worclaude`), a Node.js CLI scaffolding tool that generates `.claude/` workflow infrastructure for Claude Code projects. Current version is **v2.2.6**. Main and develop are in sync.

Before implementing new features, we need to diagnose external repos to understand how they solve problems Worclaude will address in upcoming releases. This is a **read-only research phase** — do NOT modify any Worclaude files.

## What Worclaude Currently Scaffolds (for comparison baseline)

Read these files from the Worclaude repo to establish the baseline before diagnosing external repos:

```bash
# Understand current hook configuration
cat templates/settings/base.json

# Understand current commands
ls templates/commands/
cat templates/commands/end.md
cat templates/commands/start.md

# Understand current agents
ls templates/agents/universal/
ls templates/agents/optional/

# Understand current skills
ls templates/skills/universal/

# Understand CLAUDE.md template
cat templates/core/claude-md.md
```

## Diagnosis Targets

### Target 1: `rohitg00/pro-workflow` (PRIMARY — Memory & Corrections)

This is the **#1 diagnosis priority**. Pro-workflow implements a self-correcting SQLite memory system where corrections compound over 50+ sessions.

**Clone and examine:**

```bash
cd /home/sefa/SEFA/tmp/
git clone https://github.com/rohitg00/pro-workflow.git
cd pro-workflow
```

**Investigate these specific elements:**

1. **Correction detection mechanism:**
   - Search for regex patterns that detect user corrections (phrases like "no, use X", "don't do Y", "actually...")
   - Find the file(s) that implement correction capture
   - Document the exact regex patterns used
   - Determine: is this done via hooks, commands, or inline in CLAUDE.md instructions?

   ```bash
   grep -r "correct" --include="*.md" --include="*.json" --include="*.sh" --include="*.py" --include="*.js" -l .
   grep -r "learn" --include="*.md" --include="*.json" --include="*.sh" -l .
   grep -r "regex\|pattern\|detect" --include="*.md" --include="*.sh" --include="*.py" --include="*.js" -l .
   ```

2. **Correction persistence format:**
   - Find where corrections are stored (SQLite? markdown? JSON?)
   - Document the schema/format
   - Determine if this could work as pure markdown (no SQLite dependency)
   - Check: does it use `.claude/rules/` directory? Or a custom path?

   ```bash
   find . -name "*.db" -o -name "*.sqlite" -o -name "corrections*" -o -name "learnings*" -o -name "memory*" 2>/dev/null
   grep -r "sqlite\|database\|\.db" --include="*.md" --include="*.json" --include="*.sh" -l .
   grep -r "rules/" --include="*.md" --include="*.json" -l .
   ```

3. **Session start loading:**
   - Find the SessionStart hook or equivalent
   - How are past corrections loaded into new sessions?
   - What's the loading format? (raw text injection? file read? skill?)
   - Is there a budget limit on how much gets loaded?

   ```bash
   grep -r "SessionStart\|session_start\|startup" --include="*.json" --include="*.md" -l .
   cat .claude/settings.json 2>/dev/null || cat settings.json 2>/dev/null
   find . -path "*hooks*" -type f
   ```

4. **Hook scripts (29 reported):**
   - List ALL hook scripts with their event types
   - Document which lifecycle events are covered
   - Compare against Worclaude's current 4 hooks (PostToolUse×2, PostCompact, SessionStart)
   - Identify hooks Worclaude is missing

   ```bash
   find . -path "*hook*" -type f | head -40
   grep -r "PreCompact\|PostCompact\|PreToolUse\|PostToolUse\|SessionStart\|SessionEnd\|UserPromptSubmit\|Stop\|Notification\|PermissionDenied\|SubagentStart\|SubagentStop" --include="*.json" .
   ```

5. **Agent frontmatter fields:**
   - Read 2-3 agent files
   - Document all YAML frontmatter fields used (model, memory, tools, etc.)
   - Compare with Worclaude's agent frontmatter

   ```bash
   find . -path "*agents*" -name "*.md" | head -10
   # Read the first 20 lines of each to see frontmatter
   ```

6. **Command content quality:**
   - Read 3-4 commands that overlap with Worclaude's commands (start, end, commit, verify)
   - Compare instruction depth and structure
   - Note any patterns Worclaude's commands lack

   ```bash
   find . -path "*commands*" -name "*.md" | head -15
   ```

**Produce a structured report for Target 1 covering all 6 elements.**

---

### Target 2: `affaan-m/everything-claude-code` (Agents & Skills & Instincts)

ECC has ~100K+ stars and is the de facto community standard. Focus on three specific systems.

**Clone and examine:**

```bash
cd /home/sefa/SEFA/tmp/
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code
```

**Investigate these specific elements:**

1. **Instincts system:**
   - Find the instincts implementation
   - How are behavioral patterns detected and scored (confidence 0.3–0.9)?
   - How does `/evolve` aggregate instincts into skills?
   - Is this implemented via hooks, commands, or CLAUDE.md instructions?
   - Could this pattern work as a `.claude/rules/` file?

   ```bash
   grep -r "instinct" --include="*.md" --include="*.json" -l .
   grep -r "evolve\|confidence\|score" --include="*.md" -l .
   find . -name "*instinct*" -type f
   ```

2. **Agent instruction quality:**
   - Read 5 diverse agents (pick from: planner, architect, security-reviewer, tdd-guide, build-error-resolver)
   - Document instruction patterns: how do they structure reasoning guidance?
   - Compare instruction depth with Worclaude's 5 universal agents
   - Note frontmatter fields Worclaude doesn't use

   ```bash
   find . -path "*agents*" -name "*.md" | head -20
   ```

3. **Skills structure:**
   - How are skills organized? (directory structure, naming, frontmatter)
   - Sample 3-4 skills and document their structure
   - Compare with Worclaude's 11 universal skills
   - The "convert MCPs to skills" pattern — find examples

   ```bash
   find . -path "*skills*" -name "*.md" | head -20
   find . -path "*skills*" -type d
   ```

4. **Security scanning (AgentShield):**
   - Find the AgentShield implementation
   - What does it scan for? How many rules?
   - Is it a PreToolUse hook? An agent? A command?

   ```bash
   grep -r "shield\|security\|scan" --include="*.md" --include="*.json" -l . | head -10
   find . -name "*shield*" -o -name "*security*" -type f | head -10
   ```

**Produce a structured report for Target 2 covering all 4 elements.**

---

### Target 3: `gsd-build/get-shit-done` (Quality Gates & Spec-Driven Workflow)

GSD is a spec-driven development system used by FAANG engineers.

**Clone and examine:**

```bash
cd /home/sefa/SEFA/tmp/
git clone https://github.com/gsd-build/get-shit-done.git
cd get-shit-done
```

**Investigate these specific elements:**

1. **Quality gate implementation:**
   - How do quality gates block progression?
   - Is this hooks-based or instruction-based?
   - What verification steps are enforced?

   ```bash
   grep -r "gate\|quality\|block\|enforce" --include="*.md" --include="*.json" -l .
   find . -name "*.md" | head -20
   ```

2. **Spec-driven workflow:**
   - How are specs structured?
   - How does the spec-to-implementation flow work?
   - XML prompt formatting — find examples and document the pattern

   ```bash
   grep -r "spec\|xml\|<spec\|</spec" --include="*.md" -l .
   ```

3. **Subagent orchestration:**
   - How are subagents defined and routed?
   - Compare with Worclaude's agent routing approach

   ```bash
   grep -r "subagent\|agent\|orchestrat" --include="*.md" --include="*.json" -l .
   ```

**Produce a structured report for Target 3 covering all 3 elements.**

---

### Target 4: `MemPalace/mempalace` hooks only (5-minute scan)

**Quick scan only — do NOT deep-dive the full repo.**

```bash
cd /home/sefa/SEFA/tmp/
git clone https://github.com/MemPalace/mempalace.git
cd mempalace
```

**Read only these files:**

```bash
cat hooks/mempal_save_hook.sh
cat hooks/mempal_precompact_hook.sh
ls hooks/
```

**Document:**

- How does the save hook trigger? (every N messages? on Stop?)
- What does the PreCompact hook save? (format, destination)
- How is `async: true` used (if at all)?
- Any patterns worth adopting for Worclaude's PreCompact hook?

**Produce a brief report (10-15 lines max) for Target 4.**

---

## Output Format

Write the complete diagnosis report to: `docs/research/PHASE-1-DIAGNOSIS-REPORT.md`

```bash
mkdir -p docs/research
```

Structure it as:

```markdown
# Phase 1 Diagnosis Report

**Date:** YYYY-MM-DD
**Worclaude version:** 2.2.6
**Purpose:** Inform Phase 2 implementation decisions

## Target 1: pro-workflow

### 1.1 Correction Detection

### 1.2 Correction Persistence

### 1.3 Session Start Loading

### 1.4 Hook Coverage

### 1.5 Agent Frontmatter

### 1.6 Command Quality

### 1.7 Key Takeaways for Worclaude

## Target 2: everything-claude-code

### 2.1 Instincts System

### 2.2 Agent Instruction Quality

### 2.3 Skills Structure

### 2.4 Security Scanning

### 2.5 Key Takeaways for Worclaude

## Target 3: get-shit-done

### 3.1 Quality Gates

### 3.2 Spec-Driven Workflow

### 3.3 Subagent Orchestration

### 3.4 Key Takeaways for Worclaude

## Target 4: MemPalace hooks

### 4.1 Hook Patterns

### 4.2 Key Takeaways for Worclaude

## Consolidated Findings

### What Worclaude should adopt

### What Worclaude should NOT adopt

### Specific implementation notes for Phase 2
```

## Critical Rules

- **Do NOT modify existing Worclaude source files** (templates/, src/, tests/, docs/spec/) — the ONLY file you create is the diagnosis report at `docs/research/PHASE-1-DIAGNOSIS-REPORT.md`
- **Source verification** — read actual files before making claims. Do not reason from memory about what files might contain.
- **Clone to `/home/sefa/SEFA/tmp/`** — keep diagnosis repos separate from the Worclaude project
- **If a repo structure doesn't match expectations** (e.g., no `.claude/` directory, different layout), document what you actually find instead of guessing
- **Compare everything against Worclaude's actual current state** — read Worclaude templates first, then compare
- **Be concise but precise** — document file paths, exact frontmatter fields, actual regex patterns. No vague summaries.
