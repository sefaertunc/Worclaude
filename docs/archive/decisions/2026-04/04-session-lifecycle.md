# Workflow Friction Decisions — Part 4

Continuing from `workflow-friction-decisions-3.md`. This part covers
the session lifecycle commands: `/status`, `/end`, `/compact-safe`.
(`/start` was discussed earlier in the conversation but is not under
revision in this part.)

---

## #4 — Session lifecycle: status, end, compact-safe

### Context

Three commands handle different exit pressures during a session:

- `/status` — read-only state report
- `/compact-safe` — context compression with claimed safety
- `/end` — mid-task handoff

Audit found:

- `/status` is under-specified (10 lines, no concrete behavior) and
  overlaps with `/start` + the SessionStart hook.
- `/compact-safe`'s name promises "safety checks," but the spec only
  runs `/compact` and recaps afterward — no actual pre-compaction
  guards.
- `/end` writes both a handoff file and a session summary, with
  overlapping content. Surface-level duplication.
- `/end` always commits AND pushes a WIP commit, with no consent
  gate for the push.

### Decisions

**`/status` — retired.**

Information it claims to report is either covered by `/start` (cold-start
signals) or recoverable mid-session via plain-English query. The spec
is a placeholder, not a designed command. Removing it shrinks surface
area without losing capability.

**`/end` — writes both session summary and handoff, but with tightened
formats so they stop overlapping.**

The two artifacts are NOT duplicates — they serve complementary
purposes with different lifecycles:

|           | Session summary                                  | Handoff                                     |
| --------- | ------------------------------------------------ | ------------------------------------------- |
| Direction | Backward-looking (what happened)                 | Forward-looking (what's next)               |
| Lifecycle | Permanent audit trail in `.claude/sessions/`     | Transient pickup record in `docs/handoffs/` |
| Consumer  | `/start` drift detection, observability, history | Future-me resuming the task                 |
| Trigger   | Every session-ending event                       | Only mid-task stops                         |

`/start` relies on session summary timestamps for drift detection —
removing them from `/end` breaks that mechanism for any session not
ended with `/commit-push-pr`. Both must be preserved.

**The fix is format discipline, not artifact removal:**

- **Session summary** carries backward audit only:
  - Branch, task description
  - Completed (what got done)
  - Files modified
  - Workflow Observability (agents, commands, verification)
  - Status: `DONE` | `IN_PROGRESS`

- **Handoff** carries forward continuation only:
  - What's left to do
  - Decisions made that the next session needs to know
  - Where to pick up (specific file, function, line)
  - Blockers / open questions
  - Worktree location (if applicable)

No "what got done" in the handoff. No "what's left" in the session
summary. Each artifact stays in its own lifecycle.

**`/end` — no auto-push. Consent gated by `AskUserQuestion`.**

Committing is fine — `/end` is an explicit user invocation, satisfying
the saved feedback rule ("commit/push/PR only when explicitly
invoked"). But push is a separate operation that affects shared state
(remote) and deserves its own consent.

After committing the WIP, prompt:

```
WIP commit created. Push to remote?
- yes — push for cross-machine continuity
- no  — keep handoff local
```

Uses `AskUserQuestion` per the convention from #1. Preserves the
cross-machine handoff use case (yes-branch) without forcing it as
default (no-branch).

**`/compact-safe` — adds real pre-compaction safety checks.**

Today the spec runs `/compact` then recaps. The "safety" is
post-compaction — too late. Real safety must be pre-compaction:

- **Uncommitted changes** — warn, offer to commit/stash first.
  Compacting with uncommitted changes loses the context for why those
  edits exist.
- **In-flight work signals** — recent test failures, recently-failed
  builds, mid-implementation TODOs in changed files. Surface these as
  "you might want to resolve before compacting."
- **Recent destructive operations** — if recent tool calls included
  `rm`, `git reset --hard`, force pushes, etc., warn that compaction
  will lose the context for any undo decision.
- **Hook verification** — confirm the PostCompact hook is configured
  before invoking `/compact`. If missing, compaction is genuinely
  unsafe (CLAUDE.md / PROGRESS.md won't reload).

The post-compaction recap stays as a final confirmation step, but it's
not where safety lives.

### Principles established

- **Audit trail consistency.** Every session-ending event writes a
  session summary. Drift detection in `/start` depends on this; mid-task
  ends must not be invisible.

- **Backward vs forward artifacts.** Session summaries record history
  (what happened); handoffs record continuation (what's next). Two
  artifacts, two lifecycles, complementary — not duplicate. The
  contract is: **content discipline by direction, not by file
  consolidation**.

- **Consent for shared-state side effects.** Local commits during an
  explicit command invocation are fine; remote pushes deserve their own
  prompt. The two operations have different blast radii and should
  have different consent gates.

- **Names must match behavior.** A command called `/compact-safe` must
  actually be safe. Today the name oversells. Earn the name with real
  pre-action checks, or rename. (Decision: earn the name.)

### Open / deferred items

- **Implementation of session summary / handoff format split.** The
  current `/end` spec writes both; the format strings need updating to
  reflect the backward/forward division. Small edit, but coordinate with
  `/commit-push-pr`'s session summary template so they share the same
  backward-audit format.

- **`/compact-safe` safety check ordering.** Decide whether the four
  checks are blocking (refuse to compact until resolved) or advisory
  (warn but proceed if user confirms). Recommendation pending: probably
  uncommitted-changes is blocking-with-override, others are advisory.

- **`/start` updates.** Once `/status` is retired, `/start` may need to
  inherit the trigger phrases ("what's the status", "where am I",
  "what am I working on") so users don't lose discoverability. Confirm
  during implementation.

**Status.** Decisions captured. Implementation pending.
