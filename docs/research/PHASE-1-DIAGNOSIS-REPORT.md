# Phase 1 Diagnosis Report

**Date:** 2026-04-13
**Worclaude version:** 2.2.6
**Purpose:** Inform Phase 2 implementation decisions

---

## Target 1: pro-workflow

### 1.1 Correction Detection

Pro-workflow detects user corrections via a **`UserPromptSubmit` hook** that runs `scripts/prompt-submit.js` on every user prompt. The script parses stdin JSON for `input.prompt` and tests it against two regex pattern sets.

**Correction patterns** (`scripts/prompt-submit.js`, lines 42-52):

```js
const correctionPatterns = [
  /no,?\s*(that's|thats)?\s*(wrong|incorrect|not right)/i,
  /you\s*(should|shouldn't|need to|forgot)/i,
  /that's not what I (meant|asked|wanted)/i,
  /wrong file/i,
  /undo that/i,
  /revert/i,
  /don't do that/i,
  /stop/i,
  /wait/i
];
```

**Learn-trigger patterns** (same file, lines 60-66):

```js
const learnPatterns = [
  /remember (this|that)/i,
  /add (this|that) to (your )?rules/i,
  /don't (do|make) that (again|mistake)/i,
  /learn from this/i,
  /\[LEARN\]/i
];
```

When a correction is detected, it increments `corrections_count` on the current session row in SQLite (or falls back to a temp file counter) and logs a stderr hint: `[ProWorkflow] Correction detected - use /learn to capture this pattern`.

A **Cursor-format rule file** at `rules/self-correction.mdc` instructs Claude to propose `[LEARN] Category: Rule` blocks when corrected, with trigger phrases: `"remember this"`, `"add to rules"`, `"don't do that again"`.

**Mechanism:** Hook-based (UserPromptSubmit) + rule file (.mdc) instruction. Not done via CLAUDE.md or slash commands.

### 1.2 Correction Persistence

Corrections are stored in **SQLite** via `better-sqlite3`. The database lives at `~/.pro-workflow/data.db`.

**Schema** (from `src/db/index.ts`):

**Table: `learnings`**

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `created_at` | TEXT | `datetime('now')` default |
| `project` | TEXT | nullable, basename of project dir |
| `category` | TEXT NOT NULL | Navigation, Editing, Testing, Git, Quality, Context, Architecture, Performance, Claude-Code, Prompting |
| `rule` | TEXT NOT NULL | one-line description |
| `mistake` | TEXT | nullable |
| `correction` | TEXT | nullable |
| `times_applied` | INTEGER DEFAULT 0 | incremented via `incrementTimesApplied()` |

**Table: `sessions`**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | `CLAUDE_SESSION_ID` or `process.ppid` |
| `project` | TEXT | nullable |
| `started_at` | TEXT | `datetime('now')` |
| `ended_at` | TEXT | nullable |
| `edit_count` | INTEGER DEFAULT 0 | incremented by quality-gate.js |
| `corrections_count` | INTEGER DEFAULT 0 | incremented by prompt-submit.js |
| `prompts_count` | INTEGER DEFAULT 0 | incremented by prompt-submit.js |

**Virtual table: `learnings_fts`** -- FTS5 full-text search index over `category`, `rule`, `mistake`, `correction` with BM25 ranking. Maintained via INSERT/UPDATE/DELETE triggers.

The `[LEARN]` blocks are captured from assistant responses via the **Stop hook** (`learn-capture.js`) using this regex (line 28):

```js
/\[LEARN\]\s*([\w][\w\s-]*?)\s*:\s*(.+?)(?:\nMistake:\s*(.+?))?(?:\nCorrection:\s*(.+?))?(?=\n\[LEARN\]|\n\n|$)/gim
```

**Fallback:** When SQLite is unavailable, `session-start.js` falls back to reading `~/.claude/LEARNED.md` (plain markdown). No `.claude/rules/` directory usage.

**Could this work as pure markdown?** The fallback proves it partially can. But FTS5 search, BM25 ranking, `times_applied` tracking, session analytics, and adaptive quality gates all require SQLite.

### 1.3 Session Start Loading

The **SessionStart hook** (`scripts/session-start.js`) runs at every session start.

**Loading sequence:**

1. Opens SQLite at `~/.pro-workflow/data.db`
2. Calls `getRecentLearnings(db, 5, projectName)` -- loads the **5 most recent learnings** for the current project (or global where `project IS NULL`)
3. Logs up to 3 learnings to stderr (visible as hook output)
4. Calls `getRecentSessions(3)` for last session stats (edit count, corrections count)
5. Checks `git worktree list` for available worktrees

**Loading format:** Raw stderr text injection. Hook outputs to `console.error()`. Learnings are NOT injected into conversation context as system messages -- Claude sees them as hook output.

**Budget limit:** Hard-coded to 5 recent learnings, 3 printed in detail. Not configurable.

**Key limitation:** Hook output may not persist through compaction. Learnings are ephemeral session context, not persistent system messages.

### 1.4 Hook Coverage

**Pro-workflow:** 24 event types, 28 individual hook entries (including 2 LLM-powered hooks using `type: "prompt"` with `model: "haiku"`).

From `hooks/hooks.json`:

| Event Type | Hook Count | Scripts/Actions |
|---|---|---|
| `PreToolUse` | 5 (3 matchers) | quality-gate.js (Edit/Write), pre-commit-check.js (git commit), LLM commit validator (haiku), pre-push-check.js (git push), LLM secret scanner (Write) |
| `PostToolUse` | 2 | post-edit-check.js, test-failure-check.js |
| `Stop` | 2 | session-check.js, learn-capture.js |
| `SessionStart` | 1 | session-start.js |
| `SessionEnd` | 1 | session-end.js |
| `UserPromptSubmit` | 2 | prompt-submit.js, drift-detector.js |
| `PreCompact` | 1 | pre-compact.js |
| `PostCompact` | 1 | post-compact.js |
| `ConfigChange` | 1 | config-watcher.js |
| `Notification` | 1 | notification-handler.js |
| `SubagentStart` | 1 | subagent-start.js |
| `SubagentStop` | 1 | subagent-stop.js |
| `TaskCompleted` | 1 | task-completed.js |
| `TaskCreated` | 1 | task-created.js |
| `PermissionRequest` | 1 | permission-request.js |
| `PermissionDenied` | 1 | permission-denied.js |
| `PostToolUseFailure` | 1 | tool-failure.js |
| `TeammateIdle` | 1 | teammate-idle.js |
| `StopFailure` | 1 | stop-failure.js |
| `FileChanged` | 1 | file-changed.js (.env, package.json, tsconfig.json) |
| `Setup` | 1 | setup-hook.js |
| `WorktreeCreate` | 1 | worktree-create.js |
| `WorktreeRemove` | 1 | worktree-remove.js |
| `CwdChanged` | 1 | cwd-changed.js |

**Comparison with Worclaude:**

| Event Type | Worclaude | Pro-Workflow | Gap |
|---|---|---|---|
| `PreToolUse` | 0 | 5 | **Missing** -- quality gates, commit validation, secret scanning |
| `PostToolUse` | 2 | 2 | Covered differently (formatter/TS vs edit-check/test-failure) |
| `PostCompact` | 1 | 1 | Parity |
| `SessionStart` | 1 | 1 | Parity |
| `Stop` | 0 | 2 | **Missing** -- learning capture, session check |
| `SessionEnd` | 0 | 1 | **Missing** |
| `UserPromptSubmit` | 0 | 2 | **Missing** -- correction detection, drift detection |
| `PreCompact` | 0 | 1 | **Missing** |
| Other 16 events | 0 | 1 each | Missing (many are niche) |

**Worclaude total:** 3 event types, 5 entries. **Pro-workflow total:** 24 event types, 28 entries.

**Most impactful gaps:** UserPromptSubmit (correction/drift), PreToolUse (quality gates + LLM validation), Stop (learning capture), PreCompact (state preservation), SessionEnd (session persistence).

**LLM-powered hooks:** Pro-workflow uses `type: "prompt"` with `model: "haiku"` for commit message validation and secret scanning. Worclaude has no LLM-powered hooks.

### 1.5 Agent Frontmatter

8 agents examined. All frontmatter fields found:

| Field | Used In | Worclaude Has? |
|---|---|---|
| `name` | All agents | Yes |
| `description` | All agents | Yes |
| `tools` | All agents | **No** (Worclaude uses `disallowedTools` denylist instead) |
| `model` | orchestrator, debugger, scout | Yes |
| `memory` | orchestrator, debugger | **No** -- value: `"project"` |
| `skills` | orchestrator | **No** -- pre-loads skill files |
| `background` | scout | Yes |
| `isolation` | scout | Yes (but value `"worktree"`) |
| `omitClaudeMd` | 6 agents | Yes |

**Missing in Worclaude:** `tools` (allowlist), `memory: "project"` (cross-session agent memory), `skills` (pre-load specific skills).

**Note:** Worclaude has `maxTurns`, `criticalSystemReminder`, and `disallowedTools` which pro-workflow does not use.

### 1.6 Command Quality

**`/commit` (pro-workflow) vs `/commit-push-pr` (Worclaude):**

Pro-workflow's `/commit` is a 6-step checklist:
1. Pre-commit checks (git status, git diff)
2. Quality gates (lint, typecheck, test --changed)
3. Code review scan (console.log, debug, secrets, TODOs)
4. Commit message with conventional commits
5. Stage + commit
6. **Learning check** -- asks if corrections should be captured post-commit

Patterns Worclaude lacks: inline bash commands with output limiting, explicit code review scan checklist, post-commit learning capture prompt, options (`--no-verify`, `--amend`, `--push`), trigger phrase documentation.

**`/develop` (pro-workflow) vs `/start` (Worclaude):**

Pro-workflow's `/develop` accepts `$ARGUMENTS` and runs 4 phases:
1. Research -- confidence scoring (5 dimensions, 0-100 scale, GO/NO-GO gate at 70)
2. Plan -- structured plan with explicit "wait for approval" gate
3. Implement -- test after each file, pause every 5 edits, quality gates at end
4. Review & Commit -- **verification protocol**: "Read every changed file", "verify, don't assume", "grep for problems", "never report unverified findings"

The verification protocol explicitly forbids phrases like "ensure X" or "consider Y" without code citations.

**`/handoff` (pro-workflow) vs `/end` (Worclaude):**

Pro-workflow includes: database queries to pull session learnings, structured sections (Status, Decisions, Learnings Captured, Resume Command), options (`--full` with git diff, `--compact` for quick paste), saved to `~/.pro-workflow/handoffs/`.

Worclaude's `/end` lacks: database integration, explicit "Resume Command" section, `--compact` option.

**Patterns Worclaude lacks across all commands:**
1. Trigger phrases at the bottom of each command file
2. `$ARGUMENTS` interpolation
3. Embedded SQL/DB queries
4. Options documentation (`--no-verify`, `--compact`, `--full`)
5. Related commands sections
6. Learning capture prompts at end of task-completing commands

### 1.7 Key Takeaways for Worclaude

1. **UserPromptSubmit is the most impactful missing hook event.** Enables correction detection (9 regex patterns) and drift detection (keyword overlap scoring). A lightweight version could work without SQLite.

2. **The self-correction loop is 3 components:** Detection (UserPromptSubmit regex), capture (Stop hook parsing `[LEARN]` blocks), retrieval (SessionStart loading recent learnings). All three are needed.

3. **SQLite is the differentiator but heaviest dependency.** FTS5, BM25 ranking, `times_applied`, adaptive quality gates all require it. Pure markdown covers ~80% of the value. Consider whether value justifies `better-sqlite3` dependency.

4. **24 hook event types vs Worclaude's 3.** Biggest gaps: UserPromptSubmit, PreToolUse, Stop, PreCompact, SessionEnd. Many other events (TeammateIdle, WorktreeCreate) are niche.

5. **LLM-powered hooks** (`type: "prompt"`, `model: "haiku"`) for cheap validation (commit format, secret scanning). Novel and relatively easy to adopt.

6. **Agent frontmatter: `tools` allowlist > `disallowedTools` denylist.** More secure by default. Also `memory: "project"` for cross-session agent memory.

7. **Command patterns to adopt:** Trigger phrases, `$ARGUMENTS` interpolation, related-commands sections, post-task learning capture, "verified findings only" review protocol.

8. **Adaptive quality gates.** `quality-gate.js` adjusts edit-check thresholds from correction rate (>25% = every 3 edits, <5% = every 10 edits). Most sophisticated use of SQLite data.

9. **Drift detector.** Tracks original task intent keywords, compares against current prompt keywords. After 6+ edits with <20% overlap, warns about task drift. Unique feature.

10. **Rules use `.mdc` format** (Cursor-compatible) with YAML frontmatter (`description`, `alwaysApply`, `globs`). More structured than plain markdown rules.

---

## Target 2: everything-claude-code

### 2.1 Instincts System

**Location:** `.claude/homunculus/instincts/` with implementation in `skills/continuous-learning-v2/`.

Each instinct is a small YAML document representing one learned behavioral pattern.

**YAML structure (complete):**

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"        # code-style, testing, git, debugging, workflow, security
source: "session-observation" # session-observation, repo-curation, inherited
scope: project               # project or global
project_id: "a1b2c3d4e5f6"  # 12-char hash from git remote URL
project_name: "my-react-app"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional on 2025-01-15
```

**Confidence scoring:**
- 0.3 = tentative (suggested, not enforced)
- 0.5 = moderate (applied when relevant)
- 0.7 = strong (auto-approved)
- 0.9 = near-certain (core behavior)
- Increases via repeated observation, absence of corrections, agreement from other sources
- Decreases via explicit corrections, long inactivity, contradicting evidence

**How detection works:** Hook-based. `PreToolUse` and `PostToolUse` hooks with matcher `*` call `skills/continuous-learning-v2/hooks/observe.sh`, which:
1. Reads JSON from stdin (hook format)
2. Extracts tool_name, input, output, session_id, cwd
3. Detects project via git remote URL hash
4. Scrubs secrets using regex
5. Appends to `~/.claude/homunculus/projects/<hash>/observations.jsonl`
6. Optionally signals a background observer agent (Haiku) via SIGUSR1

**Instinct CLI** (`skills/continuous-learning-v2/scripts/instinct-cli.py`): commands `status`, `import`, `export`, `evolve`, `promote`, `projects`, `prune`.

**How `/evolve` works:** Reads all instincts, clusters by trigger/domain, classifies clusters into:
- **Commands** -- user-invoked actions (repeatable sequences)
- **Skills** -- auto-triggered behaviors (pattern-matching, error responses)
- **Agents** -- complex multi-step processes (debugging, refactoring)

With `--generate`, writes to `~/.claude/homunculus/projects/<hash>/evolved/` or `~/.claude/homunculus/evolved/`.

**Could this work as `.claude/rules/`?** Partially. The curated instincts file (`.claude/homunculus/instincts/inherited/everything-claude-code-instincts.yaml`) is effectively a rules file -- 8 curated instincts with triggers, actions, evidence. The dynamic observation/evolution pipeline requires hooks + CLI.

### 2.2 Agent Instruction Quality

**Location:** `agents/` directory (48 agents as markdown files with YAML frontmatter).

**Frontmatter fields across all 48 agents:**
- `name` (48/48)
- `description` (48/48) -- often with "Use PROACTIVELY when..." guidance
- `tools` (48/48) -- JSON array of allowed tools
- `model` (47/48) -- `opus` or `sonnet`
- `color` (5/48) -- GAN harness agents only

**Fields ECC does NOT use that Worclaude does:** `isolation`, `background`, `maxTurns`, `disallowedTools`, `omitClaudeMd`, `criticalSystemReminder`.

**Instruction depth analysis (5 agents):**

1. **planner** (210 lines, opus): Role > Planning Process (4 phases) > Plan Format (full template) > Best Practices > **Worked Example** (complete Stripe subscription plan) > Sizing and Phasing > Red Flags.

2. **architect** (211 lines, opus): Role > Architecture Review Process > 5 Principles > Common Patterns (Frontend/Backend/Data) > ADR template > System Design Checklist > Red Flags.

3. **security-reviewer** (108 lines, sonnet): OWASP Top 10 walkthrough > Code Pattern table (10 patterns with severity) > Key Principles > **Common False Positives** > Emergency Response > When to Run triggers.

4. **tdd-guide** (92 lines, sonnet): Red-Green-Refactor > Test Types table > Edge Cases (8 categories) > Anti-Patterns > Quality Checklist.

5. **code-reviewer** (238 lines, sonnet): **Confidence-based filtering** ("Report if >80% confident it is a real issue") > Review checklist by severity > Code examples per category > Structured output format.

**Key instruction patterns Worclaude lacks:**
- Confidence thresholds for reporting (">80% sure it is a real problem")
- Worked examples showing complete expected output
- Anti-pattern / "when NOT to use" sections
- False-positive guidance to reduce noise
- Priority/severity classification tables
- Versioned addendums (v1.8 additions) rather than full rewrites

**Comparison:** Worclaude agents are compact and generic. ECC agents are 2-5x longer with domain-specific code examples, worked examples, anti-patterns, and severity checklists. ECC has 48 agents vs Worclaude's 5.

### 2.3 Skills Structure

**Location:** `skills/` directory (183 skills), each as a subdirectory containing `SKILL.md`.

**Directory structure:**
```
skills/
  tdd-workflow/
    SKILL.md
  continuous-learning-v2/
    SKILL.md
    config.json
    hooks/observe.sh
    scripts/instinct-cli.py
    scripts/detect-project.sh
    agents/observer.md
    agents/observer-loop.sh
```

Most skills (167/183) contain only `SKILL.md`. A few have supporting files.

**Skill frontmatter fields:**
- `name` (182/183) -- kebab-case
- `description` (183/183)
- `origin` (164/183) -- `ECC` or `community`
- `version` (14/183) -- only versioned skills

**Skill body structure (consistent):**
1. `# Title`
2. `## When to Activate` -- trigger conditions
3. `## How It Works` / `## Core Concept`
4. `## Usage` / `## Examples`
5. `## Best Practices` / `## Success Metrics`

**Notable skills:**
- **tdd-workflow** (464 lines): Complete TDD methodology with Git checkpoint protocol, framework-specific code examples, coverage thresholds.
- **security-review** (496 lines): 10-section security checklist with PASS/FAIL code blocks.
- **gateguard** (~60 lines): Documents a PreToolUse hook that blocks first edits and demands investigation. Cites A/B test evidence (+2.25 points gated vs ungated).
- **exa-search**: MCP-to-skill conversion -- documents when to use the Exa neural search MCP tool. Skill doesn't implement the tool, just documents when/how to use it.

**Comparison with Worclaude:** Same `skill-name/SKILL.md` directory format. ECC has 183 vs 11 skills. ECC skills are generally 200-500 lines vs Worclaude's 50-150. ECC uses `origin` field (not in Worclaude).

### 2.4 Security Scanning

**What:** AgentShield (`ecc-agentshield` on npm) is a **separate npm package**, not an integrated hook or agent. Referenced via `skills/security-scan/SKILL.md`.

**What it scans (5 file types):**

| File | Checks |
|------|--------|
| `CLAUDE.md` | Hardcoded secrets, auto-run instructions, prompt injection |
| `settings.json` | Overly permissive allow lists, missing deny lists, dangerous bypass flags |
| `mcp.json` | Risky MCP servers, hardcoded env secrets, npx supply chain risks |
| `hooks/` | Command injection via interpolation, data exfiltration, silent error suppression |
| `agents/*.md` | Unrestricted tool access, prompt injection surface, missing model specs |

**Rule count:** 102 rules (v1.6.0). Severity grading A (90-100) through F (0-39).

**Capabilities:** `--fix` for auto-remediation, `--opus --stream` for three-agent adversarial deep analysis (Attacker/Defender/Auditor), `init` subcommand for secure scaffold, JSON/Markdown/HTML output.

**Invocation:** Users run `/security-scan`, which tells Claude to run `npx ecc-agentshield scan`. Purely on-demand, not automated.

### 2.5 Key Takeaways for Worclaude

1. **Instincts YAML format is a compelling structured rules format.** The curated instincts (id, trigger, confidence, domain, source, evidence) are more structured than prose CLAUDE.md rules but lighter than full skills. The static curated file could be adopted as a `.claude/rules/` equivalent.

2. **Agent instruction quality gap is significant.** Key patterns to adopt: confidence-based filtering, worked examples, false-positive sections, severity checklists, versioned addendums. ECC agents are 2-5x longer than Worclaude's.

3. **MCP-to-skill conversion pattern.** Skills like `exa-search` wrap MCP tool documentation. Skill doesn't implement the tool -- tells Claude when to use it and what parameters to pass. Clean separation: MCP provides tool, skill provides judgment.

4. **`origin` field for skill provenance.** Tracks whether a skill is core (`ECC`) or community-contributed. Useful for trust/quality signaling.

5. **Hooks system is more extensive.** 28 hook entries across 7 event types vs Worclaude's 5/3. Novel patterns: `gateguard-fact-force` (block first edit, demand investigation), `config-protection` (block lint/format weakening).

6. **AgentShield is external.** Security scanning as a separate npm package, not built-in. For Worclaude, a similar capability could be a PreToolUse hook or command/skill.

7. **`color` frontmatter field.** Used by GAN harness agents for multi-agent coordination roles. Not present in Worclaude.

---

## Target 3: get-shit-done

### 3.1 Quality Gates

GSD implements quality gates through **instruction-based enforcement in workflow markdown**, not hooks. Hooks handle orthogonal concerns (context monitoring, security, commit format).

**Gate Taxonomy (4 types, `references/gates.md`):**

| Gate Type | Purpose | Behavior |
|-----------|---------|----------|
| Pre-flight | Validates preconditions before starting | Blocks entry if conditions unmet; deterministic file checks |
| Revision | Evaluates output quality, routes to revision | Loops back with feedback; bounded by iteration cap (max 3) |
| Escalation | Surfaces unresolvable issues to developer | Pauses, presents options, waits for human input |
| Abort | Terminates operation to prevent damage | Stops immediately, preserves state, reports reason |

**Gate Matrix:** Maps every workflow to specific gates at specific phases. E.g., `plan-phase` entry = Pre-flight (checks REQUIREMENTS.md exists); `plan-phase` step 12 = Revision (PLAN.md quality, max 3 iterations).

**Bounded revision loop (`references/revision-loop.md`):**
1. Checker evaluates output
2. If BLOCKER/WARNING: increment iteration counter
3. If iteration > 3: escalate to user
4. **Stall detection:** if issue count doesn't decrease between iterations, escalate early
5. Re-spawn producer with checker feedback as `<checker_issues>` XML block
6. Re-check

**Gate prompts (`references/gate-prompts.md`):** 12 standardized prompt patterns (approve-revise-abort, yes-no, stale-continue, multi-option-escalation). Rules: max 12-char header, max 4 options, always handle "Other" freeform.

**Configurable gates (`templates/config.json`):** Individually toggleable:
```json
"gates": {
  "confirm_project": true,
  "confirm_phases": true,
  "confirm_roadmap": true,
  "confirm_plan": true,
  "execute_next_plan": true,
  "issues_review": true,
  "confirm_transition": true
}
```

**Verification patterns (`references/verification-patterns.md`):** 4-level verification depth:
1. **Exists** -- file present
2. **Substantive** -- real implementation, not placeholder
3. **Wired** -- connected to rest of system
4. **Functional** -- actually works when invoked

Includes grep patterns for stub detection (TODO/FIXME, placeholder text, empty handlers, hardcoded values).

**Verification overrides (`references/verification-overrides.md`):** Accept must-have failures with documented rationale. Fuzzy matching (80% token overlap). Items marked `PASSED (override)`.

**Hook roles (environmental, not workflow):**
- `gsd-workflow-guard.js` (PreToolUse): Soft advisory when edits happen outside GSD context. Does NOT block.
- `gsd-validate-commit.sh` (PreToolUse): Hard block (exit 2) on non-Conventional-Commits. The only blocking hook.
- `gsd-context-monitor.js` (PostToolUse): Warning/critical thresholds at 35%/25% remaining context. Auto-records session state on CRITICAL. Debounce (5 tool uses between warnings).

### 3.2 Spec-Driven Workflow

**Spec hierarchy stored in `.planning/`:**

1. **PROJECT.md** -- Project identity, core value, constraints
2. **ROADMAP.md** -- Phased roadmap with requirements per phase, `Depends on:` fields, success criteria
3. **REQUIREMENTS.md** -- Detailed requirements with IDs referenced by PLAN.md
4. **CONTEXT.md** (per-phase) -- User decisions from `/gsd-discuss-phase` with locked decisions, deferred ideas, Claude's discretion areas
5. **STATE.md** -- Living project memory (under 100 lines), read first every workflow

**Spec-to-implementation flow:**
```
/gsd-new-project -> PROJECT.md + ROADMAP.md + REQUIREMENTS.md + STATE.md
    |
/gsd-discuss-phase N -> CONTEXT.md (locks user decisions)
    |
/gsd-plan-phase N -> Research -> PLAN.md files -> Plan-checker revision loop
    |
/gsd-execute-phase N -> Wave-based parallel execution -> SUMMARY.md per plan
    |
/gsd-verify-work N -> Goal-backward verification -> VERIFICATION.md
    |
/gsd-next -> Phase transition with state update
```

**XML prompt formatting:**

GSD uses XML extensively for structural prompts. Consistent across all files.

Agent files use XML blocks:
```xml
<role>...</role>
<required_reading>...</required_reading>
<project_context>...</project_context>
<context_fidelity>...</context_fidelity>
```

Workflow files use XML for process structure:
```xml
<purpose>...</purpose>
<core_principle>...</core_principle>
<process>
  <step name="initialize" priority="first">...</step>
  <step name="discover_plans">...</step>
</process>
```

Plan files (PLAN.md) use XML for tasks:
```xml
<tasks>
  <task type="auto">
    <name>...</name>
    <files>...</files>
    <read_first>...</read_first>
    <action>...</action>
    <verify>...</verify>
    <acceptance_criteria>...</acceptance_criteria>
    <done>...</done>
  </task>
  <task type="checkpoint:human-verify" gate="blocking">
    <what-built>...</what-built>
    <how-to-verify>...</how-to-verify>
    <resume-signal>...</resume-signal>
  </task>
</tasks>
```

**Must-haves (goal-backward verification):** PLAN.md frontmatter includes:
```yaml
must_haves:
  truths: []       # Observable behaviors that must be true
  artifacts: []    # Files that must exist with real implementation
  key_links: []    # Critical connections between artifacts
```

These carry the contract from planning through execution to verification. The verifier checks each against the actual codebase, not against SUMMARY.md claims.

### 3.3 Subagent Orchestration

**31 agent definition files** in `agents/`, each as `gsd-{name}.md`.

**Agent frontmatter (5 fields):**
```yaml
---
name: gsd-verifier
description: Verifies phase goal achievement...
tools: Read, Write, Bash, Grep, Glob
color: green
---
```

Only `name`, `description`, `tools`, `color`, `hooks` (commented out). Model selection via `config.json` fields (`executor_model`, `verifier_model`) rather than agent-level frontmatter.

**Routing architecture (3 layers, distributed):**

1. **Commands** (`commands/gsd/*.md`, 75 total): Each declares `allowed-tools` and points to a workflow.
2. **Workflows** (`workflows/*.md`, 72 total): Each declares `<available_agent_types>` listing exact agent names it can spawn.
3. **Agent contracts** (`references/agent-contracts.md`): Completion markers for all agents (e.g., `## PLANNING COMPLETE`) that workflows regex-match to detect completion.

**No centralized routing file.** GSD avoids Worclaude's agent-routing.md approach. Routing is distributed across workflow files.

**Wave-based parallelism:** Plans within a wave run in parallel (each executor in its own worktree), waves execute sequentially.

**Smart dispatcher:** `/gsd-do` routes freeform natural language to the best `/gsd-*` command.

**Context budget:** Orchestrators stay lean (15% context budget). At >= 500K tokens, subagents receive richer context.

**Comparison with Worclaude:** Centralized agent-routing.md (generated from registry) vs distributed routing in workflow files. 31 vs 5 agents. GSD's `/gsd-do` freeform router has no equivalent in Worclaude.

### 3.4 Key Takeaways for Worclaude

1. **Gate taxonomy is powerful and adoptable.** Pre-flight / Revision / Escalation / Abort with a Gate Matrix provides clear mental model. Worclaude's `/verify` could adopt this classification.

2. **Bounded revision loops with stall detection.** Check-Revise-Escalate (max 3 iterations, stall detection) is more robust than single-pass review. Worclaude's plan-reviewer could benefit.

3. **Must-haves carry verification contracts.** `must_haves` (truths, artifacts, key_links) flow from planning through execution to verification. Prevents "task complete but goal not achieved."

4. **XML prompt structure is consistent and parseable.** Semantic names (`<role>`, `<tasks>`, `<verification>`) create a consistent language. Worclaude uses markdown sections; XML could improve structured parsing.

5. **4-level verification (Exists > Substantive > Wired > Functional)** with stub detection grep patterns is more rigorous than existence checks.

6. **Hooks are environmental, not workflow.** Clean separation: hooks for ambient concerns (context, security), instructions for business logic.

7. **Configuration-driven gate toggling.** Individual gate enable/disable vs Worclaude's coarser hook profiles (minimal/standard/strict).

8. **Context budget awareness.** Context-monitor hook with degradation tiers (PEAK/GOOD/DEGRADING/POOR) and auto-save on CRITICAL.

9. **75 commands + 72 workflows vs Worclaude's 16 commands.** Achieved through clean command -> workflow -> agent separation.

10. **Distributed routing scales better** than centralized, but requires discipline to keep declarations in sync.

---

## Target 4: MemPalace hooks

### 4.1 Hook Patterns

**Save hook (`hooks/mempal_save_hook.sh`):**
- Event: `Stop` (fires after every assistant response)
- Every `SAVE_INTERVAL` (default 15) human messages, blocks the stop with `{"decision": "block", "reason": "AUTO-SAVE checkpoint..."}`, injecting a save instruction
- Uses `stop_hook_active` field to prevent infinite loops -- second stop attempt has `stop_hook_active=true`, hook lets through
- State tracking in `~/.mempalace/hook_state/{session_id}_last_save`
- Optional background `mempalace mine` on save trigger
- Python for JSON parsing (no jq dependency), regex sanitization of session IDs

**PreCompact hook (`hooks/mempal_precompact_hook.sh`):**
- Event: `PreCompact`
- ALWAYS blocks with `{"decision": "block", "reason": "COMPACTION IMMINENT. Save ALL topics..."}`
- Runs `mempalace mine` synchronously (memories must land before compaction)
- Simpler than save hook (~78 vs 155 lines)

**`async: true` usage:** Not observed. Both hooks are synchronous bash scripts.

**Pattern:**
```
Stop event -> Count exchanges -> Threshold met? -> Block AI -> AI saves -> AI stops again -> stop_hook_active=true -> Allow stop
PreCompact event -> Always block -> AI saves everything -> Compaction proceeds
```

### 4.2 Key Takeaways for Worclaude

1. **`Stop` hook as periodic checkpoint trigger.** Using "about to stop" as a periodic timer by blocking and injecting work. Worclaude could use this for session summaries or PROGRESS.md auto-updates.

2. **`PreCompact` as emergency save.** Always blocking on PreCompact to force complete context save before compaction. Worclaude could auto-generate HANDOFF.md before compaction.

3. **`stop_hook_active` prevents infinite loops.** Essential for any hook that blocks and assigns work -- Claude Code sets this flag on the second stop attempt.

4. **Transcript counting.** Reading JSONL transcript and counting human messages (filtering `<command-message>` entries) is a portable session-activity measurement.

5. **Sync vs background for PreCompact.** Save hook runs work in background (`&`); precompact hook runs synchronously because memories must land before compaction erases context.

6. **Python for JSON parsing in bash hooks.** Avoids jq dependency. Worclaude should standardize on Node.js (already in its stack).

---

## Consolidated Findings

### What Worclaude should adopt

**High priority (clear value, achievable scope):**

1. **UserPromptSubmit hook for correction detection.** Pro-workflow's 9 regex patterns + drift detector is the most unique feature across all repos. Even a simplified version (markdown logging instead of SQLite) would differentiate Worclaude. Ship the regex patterns as a template hook script.

2. **Stop hook for learning capture.** Parse `[LEARN]` blocks from assistant output. Store as markdown in `.claude/learnings/` (no SQLite dependency). SessionStart hook loads recent learnings.

3. **PreToolUse hooks for quality gates.** At minimum: a commit message format validator. Optionally: an edit-count gate that pauses after N edits for review. Pro-workflow and GSD both validate commit format via hooks.

4. **PreCompact hook for state preservation.** MemPalace's pattern of always blocking PreCompact to force a save is a safety net. Worclaude could auto-snapshot current work state (modified files list, task context) before compaction.

5. **Richer agent instructions.** All three major repos have significantly more detailed agent templates than Worclaude. Adopt: confidence thresholds for reporting, worked examples of expected output, false-positive guidance, severity classification tables.

6. **Gate taxonomy.** GSD's Pre-flight / Revision / Escalation / Abort classification with bounded revision loops (max 3 iterations, stall detection) is a proven pattern. Incorporate into verify skill and plan-reviewer agent.

7. **4-level verification depth.** GSD's Exists > Substantive > Wired > Functional with stub detection grep patterns. Upgrade verify-app agent template.

8. **Must-haves in plan format.** GSD's `must_haves: { truths, artifacts, key_links }` carries verification contracts from planning through execution. Add to planning-with-files skill.

**Medium priority (valuable but heavier):**

9. **Instincts YAML format.** ECC's structured behavioral patterns (id, trigger, confidence, domain, source, evidence) are more useful than prose rules. Could template a `.claude/rules/instincts.yaml` or adopt as the format for a Worclaude rules feature.

10. **`$ARGUMENTS` interpolation in commands.** Pro-workflow commands accept arguments. Worclaude commands currently don't. This enables `/develop add auth middleware` instead of just `/develop`.

11. **Trigger phrases in commands.** Bottom-of-file documentation of natural language phrases that should invoke the command. Aids discoverability.

12. **MCP-to-skill documentation pattern.** ECC's approach of wrapping MCP tool documentation as a skill (tool provides capability, skill provides judgment about when to use it). Template this pattern.

13. **Context budget monitoring.** GSD's context-monitor hook with degradation tiers and auto-save on CRITICAL. Worclaude's PostCompact hook is reactive; a proactive monitor would catch issues earlier.

### What Worclaude should NOT adopt

1. **SQLite dependency.** Pro-workflow's `better-sqlite3` enables FTS5/BM25 and analytics but adds a heavy native dependency with build requirements. Markdown/JSON covers 80% of the value at 0% of the complexity.

2. **183 skills.** ECC's scale comes from community contributions and domain-specific content. Worclaude's 11 universal skills cover the workflow layer. Adding domain-specific skills is out of scope.

3. **48 agents.** Same reasoning. ECC includes language-specific reviewers (go-reviewer, kotlin-reviewer), GAN harness agents, persona forge agents. Worclaude's 5 universal + 20 optional agents cover the generic workflow needs.

4. **75 commands + 72 workflows.** GSD's command/workflow/agent separation is architecturally clean but massively over-engineered for a scaffolding tool. Worclaude's 16 commands are sufficient.

5. **XML prompt formatting.** GSD's XML works well within their system but would be inconsistent with Worclaude's markdown-based approach. Switching prompt format for no functional gain adds cognitive overhead for users.

6. **Distributed agent routing.** GSD embeds `<available_agent_types>` in each workflow. Worclaude's centralized agent-routing.md is simpler and auto-generated from the registry.

7. **AgentShield as a separate package.** ECC's security scanner is a full npm package. Worclaude should offer security guidance as a skill/agent, not ship a separate tool.

8. **Observation pipeline + evolve CLI.** ECC's continuous-learning-v2 system (hook-based observation, JSONL storage, Python CLI for evolution) is engineering-heavy. The static curated instincts format is adoptable; the dynamic pipeline is not worth the complexity.

### Specific implementation notes for Phase 2

**Hook template additions (template scripts in `templates/hooks/`):**

| Hook | Event | Script | Priority |
|------|-------|--------|----------|
| Correction detector | UserPromptSubmit | `correction-detect.js` | P0 |
| Drift detector | UserPromptSubmit | `drift-detect.js` | P1 |
| Learning capture | Stop | `learn-capture.js` | P0 |
| Commit validator | PreToolUse (git commit) | `commit-validate.js` | P1 |
| Edit quality gate | PreToolUse (Edit/Write) | `quality-gate.js` | P2 |
| Pre-compact save | PreCompact | `pre-compact-save.js` | P1 |
| Session end | SessionEnd | `session-end.js` | P2 |

All scripts should use Node.js (already in Worclaude's stack). JSON on stdin, JSON on stdout. No external dependencies.

**Agent template enrichment:**
- Add worked examples to plan-reviewer (like ECC's planner Stripe example)
- Add confidence thresholds to code-simplifier and test-writer
- Add false-positive guidance to verify-app
- Add severity classification to build-validator
- Consider `tools` allowlist alongside existing `disallowedTools` denylist

**Skill/command additions:**
- Add `must_haves` pattern to planning-with-files skill
- Add gate taxonomy to verification skill
- Add 4-level verification depth to verify-app agent
- Add trigger phrases to all 16 command templates
- Add `$ARGUMENTS` support to start, end, commit-push-pr commands

**Storage format for learnings (no SQLite):**
```
.claude/learnings/
  2026-04-13-git-conventions.md    # One file per learning
  2026-04-13-testing-patterns.md
  index.json                        # Category index for fast lookup
```

Each learning file: YAML frontmatter (category, project, created_at, times_applied) + markdown body (rule, mistake, correction). SessionStart hook reads `index.json`, loads top N by recency. `times_applied` tracked in `index.json` and incremented when the learning is referenced.
