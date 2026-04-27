# `.claude/plans/`

Active implementation plans and work guidance. Anything in this folder is treated as **active work guidance** by `/start` (which lists all files generically) and `/review-plan` (which auto-detects plan files here).

## Convention

- **One file per plan.** Filename can be anything — `feature-X.md`, `IMPLEMENTATION-PROMPT-Y.md`, `phase-3-roadmap.md`. `/start` and `/review-plan` no longer use filename patterns; they list whatever is in this folder.
- **Tracked in git.** Plans are typically shared work-context documents.
- **Manual cleanup.** No auto-archive heuristics. When a plan is done, move it to `docs/archive/` or delete it. Stale plans in this folder will be surfaced by `/start` indefinitely until you clean them up.
- **Empty by default.** This `README.md` and `.gitkeep` are the only files initially. Add plans as work begins.

## See also

- `.claude/commands/start.md` — how `/start` lists files in this folder
- `.claude/commands/review-plan.md` — how `/review-plan` auto-detects plans here
- `docs/phases/` — Worclaude's own phase plans (separate from per-feature plans that live here)
