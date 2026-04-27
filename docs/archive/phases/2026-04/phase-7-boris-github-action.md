# Phase 7 — Boris's `@claude` GitHub Action integration

## Goal

Surface Claude Code's official `/install-github-action` command in
worclaude's user-facing flow so users can opt into Boris Cherny's
"compounding engineering" pattern: PR-comment `@claude` markers
trigger automatic CLAUDE.md updates.

This is **mostly documentation work**, not engineering. Verified
during the audit: `@claude` is a built-in Claude Code feature, not a
custom workflow that worclaude needs to build.

## Tasks

### Documentation

**T7.1 — Document `/install-github-action` in user-facing docs.** Add
a section to `docs/guide/claude-code-integration.md` (or a new
`docs/guide/compounding-engineering.md`) that:

- Explains the `@claude` PR-comment pattern.
- Quotes Boris's example: `nit: use a string literal, not ts enum
@claude add to CLAUDE.md to never use enums`.
- Tells users to run `/install-github-action` inside Claude Code to
  enable the workflow.
- Notes that the action commits CLAUDE.md updates automatically;
  worclaude's existing `/sync` flow handles their incorporation into
  releases.
- Links to Anthropic's official docs for the GitHub Action.

**Files:** `docs/guide/claude-code-integration.md` or new file;
sidebar update in `docs/.vitepress/config.ts`.
**Source:** Boris's site (`howborisusesclaudecode.com`); audit
verification (2026-04-26).
**Acceptance:** users can find the integration explanation from the
public docs site.

**T7.2 — Update README.md to mention the integration.** Brief
mention in the worklfow features list. Avoid making it look like
worclaude provides this — it's a Claude Code feature worclaude points
at.

**Files:** `README.md`.
**Source:** master audit §6 (mission alignment).
**Acceptance:** README acknowledges the pattern; readers understand
it's Claude Code, not worclaude.

### Optional opt-in prompt

**T7.3 — Optional `worclaude init` prompt.** During `init`, after the
core setup, prompt:

```
Install Claude Code's GitHub Action for the @claude
"compounding engineering" workflow?
- yes — show me the install instructions now
- no  — I'll do it later
```

If yes, print:

```
Run /install-github-action inside Claude Code to enable.
See docs/guide/compounding-engineering.md for details.
```

Worclaude itself doesn't run the install — only points the user.
This keeps worclaude's contract clean (it scaffolds files; it doesn't
shell out to Claude Code's install commands).

**Files:** `src/commands/init.js`, `src/data/agents.js` (or wherever
init prompts live).
**Source:** post-audit Phase 7 design.
**Acceptance:** prompt fires; users who say "yes" see clear next
steps; "no" exits cleanly.

### Update CLAUDE.md template note

**T7.4 — CLAUDE.md template note.** Add a small mention in the
scaffolded `CLAUDE.md` template's Memory Architecture section:

> If your repository has the Claude Code GitHub Action installed
> (run `/install-github-action`), `@claude` mentions in PR comments
> will automatically propose CLAUDE.md updates.

**Files:** `templates/core/CLAUDE-template.md` (or wherever the
template lives).
**Source:** post-audit Phase 7 design.
**Acceptance:** users reading CLAUDE.md see the integration hint.

## Acceptance criteria for the phase

- Public docs explain `@claude` pattern and how to enable it.
- README mentions the integration without overstating worclaude's
  role.
- `worclaude init` offers an opt-in prompt with clear next steps.
- CLAUDE.md template carries a brief integration note.

## Dependencies

- Phase 5 (doc architecture decisions about user-facing vs internal
  docs).
- No code-level dependency — this is documentation work.

## Anti-goals

- Don't build a custom `@claude` workflow file. Claude Code provides
  it via `/install-github-action`.
- Don't shell out from worclaude to install the GitHub Action. Point
  users to the command; let them run it.
- Don't claim worclaude builds the integration. It's a Claude Code
  feature worclaude documents and surfaces.
