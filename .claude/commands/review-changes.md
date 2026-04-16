---
description: "Code review — reports findings as prioritized table without modifying files"
---

Review changed code for reuse, quality, and efficiency.

CRITICAL: This is a READ-ONLY review. You MUST NOT edit any files.
You MUST NOT make any commits. You MUST NOT stage changes.
Only analyze and report.

1. Read recent changes (git diff HEAD~1 or staged changes)
2. Check for:
   - Duplicated code or missed reuse opportunities
   - Unnecessary complexity or abstraction
   - Inconsistency with project patterns
   - CLAUDE.md compliance issues
3. Report findings as a prioritized table:

| Finding | Category | Action |
|---------|----------|--------|
| [what]  | [type]   | Fix / Skip — [reason] |

The user will decide which findings to act on and apply fixes themselves.
Do NOT apply any fixes. Do NOT touch any files. REPORT ONLY.

## Trigger Phrases
- "review my changes"
- "what did I change"
- "code review"
