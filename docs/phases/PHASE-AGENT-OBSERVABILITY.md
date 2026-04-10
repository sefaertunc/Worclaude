# Phase: Agent Usage Observability in Session Summaries

## Branch

Create `feat/agent-observability` from `develop`.

## Context

Session summaries (written by `/commit-push-pr` and `/end`) currently capture task-level info — what was done, files modified, notes. They do NOT capture which agents were invoked, which slash commands were used, or whether verification passed. This makes it impossible to observe whether Claude Code is actually following the scaffolded workflow.

## Files to Edit

1. `templates/commands/commit-push-pr.md`
2. `templates/commands/end.md`

## Changes

In **both templates**, add a `## Workflow Observability` section as the **last section** inside the session summary format.

### New section to add (exact format):

```markdown
## Workflow Observability

- **Agents invoked:** {ALL agents used this session — explicit @agent calls AND agents invoked implicitly by commands like /verify, /review-plan, /refactor-clean. Write "none" if no agents were used.}
- **Commands used:** {all slash commands run earlier in this session, e.g. /start, /verify, /refactor-clean. Do NOT include the current /commit-push-pr or /end that is writing this summary. Write "none" if no other commands were used.}
- **Verification result:** {if /verify was run: passed/failed with brief summary; otherwise "not run".}
```

### In `commit-push-pr.md`:

- Add the new section inside the "Content format" code block, after `## Notes for Next Session`
- The section appears in both the feature branch and develop flows (it's the same session summary format used by both)

### In `end.md`:

- Add the new section to step 3's session summary description, after the note about marking task as "IN PROGRESS"

## Rules

- Do NOT change any existing behavior or content in these templates
- Do NOT reformat or restructure existing sections
- The new section is self-reported by Claude Code — it reflects what it did during the session. Advisory, not enforced.
- Keep all existing formatting conventions (indentation, markdown style) consistent

## Validation

```bash
npm test && npm run lint
```

## PR

Target `develop`. Title: `feat: add agent usage tracking to session summaries`
