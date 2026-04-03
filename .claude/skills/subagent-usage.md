---
description: "When to use subagents, how many, context hygiene, worktree isolation patterns"
---

# Subagent Usage

## What Subagents Are

Subagents are separate Claude instances spawned from your main session. They have
their own context window, execute independently, and return results to the main
session. Your main context stays clean.

## When Subagents Help

Tasks that benefit from subagents:
- **Testing**: writing tests for code you just implemented (test-writer agent)
- **Code review**: reviewing your own changes for quality (code-simplifier agent)
- **Research**: reading many files to answer a specific question
- **Parallel work**: running verification while you continue designing
- **Build validation**: checking that everything compiles and passes (build-validator)
- **File generation**: creating boilerplate, configs, or template files

The common thread: these tasks require context (reading files, understanding code)
but that context doesn't need to persist in your main session.

## When NOT to Use Subagents

- Tasks requiring back-and-forth with the user (subagents can't interact with users)
- Tasks where the result needs deep integration with your current reasoning
- Very small tasks (the overhead of spawning isn't worth it)
- Tasks that depend on conversation history the subagent doesn't have

## Context Hygiene

Your main session has limited context. Every file you read, every long output you
generate, consumes context. Subagents let you offload this:

Instead of:
1. Read 10 test files to understand patterns (consumes context)
2. Write new tests (uses that context)
3. Continue main work (context is now polluted with test details)

Do:
1. Spawn test-writer subagent with: "write tests for src/merger.js following
   patterns in tests/core/"
2. Continue main work while subagent works
3. Subagent returns: "wrote 3 test files, all passing"
4. Main context stays clean

## Parallel vs Sequential Subagents

**Parallel**: when tasks are independent.
- Run test-writer and code-simplifier on different parts of the code simultaneously
- Run build-validator while continuing implementation

**Sequential**: when tasks depend on each other.
- Run code-simplifier first, then test-writer on the simplified code
- Run security-reviewer first, then fix the issues it found

Don't spawn more than 2-3 parallel subagents. Each consumes resources and
coordination overhead grows.

## Worktree Isolation

Some agents use `git worktree` to make changes without affecting your working tree:

How it works:
1. Agent creates a worktree from your current branch
2. Makes changes in the worktree (isolated from your files)
3. Commits changes
4. You merge or cherry-pick the results

Agents with worktree isolation: code-simplifier, test-writer, verify-app, ci-fixer,
bug-fixer, refactorer, doc-writer.

Benefits:
- Agent's changes don't conflict with your uncommitted work
- You can review agent changes before merging
- If the agent breaks something, it's isolated

## Giving Subagents Good Instructions

Subagents start with zero context. They don't know what you've been doing. Give them:

1. **The specific task**: "Write unit tests for the merge function in src/core/merger.js"
2. **Where to look**: "Follow patterns from tests/core/detector.test.js"
3. **Constraints**: "Use Vitest, not Jest. Mock fs-extra, not the actual filesystem."
4. **Success criteria**: "All tests should pass. Cover happy path, error cases,
   and the three-way merge edge case."

Bad instruction: "Write some tests"
Good instruction: "Write unit tests for detectScenario() in src/core/detector.js.
Test all three scenarios: fresh (no .claude/), existing (.claude/ but no meta),
upgrade (meta exists). Mock the filesystem. Use Vitest."

## Gotchas

- Subagents don't see your uncommitted changes unless they share the same working
  directory. If you need them to see your changes, commit first or use the same
  worktree.
- Subagent output is returned to your context. If a subagent generates a huge report,
  that report consumes your context. Ask for concise results.
- Don't use subagents for tasks that require judgment about the overall session
  direction. They lack the conversational context to make those calls.
- Worktree-based agents need a clean git state to create the worktree. Commit or
  stash before spawning them.
- If a subagent fails, don't automatically retry. Understand why it failed first.
  The same instructions will produce the same failure.
