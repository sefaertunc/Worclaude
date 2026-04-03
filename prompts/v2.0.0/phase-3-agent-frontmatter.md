# Phase 3: Agent Frontmatter Enrichment

**Items:** #6, #7, #8, #9, #10
**Branch:** `feat/v2-phase-3-agent-frontmatter`
**Depends on:** Phase 1 merged (agents now have `description` and are visible to Claude Code)
**Can run in parallel with:** Phase 2, Phase 4
**Orchestrator:** Read `prompts/v2.0.0/orchestrator.md` for full context.

## Session Workflow

```
git checkout develop && git pull
git checkout -b feat/v2-phase-3-agent-frontmatter

/start                          # Load context, read this prompt
Plan                            # Design the approach from tasks below
/review-plan                    # Send plan to plan-reviewer
Execute                         # Implement Tasks A–E
/refactor-clean                 # Clean up changed code
/verify                         # npm test && npm run lint
/commit-push-pr                 # PR to develop
```

---

## Background

Claude Code's agent parser (`parseAgentFromMarkdown()` in `loadAgentsDir.ts`) supports these frontmatter fields beyond `name` and `description` (added in Phase 1):

- **`disallowedTools`** — Array of tool names the agent cannot use. Enforced at runtime — the agent literally cannot call these tools. The production Explore and Plan agents use this to block `FileEditTool`, `FileWriteTool`, `NotebookEditTool`, and `AgentTool`.

- **`background`** — Boolean. When `true`, the agent always runs as a background task. The production Verification agent uses this so it runs asynchronously while the user continues working.

- **`maxTurns`** — Positive integer. Maximum number of agentic turns before the agent stops. Prevents runaway loops that burn tokens.

- **`omitClaudeMd`** — Boolean. When `true`, CLAUDE.md is NOT injected into the agent's context. Saves tokens for agents that don't need project conventions (read-only agents that just search/analyze). The production Explore and Plan agents both set this.

- **`memory`** — Scope for persistent memory across sessions: `user`, `project`, or `local`. When set, the agent writes and reads memory files that persist between sessions, enabling it to learn from past runs.

Source evidence (from `loadAgentsDir.ts`):

```typescript
const AgentJsonSchema = z.object({
  description: z.string(),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  model: z.string().optional(),
  effort: z.union([z.enum(EFFORT_LEVELS), z.number().int()]).optional(),
  permissionMode: z.enum(PERMISSION_MODES).optional(),
  maxTurns: z.number().int().positive().optional(),
  memory: z.enum(['user', 'project', 'local']).optional(),
  background: z.boolean().optional(),
  isolation: z.enum(['worktree']).optional(),
  // ...
});
```

---

## Task A: Add `disallowedTools` to Read-Only Agents

Read-only agents should be structurally prevented from modifying files. Currently they rely on prompt instructions ("do NOT modify files") which the model can ignore.

Add `disallowedTools` to these agents. Use the exact tool names Claude Code recognizes:

- `Edit` — FileEditTool
- `Write` — FileWriteTool
- `NotebookEdit` — NotebookEditTool
- `Agent` — AgentTool (prevents sub-spawning, optional — omit if the agent might benefit from spawning explorers)

### Agents to modify

**`templates/agents/universal/plan-reviewer.md`** — reviews plans, never edits:

```yaml
---
name: plan-reviewer
description: 'Reviews implementation plans for specificity, gaps, and executability'
model: opus
isolation: none
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
---
```

**`templates/agents/optional/quality/security-reviewer.md`** — reviews for vulnerabilities, never fixes:

```yaml
---
name: security-reviewer
description: 'Reviews code for security vulnerabilities'
model: opus
isolation: none
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
---
```

**`templates/agents/optional/quality/performance-auditor.md`** — analyzes performance, never fixes:

```yaml
---
name: performance-auditor
description: 'Analyzes code for performance issues'
model: sonnet
isolation: none
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
---
```

**`templates/agents/optional/frontend/ui-reviewer.md`** — reviews UI, never modifies:

```yaml
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
```

**`templates/agents/optional/backend/database-analyst.md`** — reviews schemas, never modifies:

```yaml
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
```

**`templates/agents/optional/backend/api-designer.md`** — reviews API design, but MAY write spec documents:

```yaml
disallowedTools:
  - Edit
  - NotebookEdit
  - Agent
```

(Note: keeps `Write` since it may write design documents. If this feels wrong, block Write too.)

**`templates/agents/optional/devops/dependency-manager.md`** — reviews deps, never modifies:

```yaml
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
```

**`templates/agents/optional/devops/deploy-validator.md`** — validates readiness, never modifies:

```yaml
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
```

**`templates/agents/optional/data/data-pipeline-reviewer.md`** — reviews pipelines, never modifies:

```yaml
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
```

**`templates/agents/optional/data/ml-experiment-tracker.md`** — reviews experiments, never modifies:

```yaml
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
```

**`templates/agents/optional/docs/changelog-generator.md`** — generates changelog, DOES need Write but NOT Edit/Agent:

```yaml
disallowedTools:
  - Edit
  - NotebookEdit
  - Agent
```

### Agents that should NOT get `disallowedTools` (they need write access)

These agents actively modify files as part of their job — do NOT add `disallowedTools`:

- `code-simplifier` — refactors code
- `test-writer` — writes test files
- `build-validator` — runs commands but doesn't write (already has `isolation: none` and read-only behavior via prompt, but no need to block tools since it needs Bash)
- `verify-app` — runs verification commands
- `bug-fixer` — fixes bugs in code
- `refactorer` — refactors code
- `build-fixer` — fixes build configs
- `e2e-runner` — writes and runs tests
- `ci-fixer` — fixes CI configs
- `docker-helper` — reviews Docker configs (may suggest edits)
- `doc-writer` — writes documentation
- `auth-auditor` — may write security fixes
- `style-enforcer` — may write style fixes
- `prompt-engineer` — may write improved prompts

---

## Task B: Add `background: true` to Async Agents

These agents run long tasks that benefit from background execution:

**`templates/agents/universal/verify-app.md`:**

```yaml
background: true
```

**`templates/agents/universal/build-validator.md`:**

```yaml
background: true
```

**`templates/agents/optional/quality/e2e-runner.md`:**

```yaml
background: true
```

Add `background: true` after the existing frontmatter fields (after `isolation` or `description`). No other agents get this field.

---

## Task C: Add `maxTurns` to All Agents

Every agent should have a turn limit to prevent runaway token consumption. Set reasonable defaults based on task complexity:

| Agent                             | `maxTurns` | Rationale                        |
| --------------------------------- | ---------- | -------------------------------- |
| **Universal agents**              |            |                                  |
| `plan-reviewer`                   | 30         | Read-only review, bounded scope  |
| `code-simplifier`                 | 50         | Multiple refactoring passes      |
| `test-writer`                     | 50         | Multiple test files, iterative   |
| `build-validator`                 | 20         | Run checks and report, fast      |
| `verify-app`                      | 50         | May need many verification steps |
| **Read-only optional agents**     |            |                                  |
| `security-reviewer`               | 40         | Systematic OWASP scan            |
| `performance-auditor`             | 30         | Profiling and analysis           |
| `ui-reviewer`                     | 30         | UI analysis                      |
| `database-analyst`                | 30         | Schema/query review              |
| `api-designer`                    | 30         | API review                       |
| `dependency-manager`              | 20         | Check deps and report            |
| `deploy-validator`                | 20         | Validation checks                |
| `data-pipeline-reviewer`          | 30         | Pipeline analysis                |
| `ml-experiment-tracker`           | 30         | Experiment review                |
| `changelog-generator`             | 15         | Read commits, write changelog    |
| **Write-capable optional agents** |            |                                  |
| `bug-fixer`                       | 50         | Diagnosis + fix + verify         |
| `refactorer`                      | 50         | Multiple refactoring passes      |
| `build-fixer`                     | 40         | Diagnosis + fix + rebuild        |
| `e2e-runner`                      | 50         | Write tests + run them           |
| `ci-fixer`                        | 40         | Diagnosis + fix + verify         |
| `docker-helper`                   | 30         | Review + suggest                 |
| `doc-writer`                      | 40         | Write multiple doc files         |
| `auth-auditor`                    | 40         | Audit + potential fixes          |
| `style-enforcer`                  | 30         | Style checks + fixes             |
| `prompt-engineer`                 | 30         | Review + rewrite prompts         |

Add `maxTurns: N` to each agent's frontmatter.

---

## Task D: Add `omitClaudeMd: true` to Read-Only Agents

These agents don't need project conventions from CLAUDE.md — they search, analyze, or generate without needing commit rules, session protocol, or project-specific gotchas:

**Add `omitClaudeMd: true` to:**

- `plan-reviewer` — reads code and plans, main agent interprets results with full CLAUDE.md
- `security-reviewer` — OWASP checks are project-agnostic
- `performance-auditor` — performance analysis doesn't need project conventions
- `changelog-generator` — reads git log, writes structured output

**Do NOT add to other agents** — agents that modify files need CLAUDE.md conventions (commit format, coding patterns, etc.).

---

## Task E: Add `memory` Scope to Select Agents

Enable persistent memory for agents that benefit from learning across sessions:

**`templates/agents/universal/test-writer.md`:**

```yaml
memory: project
```

Rationale: learns test patterns, naming conventions, and coverage gaps specific to this project.

**`templates/agents/optional/quality/security-reviewer.md`:**

```yaml
memory: project
```

Rationale: remembers previous vulnerability findings, tracks what was fixed vs. still open.

**`templates/agents/optional/docs/doc-writer.md`:**

```yaml
memory: project
```

Rationale: learns documentation style, structure preferences, and what's been documented.

No other agents get `memory` in this phase. Memory can be added to more agents later based on user feedback.

---

## Complete Frontmatter Examples

After all 5 tasks, here's what two representative agents should look like:

### `plan-reviewer.md` (read-only, all enhancements):

```yaml
---
name: plan-reviewer
description: 'Reviews implementation plans for specificity, gaps, and executability'
model: opus
isolation: none
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
maxTurns: 30
omitClaudeMd: true
---
```

### `test-writer.md` (write-capable, with memory):

```yaml
---
name: test-writer
description: 'Writes comprehensive, meaningful tests for recently changed code'
model: sonnet
isolation: worktree
maxTurns: 50
memory: project
---
```

### `verify-app.md` (write-capable, background):

```yaml
---
name: verify-app
description: 'Verifies the running application end-to-end — tests actual behavior, not just code reading'
model: sonnet
isolation: worktree
background: true
maxTurns: 50
---
```

### `security-reviewer.md` (read-only, with memory):

```yaml
---
name: security-reviewer
description: 'Reviews code for security vulnerabilities'
model: opus
isolation: none
disallowedTools:
  - Edit
  - Write
  - NotebookEdit
  - Agent
maxTurns: 40
omitClaudeMd: true
memory: project
---
```

---

## Verification Checklist

### Automated

```bash
npm test        # All tests must pass
npm run lint    # Must pass
```

### Manual — Scenario A

```bash
rm -rf /tmp/test-phase3 && mkdir /tmp/test-phase3 && cd /tmp/test-phase3 && git init
node ~/SEFA/GIT/Claude-Workflow/src/index.js init
# Select "Full-stack web application", pick all agents
```

Verify agent frontmatter in `.claude/agents/`:

- [ ] `plan-reviewer.md` has `disallowedTools`, `maxTurns: 30`, `omitClaudeMd: true`, no `background`
- [ ] `verify-app.md` has `background: true`, `maxTurns: 50`, no `disallowedTools`, no `omitClaudeMd`
- [ ] `security-reviewer.md` has `disallowedTools`, `maxTurns: 40`, `omitClaudeMd: true`, `memory: project`
- [ ] `test-writer.md` has `maxTurns: 50`, `memory: project`, no `disallowedTools`
- [ ] `changelog-generator.md` has `disallowedTools` (no Edit/Agent but has Write), `maxTurns: 15`, `omitClaudeMd: true`
- [ ] Every agent has `maxTurns`
- [ ] No write-capable agent has `disallowedTools` that would block its primary function

### Manual — Claude Code Integration

In the scaffolded test project, start Claude Code:

- [ ] `/agents` shows all agents with correct descriptions
- [ ] Ask plan-reviewer to edit a file — should refuse (tool blocked)
- [ ] Ask verify-app to verify something — should run as background task

---

## Do NOT Change in This Phase

- Skill templates (those are Phase 2)
- Command templates (those are Phase 2)
- Agent markdown body content (only frontmatter additions in this phase)
- Source code files (`init.js`, `merger.js`, etc.)
- CLAUDE.md, PROGRESS.md, SPEC.md, package.json version (shared-state files)
