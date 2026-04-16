---
description: "Check Anthropic upstream feeds and cross-reference against Worclaude's own architecture"
---

Dogfooded version of the upstream-check template. Unlike the scaffolded
`templates/commands/upstream-check.md` (which is generic), this one knows
Worclaude's internals and reports on how upstream changes affect the
scaffolder, agent catalog, registry, hook templates, and backlog.

Feed base URL: `https://sefaertunc.github.io/anthropic-watch/feeds/`

## 1. Fetch Run Report

```bash
curl -s --max-time 10 https://sefaertunc.github.io/anthropic-watch/feeds/run-report.json
```

If the fetch fails (non-zero exit, empty body, or non-JSON output), report
"Could not reach anthropic-watch feeds" and stop.

Otherwise parse the JSON and extract:

- `timestamp` — when the scraper last ran
- `sources[]` — list of all 16 sources with `{key, name, category, status, newItemCount, error}`

Count healthy vs errored sources. List each errored source with its error
message.

## 2. Fetch All Items

```bash
curl -s --max-time 10 https://sefaertunc.github.io/anthropic-watch/feeds/all.json
```

Same failure handling as step 1.

Otherwise take the **10 most recent items** (already sorted newest-first),
grouped by `sourceCategory` (`core` vs `extended`). For each item show title,
`sourceName`, date (relative if you can compute it), and URL.

## 3. Flag Claude Code-Critical Items

Items whose `source` is one of these directly affect Worclaude scaffolded
infrastructure — prefix with `[CRITICAL]` in the listing:

- `claude-code-releases`
- `claude-code-changelog`
- `npm-claude-code`
- `agent-sdk-ts-changelog`
- `agent-sdk-py-changelog`

## 4. Worclaude-Specific Cross-Reference

For every `[CRITICAL]` item and every item from `engineering-blog`, do a
targeted cross-reference against Worclaude's own architecture. Report under
the heading **"Worclaude Impact"** with one subsection per item.

Cross-reference rules:

- **Claude Code version / changelog / npm-claude-code** — a new Claude Code
  release can change agent frontmatter syntax, hook event names, command
  syntax, or tool names. Check:
    - `templates/agents/**/*.md` and `templates/agents/universal/*.md`
      frontmatter fields (model, isolation, disallowedTools, criticalSystemReminder, initialPrompt)
    - `templates/commands/*.md` frontmatter and bash examples
    - `templates/hooks/*.cjs` — hook event names, input shapes, exit-code
      semantics (especially `pre-compact-save.cjs`, `correction-detect.cjs`,
      `learn-capture.cjs`, `skill-hint.cjs`)
    - `src/data/agents.js` `AGENT_CATALOG` entries — any deprecated model
      names?

- **Agent SDK TS/Py changelog** — SDK changes can affect spawned-agent
  capabilities and hook schemas. Check:
    - `src/data/agent-registry.js` — `isolation`, `triggerType`, `model`
      fields still valid?
    - `src/data/agents.js` `AGENT_CATALOG` — tool availability per category
      (Backend, Frontend, DevOps, Quality, Documentation, Data/AI)
    - `src/core/scaffolder.js` and `src/core/merger.js` — do they emit
      frontmatter fields that the new SDK still understands?

- **Anthropic API / docs** — only relevant if Worclaude adds direct SDK
  usage. Today Worclaude has no `@anthropic-ai/sdk` dependency; grep
  `package.json` to confirm, and flag informational only if absent.

- **Engineering blog posts** — look for new workflow patterns, agent-design
  recommendations, or context-management techniques. Cross-reference
  against:
    - `docs/spec/BACKLOG-v2.1.md` — any item in the backlog that this post
      would unblock or invalidate? Quote the backlog heading if so.
    - `templates/skills/universal/*.md` — new best-practice skills that
      Worclaude should scaffold?
    - `CLAUDE.md` Critical Rules section — any rule that this post
      contradicts?

- **Status page incidents** — informational only. Note but do not cross-
  reference; no Worclaude impact.

For each cross-reference, produce one of:

- **Action needed:** specific file + what to check/update, plus a 1-line
  reason tied to the upstream item
- **No impact detected:** the change does not touch any file listed above
- **Needs investigation:** ambiguous; name the file and the uncertainty

## 5. Closing Summary

End with two lines:

```
X new items since {timestamp}. Y/16 sources healthy.
{N} items with Worclaude impact ({M} action needed, {K} needs investigation).
```

Then this final reminder:

```
Run /upstream-check weekly or after any Claude Code update.
```

## Rules

- Use only `curl` and shell builtins. Do not invoke `node` or `npm`.
- Do not cache, persist, or diff against prior runs — this command is stateless.
- Reference specific Worclaude files by path. "Check the agents" is not enough;
  "Check `src/data/agents.js` line 10 — `ui-reviewer` model field" is.
- If confidence that an item affects Worclaude is low, classify as
  "Needs investigation" rather than "Action needed".
- Be concise. A maintainer skimming this should decide in 30 seconds whether
  to act.

## Trigger Phrases
- "check upstream"
- "what changed in claude code"
- "any anthropic updates"
- "upstream status"
- "dogfood upstream"
