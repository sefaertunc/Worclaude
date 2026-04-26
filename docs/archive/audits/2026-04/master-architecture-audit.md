# Master Architecture Audit — Worclaude

**Audit date:** 2026-04-26
**Worclaude version:** 2.8.0
**Scope:** Comprehensive review across 7 layers — individual commands, command-to-command relations, contextual fit, project scope, skill relations, business purpose, and cross-cutting concerns.

This report is the deep diagnostic that complements the seven incremental friction-decision documents (`docs/workflow-friction-decisions.md` through `-7.md`). Where those captured decisions per command, this report identifies findings the friction audit did not surface — drift, orphans, hidden contracts, naming collisions, and architectural gaps.

---

## 0. Executive summary

**Overall health: strong.** Worclaude has a coherent architecture with clear separation between layers, principled command design, well-tuned model assignments, and explicit invariants documented in SPEC.md. The seven friction-decision documents already address the major refinement opportunities at the command level.

**This audit's net-new findings (in priority order):**

1. **CLAUDE.md is stale on test counts** — claims "497 tests, 31 files" but reality is 804/58. No mechanism keeps it fresh.
2. **Memory naming collision** — CLAUDE.md labels `.claude/learnings/` as "Auto-memory" but Claude Code's actual auto-memory is at `~/.claude/projects/<proj>/memory/`. Two different things, same name. Will confuse users.
3. **`agent-routing.md` is hand-maintained and drifting** — lists 11 agents; project has 14 installed (build-fixer, e2e-runner, upstream-watcher missing from routing).
4. **`ci-fixer` dangling reference** — `git-conventions.md` line 101 cites it, but no agent file exists for it in this project.
5. **Hook script contracts are undocumented** — 4 hooks, 8 events, but no spec for inputs/outputs/exit-code semantics.
6. **`e2e-runner` agent is orphaned** — installed, but no command invokes it. Reachable only by manual spawn.
7. **Critical Rule #10 misses a third file** — "always add new agents to both agents.js AND agent-registry.js" — but adding an agent ALSO requires updating the routing skill (or accepting drift).
8. **Verification commands triple-sourced** — `/verify` spec, CLAUDE.md `## Verification` section, and `npm run prepublishOnly` all say the same thing. Three sources of truth.
9. **CLAUDE.md is trending toward the WARN threshold** — currently 133 lines; doctor warns at 150; no automated promotion-to-skills mechanism.
10. **Several skills are unbound to any command** — context-management, coordinator-mode, frontend-design-system, prompt-engineering, review-and-handoff, testing. They load on-demand via Claude's judgment, but discoverability is uneven.

**What's healthy and worth preserving:**

- Diagnostic-vs-remediation separation is enforced (mostly).
- Single-responsibility per command is a clean design choice.
- Worktree isolation for write-active agents matches the threat model.
- Per-PR version bump declarations create real release authority.
- Hook profile (`minimal` / `standard` / `strict`) is a graceful escape valve.
- All 6 universal agents are present; selective optional agents matches CLI-tool scope.

---

## 1. Commands individually — deltas beyond the friction audit

The friction audit captured the major decisions per command. These are the additional per-command findings that surfaced during this deeper pass.

### `/start`

- **Already addressed in #7:** plans folder, SHA-based drift, scratch surfacing.
- **New finding:** the SessionStart hook (per `settings.json`) loads CLAUDE.md, PROGRESS.md, and most-recent session summary. `/start` then duplicates some of this. The boundary between hook-loaded and command-loaded context isn't documented anywhere — leaving room for future divergence as either is edited.

### `/sync`

- **Already addressed in #1:** require Version-bump declaration upstream.
- **New finding (drift gap):** `/sync` updates PROGRESS.md and CHANGELOG.md but does NOT update CLAUDE.md's `## Tech Stack` (test counts, file counts). After test additions, CLAUDE.md goes stale until someone manually fixes it. The current 497→804 drift is a live example — eight releases of test growth, no metric refresh.
- **Recommendation:** `/sync` should detect tech-stack drift in CLAUDE.md and propose updates as part of the release flow. Or auto-recompute the test/file count line from `vitest --run --reporter=json` output.

### `/verify`

- **Already addressed in #2:** scope locked, read-only contract, no e2e command.
- **New finding (triple-source):** the canonical "tests + lint" commands appear in three places:
  - `/verify` spec
  - `CLAUDE.md` line 101 (`npm test && npm run lint`)
  - `package.json` `prepublishOnly` script
- All three would need updating in lockstep if the canonical commands change. Single source of truth would be `package.json` — `/verify` and CLAUDE.md should reference it, not restate.

### `/commit-push-pr`

- **Already addressed in #1:** require version-bump prompt.
- **New finding:** the session-summary template in `/commit-push-pr` (lines 22–41) hardcodes the format. The same format is referenced by `/end` (per #4 decisions). After format split (backward-only summary vs forward-only handoff), both files need updating in lockstep. Template centralization opportunity.

### `/setup`

- **Already addressed in #6:** leave alone, rigidity earned.
- **New finding:** `/setup` is the only command with explicit tool-use whitelisting (between SCAN and WRITE phases). This is a pattern the others _could_ benefit from — but the maintenance cost is real. Worth noting as a design-philosophy outlier that's correctly scoped: `/setup` writes to six files irreversibly, so the rigidity is earned. Other commands don't justify this discipline.

### `/upstream-check`

- **Already addressed in #5:** retired (both forms).
- **Confirmation found in this audit:** the `upstream-watcher` agent file exists in `.claude/agents/`. After retiring `/upstream-check`, the agent is orphaned (no command invokes it). Decision options: retire the agent too, or keep it for manual `@upstream-watcher` invocation. Recommend retiring the agent alongside the command — they live and die together.

### `/test-coverage`

- **Already addressed in #7:** confirm-then-delegate, threshold-aware.
- **New finding:** the command's prioritization heuristics ("HIGH: untested error handling, auth logic" etc.) are subjective. With no concrete signal, two runs can classify the same code differently. Worth noting but probably not worth fixing — judgment-based prioritization is appropriate for this kind of audit work.

### `/learn`

- **Already addressed in #6:** remove dead `times_applied`, regenerate index, semi-auto via correction-trigger.
- **New finding (CLAUDE.md collision):** CLAUDE.md line 58 says `Auto-memory: .claude/learnings/`. But Claude Code's actual auto-memory is at `~/.claude/projects/<project>/memory/`. Worclaude's hook-captured learnings are NOT what Claude Code calls auto-memory. **The label is wrong.** This will confuse users: when they read about "auto memory" in Claude Code docs, they'll expect `.claude/learnings/` to behave like that — it doesn't (different location, different lifecycle, different consumer).
- **Recommendation:** rename the CLAUDE.md section to "Captured Learnings" or "Hook-captured memory." Reserve "Auto memory" for Claude Code's built-in feature.

### `/conflict-resolver`

- **Already addressed in #6:** step 5 → `/verify`, step 3 → AskUserQuestion.
- **New finding:** none. Already well-scoped.

---

## 2. Inter-command relations — beyond the handoffs already documented

The friction audit established several handoffs (`/review-changes` → `/refactor-clean` via scratch, `/build-fix` → `bug-fixer` via escalation, `/refactor-clean` → `/test-coverage` via coverage-flagged scratch). This pass found additional relational gaps.

### Implicit dependency on the Stop hook

`/end` and `/commit-push-pr` rely on the **Stop hook (`learn-capture.cjs`)** firing after they complete to persist any `[LEARN]` blocks in the transcript. Neither command documents this dependency. If the Stop hook fails or is disabled (`WORCLAUDE_HOOK_PROFILE=minimal`), learnings disappear silently.

**Recommendation:** document the hook dependency in both command specs. Optionally: have `/end` check the hook profile and warn if `learn-capture` is disabled and a `[LEARN]` block was emitted in the session.

### `/start` reads from artifacts written by 4+ commands

`/start` consumes outputs from:

- `/end` (handoff files)
- `/commit-push-pr` (session summaries via SessionStart hook)
- `/review-changes` (last-review.md, per #3 decision)
- `/review-plan` (last-plan-review.md, per #5 decision)
- `/refactor-clean` (coverage-flagged.md, per #7 decision)
- `.claude/plans/` files (per #7 decision)

This makes `/start` a multi-input aggregator with no formal contract. Future additions to scratch artifacts will need `/start` updates. **Risk:** silent omission — adding a scratch file without updating `/start` means it stays unsurfaced.

**Recommendation:** define `.claude/scratch/` as a single discoverable location. `/start` lists all files in it (any matching SHA-key), surfaces them generically. New scratch artifacts auto-discover.

### Trigger-phrase analysis (verified — no overlaps)

Cross-referenced all 18 commands' trigger phrases. **No duplicates.** Routing is unambiguous. (Exception: after `/status` retirement, its phrases inherit to `/start` per #4 — confirmed no conflict with `/start`'s existing phrases.)

### Background agents create lifecycle ambiguity

Three agents are configured with `background: true`:

- `build-validator` (Haiku, no isolation)
- `verify-app` (Sonnet, worktree)
- `e2e-runner` (Sonnet, worktree)

Background agents fire and return to user later. **No command spec documents what happens if a background agent is mid-run when another command fires.** What if `/build-validator` is still running and the user invokes `/commit-push-pr`? Are operations serialized? Are there race conditions on the worktree?

**Recommendation:** investigate Claude Code's actual background-agent semantics, document the contract in the routing skill or per-command specs.

---

## 3. Contextual fit

### CLAUDE.md is the project's contextual anchor — and it's drifting

Beyond the test-count drift, CLAUDE.md has several subtler issues:

- **Line 91:** "Routing metadata for all 26 agents (used by generator)." Accurate per templates, but the project has 14 installed. The line implies the generator wires everything; in reality, `agent-routing.md` is hand-maintained and lists only 11 in this project.
- **Critical Rule #10:** "Always add new agents to both `agents.js` AND `agent-registry.js`." Misses a third place — the `agent-routing.md` skill. Adding an agent requires updates in **3 places**, not 2.
- **Line 19 + 35:** test counts duplicated in two places, both stale.
- **Line 58:** "Auto-memory" naming collision with Claude Code's built-in feature.
- **Memory Architecture section** (lines 56–60): doesn't mention `.claude/sessions/`, `.claude/scratch/`, `.claude/plans/`, or the planned five-layer system from #6. Currently lists only learnings + CLAUDE.md.

### Session protocol coherence

Lines 50–54 describe the session protocol cleanly. But after the friction-audit changes:

- `/end` no longer auto-pushes (#4) — protocol should reflect the AskUserQuestion gate.
- `/conflict-resolver` step 5 changes (#6) — invisible to the protocol section.
- `/commit-push-pr` will require version bump (#1) — protocol should mention it.

The protocol is a high-traffic section that needs updating in lockstep with command changes. No mechanism enforces this.

### CLAUDE.md size

133 lines. Doctor's WARN at 150. **17 lines of headroom.** The friction-audit changes will add at least 3–5 lines to make sense of the new conventions (plans folder, scratch artifacts). Trending the wrong direction without a promotion-to-skills bridge.

---

## 4. Project scope alignment

### What worclaude installs (verified)

The full scaffolded surface in user projects:

- 18 universal slash commands (verified)
- 26 agents in templates (6 universal + 20 optional, verified)
- 16 skills (verified by directory listing)
- 4 hook scripts wired to 8 events
- settings.json with permissions + hook configuration
- workflow-meta.json for drift detection
- CLAUDE.md, PROGRESS.md, SPEC.md
- `.claude/sessions/`, `.claude/learnings/`, `.claude/cache/`, `.claude/workflow-ref/`

### Selective installation pattern (this project)

This project has 14 of 26 agents installed — all 6 universal + 8 optional. This matches the CLI-tool scope: backend (3), frontend (2), data/ai (3), and most devops (4) agents are excluded. Only `bug-fixer`, `build-fixer`, `e2e-runner`, `performance-auditor`, `refactorer`, `security-reviewer` from optional are present; `changelog-generator`, `doc-writer` from docs.

**This is correct for a CLI-tool project**, but no documentation explains the selection rationale. A user looking at `.claude/agents/` and wondering "where's api-designer?" has no answer.

**Recommendation:** add a brief `.claude/agents/README.md` (or comment in settings) noting which optional agents were chosen and why.

### `worclaude` CLI subcommand vs slash-command coherence

The CLI binary has 10 subcommands (`init`, `upgrade`, `status`, `backup`, `restore`, `diff`, `delete`, `doctor`, `scan`, `setup-state`). Several share names with slash commands:

- `worclaude status` (binary) vs `/status` (slash) — the binary inspects worclaude state; the slash command (per #4) is being **retired**. After retirement, only `worclaude status` exists, no naming collision.
- `worclaude doctor` (binary) — health check, no slash equivalent. Good.
- `worclaude scan` (binary) — invoked by `/setup`. Good.

Naming is mostly clean. Post-`/status`-retirement is even cleaner.

### Project-type variants

SPEC mentions 8 SPEC.md template variants by project type. This project is a CLI tool. The variant pickers happen at `init` time. Worth noting that `/setup` is the only command-layer artifact that _re-runs_ setup on existing projects — and it operates only on detected fields, not on project-type pivots. **Project-type changes (e.g., CLI → web app) are not gracefully supported by `/setup`.** It would re-detect the new stack but write to the same SPEC.md template chosen at init.

This is probably a non-goal. CLI-tool-becomes-web-app is rare. Worth flagging though.

---

## 5. Skill ↔ Command ↔ Agent relations

### Skill orphans

Skills with no command invoking them by name:

- `context-management`
- `coordinator-mode`
- `frontend-design-system`
- `prompt-engineering`
- `review-and-handoff`
- `testing` (only `security-reviewer` agent uses it; no command does)

This isn't necessarily wrong — skills are designed to load on Claude's judgment, not via command dispatch. But it means **discoverability depends on Claude's prompt-recognition**, not on user commands. A user who's unaware of `/skills` can't easily find these.

**Recommendation:** review whether each unbound skill has a real use case or should be retired. A skill that nothing references is hard to evaluate for value.

### `agent-routing.md` is the brittle link

This skill is the central index for agent routing. It's:

- Manually maintained
- Auto-generated only at scaffolding time (per CLAUDE.md line 92), never refreshed by `/sync` or `upgrade`
- Listing 11 of 14 installed agents in this project

Every agent install/uninstall requires manual routing updates. Critical Rule #10 doesn't mention this. **High-friction, easy-to-forget seam.**

**Recommendation:** generate `agent-routing.md` from `.claude/agents/*.md` frontmatter as a periodic regenerator. `/sync` could check for drift and propose regeneration.

### Skill ↔ command bidirectional binding

Several skills are referenced by commands but commands aren't cited back in the skills:

- `git-conventions` is used by `/sync`, `/commit-push-pr`, `/conflict-resolver`, `/end` — the skill's content reflects this but doesn't link back.
- `verification` is referenced by `/verify` implicitly — neither side cites the other explicitly.

**Recommendation:** add a "Used by" or "See also" footer to each skill linking the commands that consume it. Improves discoverability and catches drift.

### Agent ↔ command coverage

Strong overall. Verified:

- 7 commands explicitly invoke or delegate to specific agents.
- 5 commands have implicit agent triggers (verify-app via `/verify`, etc.).
- 4 agents are listed in `agent-routing.md` but have no command binding (changelog-generator, performance-auditor, refactorer, e2e-runner). Of these:
  - `changelog-generator` is implicitly invoked by `/sync` (changelog generation).
  - `performance-auditor` is manual-only — appropriate.
  - `refactorer` overlaps with `/refactor-clean` — see #3 friction discussion.
  - `e2e-runner` is **fully orphaned** — no command, no implicit invocation, just listed in routing.

**Recommendation:** decide whether `e2e-runner` is real or aspirational. Either bind it to a future `/test-e2e` command (post-#2's "expand `tests/`" decision) or retire it.

---

## 6. Business purpose alignment

### What worclaude is for (per SPEC)

> "worclaude is a CLI tool that scaffolds a comprehensive Claude Code workflow system into any project. It installs agents, skills, slash commands, hooks, permissions, and configuration files derived from tips by Boris Cherny."

The product IS the workflow. The CLI is the delivery vehicle.

### Alignment of installed components with this purpose

| Component         | Aligns with purpose? | Notes                                                                                                         |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Slash commands    | Yes                  | All 18 are workflow-relevant.                                                                                 |
| Universal agents  | Yes                  | All 6 cover the canonical Boris-tips pattern (plan-review, simplify, test-write, build-validate, verify-app). |
| Skills            | Mostly               | 6 skills are unbound — questionable value for a "lean, focused workflow" product.                             |
| Hooks             | Yes                  | 4 hooks for 8 events covers the stated automation surface.                                                    |
| `/upstream-check` | Removed (#5)         | Was misaligned: required external infrastructure setup. Correctly retired.                                    |

### Mission drift signals

- **The skills directory has drifted toward "everything Boris mentioned"** rather than "essential to the scaffolded workflow." Six unbound skills suggest a tendency toward inclusiveness.
- **`/setup` is heavyweight** — appropriate for its job, but the maintenance cost (835 lines, multiple interlocking tables) is high. As long as the cost stays in `/setup` and doesn't propagate, this is fine.
- **`AGENTS.md` exists at repo root** (Claude Code v2 convention). Per the official docs, this can be `@import`-ed into CLAUDE.md. Worth confirming worclaude's scaffolded `AGENTS.md` is referenced from CLAUDE.md or vice versa.

### Compounding-engineering pattern (Boris's `@claude` flow)

Boris's PR-comment `@claude` GitHub Action is one of his major workflow patterns. Worclaude does not currently scaffold this. It's a real missing piece relative to the stated mission ("derived from tips by Boris Cherny"). Friction-audit #6 flagged this as a separate workstream.

**Recommendation:** evaluate whether worclaude should ship a `.github/workflows/claude-pr-learn.yml` that watches PR comments for `@claude` and auto-updates CLAUDE.md. Aligns directly with the stated business purpose.

---

## 7. Cross-cutting issues

### Issue 1: Drift between living artifacts and frozen documentation

Multiple artifacts drift independently:

- CLAUDE.md test counts (frozen at 497, reality 804)
- `agent-routing.md` agent list (frozen at 11, reality 14)
- Critical Rule #10 (frozen on agents.js + agent-registry.js, reality 3 places)

**Pattern:** anything claimed in CLAUDE.md or skills that depends on regeneration drifts because no command refreshes it. Fix: either auto-regenerate in `/sync`, or make the documentation refer to the source rather than restating it.

### Issue 2: Implicit contracts between layers

Three undocumented implicit contracts:

- Hook profile gating (some hooks fire conditionally on `WORCLAUDE_HOOK_PROFILE`); commands that depend on hook output don't check the profile.
- Background agent lifecycle (when does it complete? what locks the worktree?); not specified.
- Scratch-file SHA-keying convention (introduced in friction #3); not documented anywhere as a project-wide pattern.

**Pattern:** as the system gains layers, implicit contracts pile up. Need a single architecture doc that describes how layers compose.

### Issue 3: Selective installation has no doc

The 14-of-26 agent selection in this project, the language-specific settings template chosen at init, the project-type SPEC variant — all are init-time decisions with no record of WHY they were chosen. A user reading the project six months later has no recourse.

**Recommendation:** `worclaude-meta.json` could record installation decisions with rationale notes. `worclaude doctor` could surface them.

### Issue 4: Naming collisions between worclaude and Claude Code

- `Auto-memory` (worclaude) vs `Auto memory` (Claude Code) — friction #6 flagged this.
- `MEMORY.md` (Claude Code auto memory index) — does worclaude scaffold a MEMORY.md anywhere? Per inventory: no. Worth confirming intent.
- `.claude/rules/` — Claude Code's official directory for path-scoped rules. Worclaude doesn't scaffold it (friction #6 flagged as open follow-up).

**Pattern:** as Claude Code itself adopts conventions worclaude pioneered, naming overlaps emerge. Worclaude should align rather than maintain parallel labels.

### Issue 5: Verification artifact triple-source

`/verify` spec, CLAUDE.md `## Verification`, and `package.json prepublishOnly` all encode the same commands. Three sources, three failure modes for drift. A subtle problem because none of them is "wrong" today — but the next time the canonical commands change, only one will be updated and the others will rot.

**Recommendation:** designate `package.json` scripts as the canonical truth; have CLAUDE.md and `/verify` reference them.

### Issue 6: Skills with no consumer signal

Six skills are unreferenced. Without a way to measure "did Claude actually load this skill in the last 30 days?", the maintainer can't tell if they're earning their slot. The `times_applied` field in learnings (now retired per #6) was the wrong place to wire this signal — but the underlying need is real.

**Recommendation:** consider a lightweight skill-load telemetry hook (PostSkillLoad event if Claude Code supports it) to surface load frequency. Or accept that some skills are belt-and-suspenders and don't need usage signal.

---

## 8. Confidence calibration

What I'm certain about (verified against files):

- Command count, agent count, skill count, hook count.
- Agent routing list (11 in skill, 14 installed).
- CLAUDE.md drift on test counts (read both CLAUDE.md and PROGRESS.md).
- Hook configuration in settings.json.
- `ci-fixer` reference in git-conventions.md line 101 with no agent file.
- `e2e-runner` orphan status (grep'd for invocations).
- Friction-audit decisions are accurately summarized (cross-referenced docs #1–#7).

What I'm less certain about (worth verifying before acting):

- Whether `agent-routing.md` is genuinely "frozen at scaffolding time" or if `/upgrade` regenerates it. SPEC says scaffolded; CLAUDE.md says generator builds it dynamically — these aren't quite the same claim.
- Background-agent semantics under concurrent invocation. I've described what I believe the contract is; haven't tested it.
- Whether `AGENTS.md` at repo root is loaded by Claude Code in this project today (it's a v2 feature; depends on Claude Code version).
- The exact CLAUDE.md size threshold trajectory — friction-audit changes might add more or fewer lines than my 3–5 estimate.

What I might have missed:

- Test-folder organization (per #2 decision, e2e expansion was deferred to `tests/` — I didn't audit current `tests/` for coverage of the user journeys).
- `worclaude doctor`'s full check set — I verified CLAUDE.md size checks, didn't enumerate all checks.
- `templates/` parity — whether the scaffolded versions of commands match the installed `.claude/commands/` versions.

---

## 9. Priority-ordered recommendations beyond the friction docs

### P0 — Drift fixes (small effort, high signal)

1. **Fix CLAUDE.md test counts** — replace "497 tests, 31 files" with current values. Add a `/sync` step to refresh tech-stack metrics on every release.
2. **Rename CLAUDE.md "Auto-memory" section** to "Captured Learnings" or similar. Reserve "Auto memory" for Claude Code's feature.
3. **Update Critical Rule #10** to include `agent-routing.md` as the third place to update on agent changes.
4. **Remove or implement `ci-fixer`** — currently a dangling reference in `git-conventions.md`.
5. **Decide `e2e-runner`'s fate** — bind to a future command, or retire alongside `/upstream-check`.
6. **Fix `verify-app` agent** — surfaced by the 2026-04-26 concurrency test. The agent's contract requires Bash to execute scenarios A/B/C in tmp dirs, but its sandbox doesn't grant Bash; it bails immediately. Either grant Bash to its `tools` allowlist or rewrite the agent's contract to do something achievable with its current tool set. Currently a no-op for any project.
7. **Add doctor check + cleanup convention for stale agent worktrees.** Surfaced by the 2026-04-26 concurrency test. After an agent completes, its worktree at `.claude/worktrees/agent-<id>` remains locked (lock holds the agent's pid even though the process is gone). `git worktree prune` does not remove locked worktrees; manual `git worktree remove -f -f` is required. Without a cleanup mechanism, worktrees pile up over time. Two parts:
   - Doctor check: warn when more than N (e.g., 3) stale agent worktrees exist in `.claude/worktrees/`.
   - Cleanup hook or convention: investigate whether Claude Code intends to clean up automatically or expects user intervention. If the latter, document and provide a `worclaude doctor --fix-worktrees` style helper.

### P1 — Architectural alignments (medium effort)

8. **Auto-regenerate `agent-routing.md`** from `.claude/agents/*.md` frontmatter — eliminates the routing-skill drift surface.
9. **Document hook contracts** in SPEC — input shapes, exit codes, profile gating, what each hook produces.
10. **Define `.claude/scratch/` as a discoverable location** — `/start` lists it generically, new scratch artifacts auto-surface.
11. **Designate `package.json` scripts as canonical for verification commands** — `/verify` and CLAUDE.md reference them, don't restate.
12. **Add a `worclaude-meta.json` field for installation rationale** — record why specific agents/templates were chosen, so future readers understand the selection.

### P2 — Strategic alignments (larger or future-scoped)

13. **Evaluate Boris's `@claude` PR-comment GitHub Action** — directly aligned with stated business purpose; missing today.
14. **Audit unbound skills** (context-management, coordinator-mode, frontend-design-system, prompt-engineering, review-and-handoff, testing) — retire or bind.
15. **Investigate `.claude/rules/` adoption** — Claude Code official feature; worclaude should consider scaffolding it as part of init.
16. **Document the five-layer memory architecture** in CLAUDE.md or a dedicated skill — friction #6 outlined it; needs to land somewhere readable.
17. **Reconcile `AGENTS.md` with CLAUDE.md** — confirm they're connected via `@import` or an explicit reference, per Claude Code v2 convention.

---

## 10. What this audit confirms about the friction-decision documents

The seven friction docs got the major refinements right. **No decision in #1–#7 needs reversal based on this deeper audit.** The audit's value-add is mostly:

- Surfacing drift the friction audit didn't notice (CLAUDE.md test counts, agent-routing list).
- Naming collisions ("Auto-memory" vs Claude Code's auto memory).
- Orphans (`e2e-runner`, `ci-fixer`, six unbound skills).
- Process gaps (no auto-refresh for stale documentation, no enforcement of three-place agent registration).
- Strategic alignment opportunities (Boris's GitHub Action; `.claude/rules/`).

The friction docs cover the **command-design and command-relation** concerns. This audit covers the **system-level drift, naming, and architectural-coherence** concerns. They complement.

---

## 11. Suggested next steps

Pick a layer to act on first:

- **Quickest wins** — P0 list above. Mostly small CLAUDE.md edits, single-line removals, single-rule additions. Could land in one PR. Visible improvement to project hygiene.
- **Highest leverage** — P1 #6 (auto-regenerate agent-routing) and #10 (rationale tracking). These eliminate sources of drift permanently rather than fixing one instance.
- **Biggest strategic move** — P2 #11 (`@claude` PR action). Aligns most directly with stated mission. Larger effort but defines the next chapter of "what worclaude is."

If you want a deep-dive on any specific finding before deciding, ask for a follow-up — happy to expand on confidence calibration items or P2 strategic options.

**End of report.**
