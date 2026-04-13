---
description: "Capture a correction or convention as a persistent learning"
---

The user wants to capture a learning from this session.

When invoked with arguments, use them as the learning to capture.
Example: `/learn Always use conventional commits for this project`

If no arguments provided, ask the user what they want to remember.

Format it as a [LEARN] block:

[LEARN] Category: One-line rule description
Mistake: What went wrong (optional)
Correction: What should happen instead (optional)

Write this to `.claude/learnings/{category-slug}.md` with YAML frontmatter:
- created: today's date (YYYY-MM-DD)
- category: from the [LEARN] block
- project: current project name (from package.json name field, or directory name)
- times_applied: 0

Update `.claude/learnings/index.json` to include the new entry.
If index.json doesn't exist, create it with `{ "learnings": [] }`.

Confirm to the user what was saved and where.

## Trigger Phrases
- "remember this"
- "learn this"
- "save this rule"
- "capture this correction"
