---
layout: home

hero:
  name: Worclaude
  text: Professional Claude Code Workflows
  tagline: Best practices from Boris Cherny, installed with one command.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sefaertunc/Worclaude

features:
  - title: 25 Specialized Agents
    details: 6 universal (plan-reviewer, code-simplifier, test-writer, build-validator, verify-app, upstream-watcher) plus 19 optional agents across 6 categories. Each has a dedicated model and isolation policy.
  - title: 16 Slash Commands
    details: /start, /end, /commit-push-pr, /verify, /build-fix, /learn, /observability — session lifecycle, quality tools, learning capture, observability, and release flow built in.
  - title: 17 Skills
    details: 13 universal + 3 project templates + 1 generated routing skill. Conditional loading via path globs keeps Claude focused on relevant knowledge.
  - title: Local Observability
    details: 11 hook events capture skill loads, command invocations, and agent timings to .claude/observability/*.jsonl. Aggregate via `worclaude observability`. Zero data leaves the machine.
  - title: Claude Code Runtime Integration
    details: Skills and agents register with Claude Code through frontmatter — conditional loading, tool restrictions, background execution, and memory. Phase 7 surfaces /install-github-action for the @claude PR-comment workflow.
  - title: Smart Merge
    details: Already have a Claude Code setup? Worclaude detects it and merges intelligently — no overwrites.
  - title: Session Persistence
    details: SessionStart hook auto-loads context. Session summaries bridge sessions. Drift detection shows what changed since the last recorded SHA.
  - title: Doctor & doc-lint
    details: 'worclaude doctor validates the installation; worclaude doc-lint catches CLAUDE.md drift against package.json. Both are CI-friendly.'
---
