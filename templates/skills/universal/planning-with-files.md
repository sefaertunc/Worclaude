---
description: "How to structure implementation plans as files, progressive implementation, plan review process"
---

# Planning with Files

## The IMPLEMENTATION-PROMPT Pattern

Large tasks need a written plan before code. The plan lives as a file so it can be
reviewed, versioned, and referenced across sessions.

File naming: `IMPLEMENTATION-PROMPT-{FEATURE}.md` in the project root or `docs/` directory.

Structure:
```markdown
# Implementation: {Feature Name}

## Goal
One sentence. What does success look like?

## Context
What exists today. What needs to change. Links to relevant spec sections.

## Plan

### Phase 1: {Name}
- Step 1: {specific action}
  - Verify: {how to confirm it worked}
- Step 2: {specific action}
  - Verify: {how to confirm it worked}

### Phase 2: {Name}
...

## Edge Cases
- {case}: {how to handle}

## Out of Scope
- {thing we're explicitly NOT doing}
```

## Breaking Large Tasks into Phases

Each phase should be:
- Independently testable
- Committable on its own
- Small enough for one session (or one focused block within a session)

Signs a phase is too big:
- More than 5-7 steps
- Touches more than 3-4 files substantially
- You can't describe the verification in one sentence

Signs a phase is too small:
- It's just one line change
- The verification is "it compiles"
- It doesn't move the feature forward meaningfully

## The Plan-Review Workflow

Before implementing, send the plan through the plan-reviewer agent:

1. Write the IMPLEMENTATION-PROMPT file
2. Use `/review-plan` to trigger review
3. The plan-reviewer (Opus) acts as a staff engineer:
   - Flags ambiguity
   - Identifies missing verification steps
   - Checks SPEC.md alignment
   - Questions unrealistic scope
   - Points out edge cases
4. Address ALL feedback before proceeding
5. Update the plan file with revisions

Don't skip review for non-trivial work. The 5 minutes spent reviewing saves hours
of rework.

## Progressive Implementation

Execute one phase at a time:
1. Read the plan
2. Implement the phase
3. Run verification for that phase
4. Commit
5. Update PROGRESS.md
6. Move to next phase

If a phase reveals the plan was wrong, STOP. Update the plan first. Don't improvise
your way through a broken plan.

## When to Plan vs When to Just Do It

Plan (write an IMPLEMENTATION-PROMPT):
- Multi-file changes
- New features
- Architectural changes
- Anything touching more than 2 modules

Just do it:
- Bug fixes with obvious cause
- Single-file refactors
- Documentation updates
- Config changes

## Gotchas

- Plans rot fast. If a plan is more than 2 sessions old and hasn't been started,
  re-review it before implementing. The codebase may have changed.
- Don't over-plan. The plan should be specific enough to implement without guessing
  but not so detailed that it's pseudo-code. Trust the implementer to make
  tactical decisions.
- Every step needs a verification. "Implement the auth module" is not a plan step.
  "Implement the auth module; verify: login endpoint returns 200 with valid creds
  and 401 with invalid" is a plan step.
- Keep plans in version control. They're documentation of decisions and intent.
