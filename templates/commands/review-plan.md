---
description: "Auto-detect plans from .claude/plans/ and send to plan-reviewer with project context"
---

Send an implementation plan to the `plan-reviewer` agent for staff-level
review. The plan-reviewer acts as a staff engineer and critically
reviews the plan for ambiguity, missing verification steps, unrealistic
scope, edge cases, and SPEC.md alignment.

## 1. Auto-detect the plan

Read `.claude/plans/` and list every file inside (excluding `.gitkeep`
and `README.md`). Behavior depends on what's present:

- **Zero plan files:** **Refuse to dispatch.** Report:
  "No plan files found in `.claude/plans/`. Drop your plan there
  (any filename) and re-run `/review-plan`."
  Do not invoke the agent.

- **Exactly one plan file:** Use it directly without asking.

- **Multiple plan files:** Use **`AskUserQuestion`** (2-4 options) to
  let the user pick which one to review. For >4 candidates, present a
  numbered list and ask for a number reply.

Do NOT match filename patterns. The folder convention is the discovery
mechanism — anything in `.claude/plans/` is a candidate.

## 2. Auto-load project context

Before dispatching, read these files and pass their contents to the
agent so it can check SPEC alignment without a second turn:

- `CLAUDE.md` — project conventions and critical rules
- `docs/spec/SPEC.md` — the source of truth for what should ship

Include both in the agent's prompt under clearly-labeled sections.

## 3. Dispatch to `plan-reviewer`

```
Agent({
  subagent_type: "plan-reviewer",
  description: "Staff-level review of <plan-file>",
  prompt: "Review the implementation plan below as a senior staff engineer.

PLAN (from .claude/plans/<filename>):
<plan content>

PROJECT CONVENTIONS (from CLAUDE.md):
<CLAUDE.md content>

SPECIFICATION (from docs/spec/SPEC.md):
<SPEC.md content>

Check for: ambiguity, missing verification steps, unrealistic scope,
edge cases, SPEC alignment. Report findings in priority order with
specific file/line references where possible."
})
```

## 4. Persist the review output

When the agent returns, **write its findings to
`.claude/scratch/last-plan-review.md`** with SHA frontmatter so the
next session can surface the review via `/start`:

```markdown
---
created: <YYYY-MM-DDTHH:MM:SSZ>
sha: <git rev-parse HEAD>
command: /review-plan
plan: .claude/plans/<filename>
---

# Plan Review

<agent output verbatim>
```

If `last-plan-review.md` already exists, **overwrite it** — only the
most recent review is consumed.

## 5. Report

Surface the review's priority findings to the user inline. Wait for
them to address feedback before proceeding to implementation.

## Trigger Phrases
- "review this plan"
- "check my implementation plan"
- "plan review"
