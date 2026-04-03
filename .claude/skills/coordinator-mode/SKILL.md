---
description: 'Multi-agent orchestration patterns: when to use coordinator mode, worker prompts, parallel execution'
when_to_use: 'When working with multiple agents or terminals in parallel, or when deciding how to break a large task into coordinated sub-tasks'
---

# Coordinator Mode

## When to Use Multi-Agent Coordination

Use coordinator patterns when:

- A task has independent research + implementation phases
- Multiple file areas can be worked on in parallel
- Verification should run alongside implementation
- You need to synthesize findings before directing follow-up work

Don't use coordinator patterns when:

- The task is small enough for one session
- Steps are strictly sequential with no parallelism
- The overhead of coordination exceeds the work itself

## Worker Prompt Best Practices

Workers cannot see your conversation. Every prompt must be self-contained:

**Good — synthesized spec:**
"Fix the null pointer in src/auth/validate.ts:42. The user field is undefined when
sessions expire but the token is still cached. Add a null check before user.id access.
Commit and report the hash."

**Bad — lazy delegation:**
"Based on your findings, fix the auth bug."
"The worker found an issue. Please fix it."

### Purpose Statement

Include a brief purpose so workers calibrate depth:

- "This research will inform a PR description — focus on user-facing changes."
- "I need this to plan an implementation — report file paths, line numbers, and type signatures."
- "This is a quick check before we merge — just verify the happy path."

## Continue vs Spawn Decision

| Situation                                             | Action                   | Why                                |
| ----------------------------------------------------- | ------------------------ | ---------------------------------- |
| Research explored exactly the files that need editing | Continue existing worker | Worker has files in context        |
| Research was broad, implementation is narrow          | Spawn fresh worker       | Avoid context noise                |
| Correcting a failure                                  | Continue existing worker | Worker has error context           |
| Verifying code a different worker wrote               | Spawn fresh worker       | Fresh eyes, no implementation bias |
| Wrong approach entirely                               | Spawn fresh worker       | Clean slate avoids anchoring       |

## Parallel Execution

**Parallelism is the primary advantage.** Launch independent workers concurrently:

- Read-only tasks (research) — run in parallel freely
- Write-heavy tasks (implementation) — one at a time per set of files
- Verification can sometimes run alongside implementation on different file areas

## Scratchpad Pattern

For durable cross-worker knowledge, use a shared scratchpad file:

- Workers write findings to a known location
- Other workers read from it when they need context
- Structure files by topic, not by worker

## Multi-Terminal Workflow

When running multiple Claude Code terminals (Boris Mode):

- Each terminal works on a separate feature branch or file area
- Use /sync on develop after merging to reconcile shared-state files
- Use /conflict-resolver if merges produce conflicts
- Shared-state files (PROGRESS.md, SPEC.md, package.json version) are ONLY modified on develop
