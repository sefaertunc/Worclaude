# Worclaude v2.0.0 — Orchestrator Context

Read this file at every `/start`. It tracks all 22 items across 8 phases.
Check status before starting work. Mark items ✅ after phase PR is merged.

## Status Tracker

| #   | Item                                             | Phase | Status |
| --- | ------------------------------------------------ | ----- | ------ |
| 1   | Fix skill format (flat → directory)              | 1     | ⬜     |
| 2   | Add `description` to agent frontmatter           | 1     | ⬜     |
| 3   | Add `when_to_use` to skill frontmatter           | 2     | ⬜     |
| 4   | Add `paths` to conditional skills                | 2     | ⬜     |
| 5   | Add frontmatter to commands                      | 2     | ⬜     |
| 6   | Add `disallowedTools` to read-only agents        | 3     | ⬜     |
| 7   | Add `background: true` to async agents           | 3     | ⬜     |
| 8   | Add `maxTurns` to agents                         | 3     | ⬜     |
| 9   | Add `omitClaudeMd: true` to read-only agents     | 3     | ⬜     |
| 10  | Add `memory` scope to agents                     | 3     | ⬜     |
| 11  | Doctor: CLAUDE.md size check                     | 4     | ⬜     |
| 12  | Doctor: skill format check                       | 4     | ⬜     |
| 13  | Doctor: agent `description` check                | 4     | ⬜     |
| 14  | Upgrade: skill migration                         | 5     | ⬜     |
| 15  | Upgrade: agent frontmatter patch                 | 5     | ⬜     |
| 16  | Scaffold MEMORY.md template                      | 6     | ⬜     |
| 17  | Upgrade `verify-app` agent (production patterns) | 6     | ⬜     |
| 18  | Worktree safety in cleanup commands              | 6     | ⬜     |
| 19  | Scaffold coordinator-mode skill                  | 6     | ⬜     |
| 20  | Optimize permission presets per tech stack       | 6     | ⬜     |
| 21  | E2E audit across all changes                     | 7     | ⬜     |
| 22  | Documentation site update + deploy               | 8     | ⬜     |

## Workflow Per Phase

Each phase follows the Worclaude session protocol:

```
git checkout develop && git pull
git checkout -b feat/v2-phase-N-short-description

/start                          # Load context, check drift
Plan the implementation         # Read the phase prompt, design approach
/review-plan                    # Send plan to plan-reviewer agent
Execute                         # Implement the changes
/refactor-clean                 # Clean up changed code
/verify                         # Run tests + lint
/commit-push-pr                 # Commit, push, PR to develop
```

After PR is merged:

```
git checkout develop && git pull
```

After ALL phase PRs are merged:

```
/sync                           # Update PROGRESS.md, SPEC.md, version
```

### Branch Naming

| Phase | Branch                              |
| ----- | ----------------------------------- |
| 1     | `feat/v2-phase-1-critical-fixes`    |
| 2     | `feat/v2-phase-2-skill-frontmatter` |
| 3     | `feat/v2-phase-3-agent-frontmatter` |
| 4     | `feat/v2-phase-4-doctor-checks`     |
| 5     | `feat/v2-phase-5-upgrade-migration` |
| 6     | `feat/v2-phase-6-new-content`       |
| 7     | `feat/v2-phase-7-e2e-audit`         |
| 8     | `feat/v2-phase-8-docs-deploy`       |

### Ground Rules

- Feature branches NEVER modify shared-state files (PROGRESS.md, SPEC.md, package.json version). Those are updated only on `develop` via `/sync` after merging PRs.
- Run `npm test && npm run lint` before every `/commit-push-pr`
- Template changes require hash recomputation in workflow-meta (happens automatically during test)
- Phase prompts are in `prompts/v2.0.0/phase-N-*.md`
- Start each phase from a clean `develop` — pull before branching

## Phase Overview

| Phase | Items  | Summary                                            | Dependencies      |
| ----- | ------ | -------------------------------------------------- | ----------------- |
| 1     | #1–2   | Critical fixes — skills format + agent description | None              |
| 2     | #3–5   | Skill & command frontmatter enrichment             | Phase 1 merged    |
| 3     | #6–10  | Agent frontmatter enrichment                       | Phase 1 merged    |
| 4     | #11–13 | Doctor enhancements                                | Phase 1 merged    |
| 5     | #14–15 | Upgrade migration                                  | Phases 1–4 merged |
| 6     | #16–20 | New content & templates                            | Phase 1 merged    |
| 7     | #21    | E2E audit                                          | Phases 1–6 merged |
| 8     | #22    | Documentation update + deploy                      | Phases 1–7 merged |

**Note:** Phases 2, 3, 4, 6 can run in parallel after Phase 1 merges (they don't conflict). Phase 5 depends on 1–4. Phase 7 depends on all. Phase 8 is last.

## Background

These changes are based on analysis of Claude Code's leaked source code (March 31, 2026). The source reveals:

- Skills require directory format: `skill-name/SKILL.md` (flat `.md` files in `/skills/` are silently ignored)
- Agents require `description` frontmatter (without it, `parseAgentFromMarkdown()` returns null)
- Skills support `when_to_use` (auto-invocation), `paths` (conditional activation), and other frontmatter
- Agents support `disallowedTools`, `background`, `maxTurns`, `omitClaudeMd`, `memory`, and other fields
- Full analysis: see conversation history in Claude Desktop
