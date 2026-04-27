# Phase 5 — Doc architecture

## Goal

Restructure documentation around clear source-of-truth boundaries and
a deliberate archival policy. Eliminate the "facts duplicated across
N files" problem that drove most of the Phase 1 drift work.

## Tasks

### Source-of-truth assignments

**T5.1 — Lock in single source of truth, by concern.**

| Fact                                        | Single source                 | Everywhere else references it              |
| ------------------------------------------- | ----------------------------- | ------------------------------------------ |
| Tech stack metrics (test count, file count) | `package.json` (auto-derived) | CLAUDE.md, AGENTS.md                       |
| Verification commands                       | `package.json` scripts        | CLAUDE.md, `/verify`                       |
| Project description                         | `README.md`                   | CLAUDE.md, AGENTS.md (short version cited) |
| Features list                               | `SPEC.md`                     | Skills reference, never restate            |
| Phase status                                | `PROGRESS.md`                 | (`/start` reads it)                        |
| Release history                             | `CHANGELOG.md`                | (auto-appended by `/sync`)                 |
| Decision history                            | `docs/archive/decisions/`     | Phase files reference                      |

**Files:** rewrite intros of CLAUDE.md, AGENTS.md, README.md
sections that restate facts → reference instead.
**Source:** post-audit doc-architecture discussion (2026-04-26).
**Acceptance:** grep for stale tech-stack values returns matches only
in `package.json` and (auto-derived) reference sites.

### Archive structure

**T5.2 — Create `docs/archive/{topic}/{YYYY-MM}/` structure.** Already
created by Phase 0 (this phase plan's commit). Structure:

```
docs/archive/
├── INDEX.md
├── decisions/
│   └── 2026-04/
│       ├── 01-versioning-enforcement.md
│       ├── 02-verify-scope.md
│       ├── 03-remediation-trio.md
│       ├── 04-session-lifecycle.md
│       ├── 05-analysis-cluster.md
│       ├── 06-meta-memory.md
│       └── 07-start-test-coverage.md
├── audits/
│   └── 2026-04/
│       └── master-architecture-audit.md
├── backlogs/                            # populated by T1.8
│   └── 2026-04/
│       └── backlog-v2.1.md
└── retrospectives/                      # future
```

**Files:** populated by Phase 0 commit; `INDEX.md` to be authored
during this phase.
**Source:** archive `decisions/2026-04/05-analysis-cluster.md` (#5
archive policy).
**Acceptance:** structure exists; INDEX.md catalogs everything.

**T5.3 — `docs/archive/INDEX.md` as living catalog.** One-line entry
per archived file: title, archive date, brief summary, link. New
entries appended in the same PR that archives content.
**Files:** `docs/archive/INDEX.md`.
**Source:** archive `decisions/2026-04/05-analysis-cluster.md`.
**Acceptance:** every archived file appears in INDEX with metadata.

### Archive moves (from Phase 0)

**T5.4 — Friction-decisions docs are already moved.** This phase
formalizes the move that Phase 0 (this commit) executed. After Phase
2 implementation merges to main, mark each archived decision with an
`implemented: 2026-MM` field in its header.
**Files:** `docs/archive/decisions/2026-04/0[1-7]-*.md`.
**Source:** post-audit decision.
**Acceptance:** all 7 decisions are in archive with implementation
status.

**T5.5 — `master-architecture-audit.md` is already moved.** This
phase formalizes the move. The audit's recommendations are
incorporated into phase files; the document itself remains a
historical reference.
**Files:** `docs/archive/audits/2026-04/master-architecture-audit.md`.
**Source:** post-audit decision.
**Acceptance:** present in archive.

### Source-of-truth markers

**T5.6 — Add "auto-generated" markers.** Where a doc references a
single source of truth (e.g., CLAUDE.md tech-stack from
`package.json`), add a marker:

```markdown
<!-- This section auto-generated from package.json. Do not edit by
     hand. Run `worclaude refresh-claude-md` to regenerate. -->
```

This makes intent visible and lets the doc-lint script (T5.9) verify
alignment.
**Files:** `CLAUDE.md`, `AGENTS.md`, `templates/core/*`.
**Source:** post-audit doc-architecture discussion.
**Acceptance:** every auto-derived section carries a marker; manual-
edit warning is unambiguous.

### SPEC.md size discipline

**T5.7 — Add Table of Contents to SPEC.md.** Keep monolithic per
decision Q4. Add a comprehensive ToC at the top with anchor links to
every `## ` and `### ` heading. Decision: monolithic remains
navigable when the ToC is correct.
**Files:** `docs/spec/SPEC.md`.
**Source:** post-audit doc-architecture discussion.
**Acceptance:** SPEC.md has a working ToC; readers can jump to any
section in one click.

### Skills referencing SPEC

**T5.8 — Restate-with-mark.** Where a skill duplicates SPEC content,
keep the restatement (for ergonomics) but add a marker:

```markdown
<!-- Derived from SPEC.md § 3.2. Update SPEC.md first, then refresh
     this section. -->
```

The doc-lint script (T5.9) can then catch divergence.
**Files:** various `.claude/skills/*/SKILL.md` and templates.
**Source:** post-audit doc-architecture discussion (#5 boundary
between SPEC and skills).
**Acceptance:** every skill section that overlaps SPEC carries the
marker.

### Drift prevention via lint

**T5.9 — Doc-lint script.** Catches drift across docs. Checks:

- Sections marked "auto-generated from X" match X's content.
- Restated paragraphs marked "derived from SPEC.md § N" still match
  N's content.
- Tech-stack lines in CLAUDE.md / AGENTS.md / README don't drift from
  `package.json`.
- VitePress reference docs don't disagree with the in-repo source
  files.

Run as part of CI and `worclaude doctor`.
**Files:** new `src/utils/doc-lint.js`,
`src/commands/doctor.js` (integration), `.github/workflows/ci.yml`.
**Source:** master audit §7 issue 1, post-audit discussion.
**Acceptance:** intentional drift fails CI; running doctor surfaces
drift; fixing the source resolves the failure.

### BACKLOG.md (also in Phase 1)

**T5.10 — `BACKLOG.md` already created.** Phase 1 T1.8 handled the
migration. This phase notes that ongoing maintenance (adding new
items, removing implemented ones) follows the new conventions:

- Items reference their source (friction doc, audit P0/P1/P2,
  user request).
- Implemented items are deleted (the implementation lives in the
  PR + commit, not in BACKLOG).

**Files:** `docs/spec/BACKLOG.md` (ongoing).
**Source:** Phase 1 T1.8.
**Acceptance:** BACKLOG.md stays forward-looking only.

### VitePress alignment

**T5.11 — VitePress alignment policy.** `docs/guide/` and
`docs/reference/` render to the public site, separately maintained
from in-repo CLAUDE.md / SPEC.md / skills. Two-part fix:

- **One-time sweep** (already partially done in Phase 1 / Phase 2
  drift fixes): bring VitePress reference docs in line with current
  reality.
- **Policy:** when a command, agent, skill, or hook changes, update
  the corresponding `docs/reference/{slash-commands,agents,skills,
hooks}.md` page in the same PR. Add a checklist item to
  `.github/PULL_REQUEST_TEMPLATE.md` enforcing this.

**Files:** `.github/PULL_REQUEST_TEMPLATE.md`, ongoing reference doc
updates.
**Source:** master audit §3 (VitePress drift unknown).
**Acceptance:** PR template enforces; future drift caught at PR
review.

## Acceptance criteria for the phase

- Single source of truth assignments locked and documented.
- Archive structure with INDEX.md complete.
- Auto-generated markers in place.
- SPEC.md has a working ToC.
- Skills marked where they overlap SPEC.
- Doc-lint script runs in CI; catches drift.
- VitePress alignment policy in PR template.

## Dependencies

- Phase 4 (memory architecture documented before doc architecture
  formalizes).
- Phase 1 (drift fixes give clean state to start from).
