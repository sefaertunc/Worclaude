---
description: "Core behavioral principles: when to ask, when to push back, when to simplify, how to make surgical changes"
when_to_use: "Always relevant. Load when starting substantive coding tasks, reviewing code, or when output feels overcomplicated or off-target."
version: "1.0.0"
---

# Coding Principles

Reference card. Depth and examples live in the linked skills — this file consolidates the rules, not the rationale.

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

See `prompt-engineering/SKILL.md` for eliciting quality and writing specs.

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you wrote 200 lines and it could be 50, rewrite it.

When NOT to simplify: hot paths, stable legacy, framework boilerplate, security-critical code, code you don't fully understand. When in doubt, leave it — a working system is more valuable than a clean one. See the `code-simplifier` agent and `/refactor-clean` command.

## 3. Surgical Changes

Touch only what you must. Every changed line must trace to the request.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables YOUR changes made unused. Leave pre-existing dead code unless asked.
- Never combine cleanup with feature work.

See `git-conventions/SKILL.md` for style matching and the `/refactor-clean` command for scope.

## 4. Goal-Driven Execution

Define success criteria up front. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a failing test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Close the feedback loop BEFORE committing: change → verify → commit. Not: commit → discover it's broken.

See `verification/SKILL.md`, `testing/SKILL.md`, and `planning-with-files/SKILL.md`.

---

**These principles are working if:** fewer unnecessary diff lines, fewer rewrites from overcomplication, clarifying questions come before implementation rather than after mistakes.
