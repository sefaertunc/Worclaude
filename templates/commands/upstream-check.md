---
description: "On-demand check of Anthropic upstream feeds (Claude Code releases, SDK changelogs, blog, status)"
---

Fetch the anthropic-watch feeds and report a concise summary of upstream changes.
This is a stateless, on-demand status check — no caching, no persistence.

Feed base URL: `https://sefaertunc.github.io/anthropic-watch/feeds/`

## 1. Fetch Run Report

```bash
curl -s --max-time 10 https://sefaertunc.github.io/anthropic-watch/feeds/run-report.json
```

If the fetch fails (non-zero exit, empty body, or non-JSON output), report:

```
Could not reach anthropic-watch feeds.
```

and stop.

Otherwise, parse the JSON and extract:

- `timestamp` — when the scraper last ran
- `sources[]` — list of all 16 sources with `{key, name, category, status, newItemCount, error}`

Count how many sources have `status: "ok"` vs errored sources. List each errored source
with its error message.

## 2. Fetch All Items

```bash
curl -s --max-time 10 https://sefaertunc.github.io/anthropic-watch/feeds/all.json
```

Apply the same failure handling.

Otherwise, parse and take the **10 most recent items** (they are already sorted
newest-first). Group them by `sourceCategory` (`core` vs `extended`).

For each item show:

- Title
- Source name (`sourceName`)
- Date (relative like "2 days ago" when you can compute it, otherwise ISO date)
- URL

## 3. Highlight Claude Code-Critical Items

Any item whose `source` is one of:

- `claude-code-releases`
- `claude-code-changelog`
- `npm-claude-code`
- `agent-sdk-ts-changelog`
- `agent-sdk-py-changelog`

directly affects scaffolded worclaude infrastructure. Flag these with a `[CRITICAL]`
prefix in the listing so the user notices them first.

## 4. Closing Summary

End with a single line:

```
X new items since {timestamp}. Y/16 sources healthy.
```

Where X is the total item count across all sources (sum of `newItemCount` from the
run report) and Y is the healthy-source count.

## Rules

- Use only `curl` and shell builtins. Do not invoke `node` or `npm`.
- Do not cache, persist, or diff against prior runs — this command is stateless.
- Keep the output concise. This is a status check, not a research report.
- If both feeds fail, stop after the first failure message.

## Trigger Phrases
- "check upstream"
- "what changed in claude code"
- "any anthropic updates"
- "upstream status"
