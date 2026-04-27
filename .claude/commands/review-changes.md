---
description: "Code review — reports findings as prioritized table and writes a scratch artifact"
---

Review changed code for reuse, quality, and efficiency.

CRITICAL: This is a READ-ONLY review of source files. You MUST NOT edit
source files. You MUST NOT make any commits. You MUST NOT stage changes.
Only analyze, report, and write **one** scratch artifact (see step 4).

## Process

1. Read recent changes (`git diff HEAD~1` or staged changes).
2. Check for:
   - Duplicated code or missed reuse opportunities
   - Unnecessary complexity or abstraction
   - Inconsistency with project patterns
   - CLAUDE.md compliance issues
3. Report findings as a prioritized table to the user:

   ```
   | Finding | Category | Action |
   |---------|----------|--------|
   | [what]  | [type]   | Fix / Skip — [reason] |
   ```

4. **Write the findings to `.claude/scratch/last-review.md`** with SHA
   frontmatter so `/refactor-clean` can pick them up without re-analyzing.

   ```markdown
   ---
   created: <YYYY-MM-DDTHH:MM:SSZ>
   sha: <git rev-parse HEAD>
   command: /review-changes
   ---

   # Findings

   | Finding | Category | Action |
   |---------|----------|--------|
   | ...     | ...      | ...    |
   ```

   Capture the SHA via `git rev-parse HEAD` at the moment of writing. If
   `.claude/scratch/last-review.md` already exists, **overwrite it** —
   only the most recent review is consumed.

   Writing this file is the ONLY filesystem mutation `/review-changes`
   performs. Source files remain untouched.

The user will decide which findings to act on. They can run
`/refactor-clean` next; it will read the scratch file and use the
findings as a work plan (skipping its own analysis when the SHA matches).

## Trigger Phrases
- "review my changes"
- "what did I change"
- "code review"
