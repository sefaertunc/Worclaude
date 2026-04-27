---
description: "Capture a correction or convention as a persistent learning"
---

The user wants to capture a learning from this session.

When invoked with arguments, use them as the learning to capture.
Example: `/learn Always use conventional commits for this project`

If no arguments provided, ask the user what they want to remember.

## Format

A learning is a `[LEARN]` block:

```
[LEARN] Category: One-line rule description
Mistake: What went wrong (optional)
Correction: What should happen instead (optional)
```

Write to `.claude/learnings/{category-slug}.md` with YAML frontmatter:

```yaml
---
created: 2026-04-27   # today's date (YYYY-MM-DD)
category: <from the [LEARN] block>
project: <package.json name, or directory name as fallback>
---
```

**Do NOT add a `times_applied` field.** The auto-capture hook never
increments it; the field would be a lie. Removed in Phase 2 (2026-04).

After writing, **regenerate `.claude/learnings/index.json` from the
directory contents** — never hand-maintain it. The regeneration walks
`.claude/learnings/*.md`, parses each frontmatter, and writes the
canonical `{ "learnings": [{file, category, created}, ...] }` index.
This guarantees the index never drifts from the files on disk.

Confirm to the user what was saved and where.

## When to use `/learn` vs other memory layers

The system has multiple memory layers; pick the right one for the
trigger:

| Trigger                                    | Lands in                                | Audience            |
| ------------------------------------------ | --------------------------------------- | ------------------- |
| Plain conversation ("user pushes back")    | Claude Code's auto-memory (autonomous)  | Personal, machine-local |
| `/learn` or `[LEARN]` marker               | `.claude/learnings/`                    | **Team-relevant**   |
| `/update-claude-md` (later promotion path) | `CLAUDE.md`                             | Team, every session |

**`/learn` is the team signal.** Use it when the rule belongs to the
project, not your personal preferences. Examples:

- ✅ "We always use pnpm in this repo, not npm" → `/learn`
- ✅ "The conflict-resolver must not push" → `/learn`
- ❌ "I prefer terse responses" → leave to auto-memory; don't `/learn`
- ❌ "User pushes back on overengineering" → leave to auto-memory

If the rule starts personal but recurs across sessions, `/update-claude-md`
can later promote a stable learning to CLAUDE.md.

## Correction-triggered semi-auto path

When `correction-detect.cjs` (UserPromptSubmit hook) flags a correction in
the user's prompt, the hook emits a hint suggesting Claude propose a
learning. Claude SHOULD then:

1. Draft a one-line generalizable rule based on the correction
2. Prompt the user via `AskUserQuestion`:

   ```
   Question: "You corrected me: '<short paraphrase>'.
              Proposed learning: '<concrete rule>'.
              Capture as team learning?"

   - yes              — save as proposed
   - yes, let me edit — show the text, I'll refine before saving
   - no               — drop it
   ```

3. On `yes` / `yes-edit` → emit a `[LEARN]` block with the agreed text.
   The Stop hook (`learn-capture.cjs`) persists it to
   `.claude/learnings/` automatically.
4. On `no` → no action. Don't re-prompt for the same correction.

This path is **targeted, not blanket**: it only fires when the
correction-detect regex matches. Random turns don't get a "did you
learn something?" prompt — that would be noise.

## Trigger Phrases
- "remember this"
- "learn this"
- "save this rule"
- "capture this correction"
