# Workflow Friction Decisions

Running design notes from the /start → work → sync loop audit.
Each entry captures a friction point in the current command set, the
decision we made, and what implementation needs to happen.

Principle established during this audit: **catch problems at the
earliest authoring step and refuse to proceed, rather than cleaning up
after the fact**. Apply consistently across commands where a downstream
step can only guess at missing intent.

---

## #1 — `/sync` has no way to enforce `Version bump:` in merged PRs

**Friction.** `/sync` aggregates `Version bump:` declarations from merged
PR bodies. When a PR is merged without one, `/sync` treats it as `none`
and emits a warning. But by then it's too late — the PR is already
merged, and the "real" bump level can only be guessed.

The root cause isn't in `/sync`; it's at PR-creation time. `/sync` is
doing the right thing (documenting the gap in the CHANGELOG as a ⚠
bullet), but the gap shouldn't exist in the first place.

**Decision.** `/commit-push-pr` must require a `Version bump:`
declaration in the PR body and refuse to open the PR without one.

- Valid values: `major`, `minor`, `patch`, `none`.
- Prompt the user interactively if missing. No default, no silent
  `none`.
- `none` is an allowed choice — internal-only work (refactors, test-only,
  doc tweaks that don't change user-facing behavior) legitimately
  belongs there. But it must be chosen, not inferred.
- Apply the same guard for any other command that creates PRs to
  `develop` (not just feature branches).

**Why this is the right lever.** Shifts the friction from recovery
(post-merge, where information is lost) to authoring (pre-merge, where
the author still has full context). Cheapest place to enforce intent.

**Broader principle to apply across commands.** Where a later step must
aggregate declarations made by earlier steps, the earlier step must
require them. Don't let missing metadata flow downstream and become a
warning; make it a hard stop at the authoring boundary.

**Implementation notes.**

- Location: `.claude/commands/commit-push-pr.md` (the command spec) and
  any underlying scaffolded template under `templates/commands/`.
- The refusal must be a prompt, not a flag — consistent with `/sync`'s
  step 9 "always prompt, including for major" pattern.
- Ensure the guard survives `worclaude upgrade` — the template needs
  updating, not just the installed copy.
- Consider: does the PR template in `.github/` also need a
  `Version bump:` line pre-seeded so human-authored PRs (without
  `/commit-push-pr`) still have a nudge? Open question — revisit when
  implementing.

**Status.** Decided, not yet implemented.

---

## Convention — prompting mechanism for closed-set choices

**Decision.** Use `AskUserQuestion` for any prompt whose valid answers
form a small closed set (enumerated options). Reserve plain-text prompts
for open-ended input (free-form notes, custom version strings, etc.).

**Why.** Structured prompts carry per-option descriptions, eliminate
the parse-and-retry loop on invalid text input, and make the
transcript's decision points unambiguous. For `Version bump:` in
particular, each option benefits from a one-line description (e.g.
"minor — new feature, backwards compatible"), which a plain text prompt
cannot render cleanly.

**Scope.** Applies to all commands that prompt the user. New prompts
added during this audit should use `AskUserQuestion` from day one.

**Retrofit follow-up.** Existing commands use plain-text prompts and
must be brought into line:

- `/sync` step 6 — bootstrap tag choice (`yes` / `custom` / `cancel`).
  The `custom` branch still needs a plain-text follow-up for the version
  string itself; keep that part as text.
- `/sync` step 9 — release confirmation (`ship` / `wait`).
- Any other command discovered during the audit.

Track the retrofit as a single follow-up task once #1's implementation
lands, so the convention ships holistically rather than trickling in.

**Status.** Convention agreed. Retrofit pending.
