# Workflow Friction Decisions — Part 5

Continuing from `workflow-friction-decisions-4.md`. This part covers
the analysis cluster: `/review-plan`, `/techdebt`, `/upstream-check`.

---

## #5 — Analysis cluster: review-plan, techdebt, upstream-check

### Context

Three commands grouped loosely under "scan and report" — but on
inspection, each is its own beast:

- `/review-plan` — 19 lines, pure delegation to the `plan-reviewer`
  agent.
- `/techdebt` — 18 lines, repo-wide scan. Mixes diagnosis with "fix
  quick wins directly," violating the diagnostic vs remediation
  principle.
- `/upstream-check` — 137 lines, dogfooded against
  `anthropic-watch`. Cross-references upstream Claude Code releases
  against worclaude's own templates, registries, and hooks.

Audit found:

- `/techdebt` overlaps with `/review-changes` and `/refactor-clean`
  on scan logic — three commands at three scopes (diff, changed
  files, repo). The scope split doesn't earn three commands, and
  `/techdebt`'s mixed diagnostic + remediation model breaks the
  principle established in #2 and #3.
- `/review-plan` is functional but underspecified — no plan-file
  detection, no plan-existence gate, no auto-context, no output
  persistence.
- `/upstream-check` ships in two forms: a scaffolded template
  installed into user projects, and a dogfooded variant for worclaude
  maintenance. Both depend on `anthropic-watch`, a third-party feed
  that users would need to set up to make the command work.
  Anthropic-watch is undergoing a major change that will break the
  current setup.

### Decisions

**`/techdebt` — retired.**

Repo-wide scans against a healthy codebase produce noise; against an
unhealthy one, too many findings to act on. The active-scope
commands (`/review-changes` for diff, `/refactor-clean` for changed
files) cover the work that actually gets done. The "fix quick wins
directly" line conflicted with the diagnostic vs remediation
separation established in earlier decisions.

The concept of a focused, non-overlapping repo health check is worth
revisiting later — possibly integrated with `worclaude doctor` or
scoped to a single dimension (e.g. dead-code-only scan, test-coverage
gaps). Don't reinstate `/techdebt` as-is.

**`/review-plan` — kept and sharpened.**

The command's role (delegate to `plan-reviewer` agent) is correct —
agents are the right abstraction for staff-level review. But the
command does the minimum and earns less than the slot deserves. Four
concrete improvements:

1. **Plan-file detection.** Look for `PLAN-*.md`,
   `IMPLEMENTATION-*.md`, `PHASE-*-PROMPT.md` in the repo root. Pick
   the most recent. The command should not require the user to
   specify which file.

2. **Plan-existence gate.** If no plan file is found, refuse to
   dispatch and report: "No implementation plan found — write one
   first." Don't silently invoke the agent on nothing.

3. **Auto-context.** Pass `CLAUDE.md` and `SPEC.md` to the agent
   automatically. The current spec asks the agent to check "SPEC.md
   alignment" but doesn't pass the file — agent has to find it.

4. **Output persistence.** Write the agent's review to
   `.claude/scratch/last-plan-review.md`, mirroring the convention
   established for `/review-changes` in #3. Enables future
   downstream consumption (e.g. `/implement-plan`, if added later)
   and re-reading without rerunning the agent.

These four changes convert the command from a polite trigger phrase
into a real entry point with discoverability and downstream value.

**`/upstream-check` — retired in both forms.**

- **Scaffolded template** (`templates/commands/upstream-check.md`):
  shipped into every user project today. Drop. Worclaude must not
  ship features that require third-party infrastructure setup to
  function. The hidden contract — "to make this command work, you
  must run anthropic-watch" — is unacceptable.

- **Dogfooded variant** (`.claude/commands/upstream-check.md`):
  worclaude-internal maintenance command. Drop. About to break
  anyway due to the imminent anthropic-watch overhaul.

**Architecture notes for future revival.** When the upstream-watching
infrastructure stabilizes, the command is worth re-adding. The
current implementation is the most thoughtful command in the project
— the cross-reference logic against worclaude's own architecture
(`templates/agents/`, `src/data/agents.js`,
`src/data/agent-registry.js`, hook templates, backlog) is real value
exactly aligned with worclaude's purpose (reducing
Claude-Code-version-drift friction).

When revisiting:

- Make the feed source configurable, not hardcoded to one URL.
- Support multiple sources, with graceful fallback if any are
  unreachable.
- Consider statefulness (persist seen-item IDs) so weekly runs
  surface only new items rather than re-listing everything.
- Decide where the architectural cross-reference logic lives —
  embedded in the command spec (current) or split into a generator
  that consumes feed schemas. Current 137-line spec is project-
  specific by necessity; a more general design would scaffold
  project-specific cross-reference rules from a manifest.

### Principles established / reaffirmed

- **No third-party infrastructure dependencies in scaffolded
  features.** If a command shipped to user projects requires
  external services or feeds the user must set up, the command
  doesn't ship. This applies to all current and future
  scaffolded commands.

- **Diagnostic vs remediation separation reaffirmed.** Reaffirmed
  by retiring `/techdebt` (which mixed both). No exceptions for
  scope or codebase-level commands.

- **Commands earn their slot.** A command that does no more than
  trigger an agent should either be sharpened (auto-context, output
  persistence, gating) or replaced by direct agent invocation. Pure
  ceremonial commands clutter the surface without paying back.

- **Drop now, revive deliberately.** When external infrastructure is
  in flux, retire the dependent command rather than letting it rot.
  Architecture notes preserved here so the work isn't lost.

### Open / deferred items

- **Replacement for `/techdebt`'s role** — if a focused repo health
  check is wanted later, decide scope (single dimension vs broad)
  and integration point (own command vs subcommand of
  `worclaude doctor`).

- **`/upstream-check` revival** — pending anthropic-watch
  stabilization. Don't reinstate as-is; redesign per the architecture
  notes above.

- **`/review-plan` sharpening implementation** — the four
  improvements are small but coordinated. Implement together, not
  piecemeal, so the auto-context + output-persistence behaviors
  arrive consistent with each other.

**Status.** Decisions captured. Implementation pending.
