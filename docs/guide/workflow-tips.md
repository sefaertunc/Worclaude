# Workflow Tips

After Worclaude has scaffolded your project, these are the best practices for getting the most out of Claude Code. These tips are drawn from Boris Cherny's 53 recommendations and the patterns built into the Worclaude workflow.

## Launch Patterns

### The Standard Launch

```bash
claude --worktree --tmux
```

The two flags serve distinct purposes:

- `--worktree` creates a git worktree so agents like code-simplifier, test-writer, and bug-fixer can work in an isolated copy of your repository. This prevents conflicts when multiple agents run in parallel.
- `--tmux` runs Claude in a tmux session. You can detach (`Ctrl-B D`) and come back later without losing your session. Claude keeps working even when you are not watching.

### Named Sessions

When you know exactly what you are working on, name the session:

```bash
claude --worktree --tmux --name "auth-refactor"
```

The name appears in the statusline and helps you track which session is doing what. This is especially useful when running multiple Claude instances in parallel.

### Parallel Sessions

You can run multiple Claude Code sessions at the same time. Each one should have its own worktree:

```bash
# Terminal 1
claude --worktree --tmux --name "auth-refactor"

# Terminal 2
claude --worktree --tmux --name "api-tests"
```

Each session gets its own git worktree, so changes in one session do not interfere with the other. When both are done, you merge the branches.

Use tmux to manage sessions: `tmux ls` to list them, `tmux attach -t <name>` to reattach.

## The Session Lifecycle

Worclaude installs a session lifecycle through slash commands. The pattern is:

### Starting a Session

```
> /start
```

This reads `docs/spec/PROGRESS.md` and reports what was last completed, what is next, and any blockers. It gives Claude (and you) full context on where things stand.

### Working During a Session

Work on one task at a time. After each meaningful chunk of work:

1. Run tests to verify nothing is broken
2. Commit the working increment
3. Move to the next task

If you need side work done (tests, code cleanup, documentation), dispatch it to a subagent rather than context-switching in your main session. The universal agents are designed for this -- code-simplifier runs in its own worktree, test-writer runs in its own worktree, and build-validator can check your build without interrupting your flow.

### Reviewing Plans

Before implementing anything complex, write a plan and review it:

```
> /review-plan
```

This sends your implementation plan to the plan-reviewer agent (Opus model), which acts as a staff engineer. It will challenge assumptions, flag ambiguity, check for missing verification steps, and ensure the plan aligns with your `SPEC.md`. Address all feedback before proceeding.

### Ending a Session

```
> /end
```

This updates `docs/spec/PROGRESS.md` with what was completed, what is in progress, any blockers, and next steps. If you are ending mid-task, it also writes a handoff document at `docs/handoffs/HANDOFF_{date}.md` so a fresh session can pick up exactly where you left off.

### Committing and Creating PRs

```
> /commit-push-pr
```

This stages all changes, writes a conventional commit message, pushes to the current branch, and creates a pull request using `gh pr create`. It handles the entire git workflow in one command.

## Context Management

### When to Compact

Claude Code has a finite context window. As you work, the context fills up. When it gets above 70-80%, run:

```
> /compact-safe
```

This compresses the context. The PostCompact hook automatically re-reads `CLAUDE.md` and `PROGRESS.md` after compaction, so Claude stays oriented.

### When to Clear

If you are switching to a completely different task, it is often better to start a fresh session rather than compacting. Compaction preserves a summary of previous work, which can add noise if you are doing something unrelated.

### Subagent Context Hygiene

Heavy tasks like writing tests, refactoring code, or reviewing documentation should go to subagents. This keeps your main session's context clean and focused on the primary task. The agents installed by Worclaude (test-writer, code-simplifier, refactorer, doc-writer) are all configured for this pattern.

## Effort and Output

### Default Settings

Worclaude configures Claude Code with:

- **High effort** as the default. Claude works thoroughly on every task.
- **Concise output** as the default. Claude gives you what you need without over-explaining.

### When to Escalate

For particularly complex tasks (architectural decisions, tricky debugging, performance optimization), escalate to maximum effort:

```
> /effort max
```

This tells Claude to spend more time thinking before responding. Switch back to high when the complex work is done.

### When to Switch Output Style

If you are exploring unfamiliar territory (a new library, an inherited codebase, an architecture you do not know well), switch to explanatory output:

```
> /output explanatory
```

Claude will explain its reasoning and provide more context. Switch back to concise when you are comfortable.

## Prompting Best Practices

### Be Specific

Instead of "fix the login bug", try "the login endpoint returns 500 when the email contains a plus sign -- the issue is likely in the email validation regex in `src/auth/validate.js`". The more context you give, the better the result.

### Challenge Claude

If Claude gives you a solution that feels mediocre, push back. Say "this approach has too many edge cases, find a simpler design" or "this is over-engineered, simplify it". Claude responds well to direct feedback.

### Demand Elegance

Boris Cherny's tip: do not accept the first solution that works. If it feels clunky, tell Claude to scrap it and implement it elegantly. The seventh Critical Rule in your `CLAUDE.md` reinforces this: "Mediocre fix -> scrap it, implement elegantly."

### Write Detailed Specs

The more detailed your `SPEC.md` is, the better Claude performs. Vague requirements lead to vague implementations. Specific requirements with clear acceptance criteria lead to working code on the first pass.

## CLAUDE.md Maintenance

### Keep It Lean

Your `CLAUDE.md` should stay under 50 lines. This is a hard rule from Boris Cherny's workflow. Claude reads it at the start of every interaction and after every compaction. If it is bloated, Claude wastes context on information it does not need right now.

### Progressive Disclosure

Detailed knowledge belongs in skills, not in `CLAUDE.md`. Your `CLAUDE.md` should point to skills:

```markdown
## Skills (read on demand, not upfront)
See `.claude/skills/` — load only what's relevant
```

Claude loads the right skill file when it needs it, rather than carrying all your project's knowledge in every interaction.

### Self-Healing

When Claude makes the same mistake twice, update `CLAUDE.md`. Add the lesson to the Gotchas section or the Critical Rules section. Use `/update-claude-md` to have Claude propose the update based on what happened during the session:

```
> /update-claude-md
```

This reviews the session's work, identifies patterns that should be documented, and shows you a diff before applying changes.

### Regular Verification

Periodically run `/verify` to make sure your build, tests, linter, and type checker are all passing:

```
> /verify
```

The verify command runs your full pipeline and reports any failures. Do not proceed past a red build.

## The Full Pipeline

The workflow installed by Worclaude follows a pipeline: **Design -> Review -> Execute -> Quality -> Verify -> PR**.

1. **Design** -- Write a plan or spec for what you are building
2. **Review** -- Run `/review-plan` to have the plan-reviewer agent critique it
3. **Execute** -- Implement the plan, one task at a time
4. **Quality** -- Dispatch code-simplifier and test-writer to clean up and test
5. **Verify** -- Run `/verify` to confirm everything passes
6. **PR** -- Run `/commit-push-pr` to ship it

This pipeline is not mandatory, but it produces consistently high-quality results. For small changes, you can skip straight from design to execute. For anything complex, the full pipeline pays for itself.

## Next Steps

- [Getting Started](/guide/getting-started) -- Full setup walkthrough
- [Existing Projects](/guide/existing-projects) -- How smart merge works
- [Upgrading](/guide/upgrading) -- Keeping your workflow current
- [Introduction](/guide/introduction) -- Overview of all Worclaude components
