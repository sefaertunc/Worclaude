# Phase 6b — Cross-user aggregation (FUTURE charter)

## Status

**Deferred to a separate update cycle.** This file is a charter for
when the cycle starts — it captures the open questions and the cost
profile so a future scoping pass has context, not a fresh start.

Phase 6a (local observability) ships the per-project view. Phase 6b
would extend it with opt-in cross-user aggregation: anonymized
signals uploaded to a service, aggregate insights returned.

## Why deferred

Aggregation makes worclaude into a service, not just a CLI scaffold.
The cost profile is materially different from everything in Phases
1–6a:

- **Infrastructure:** hosting (where does data live?), DB, API,
  retention policy, monitoring.
- **Privacy / legal:** consent flow, anonymization layer, GDPR
  considerations if any user is in EU, data deletion endpoint.
- **Anti-abuse:** rate limiting, sanity checks on uploaded payloads.
- **Maintenance:** when the service goes down, all users with
  telemetry enabled notice. Operational burden.
- **Aggregation value:** "most-used skills across all opt-in users"
  is interesting but not load-bearing for individual project health.

Local-only (Phase 6a) solves ~90% of the value at ~10% of the cost.
Aggregation only earns its keep once a concrete question demands
cross-user data that local can't answer.

## Open questions to resolve before scoping Phase 6b

### What questions does aggregation actually answer?

Local already answers: "what does THIS project look like?" Aggregation
answers: "how does this project compare?" Examples:

- "Are my skill-load patterns weird compared to other Node CLI
  projects?"
- "Which agents are universally underused?"
- "What's the median CLAUDE.md size across all projects?"

These are **product-design questions** for worclaude, not user-
operations questions. The audience is the worclaude maintainer + a
research community, not individual project owners.

### What's the data model?

- What gets uploaded (signal-level, anonymized counts only, no
  content)?
- What gets stripped (project paths, file names, error strings,
  user identifiers)?
- What's the retention policy (90 days? 1 year?)?
- Schema versioning (anchor on
  `workflow-meta.json` schema version?).

### Where does the data live?

- Self-hosted (maintainer's infrastructure).
- Cloud-hosted (Vercel, Cloudflare Workers, etc.).
- Federated (each user opts to upload; no central server).

### Consent flow

- Opt-in by default (recommended).
- One-time prompt during `init` or `upgrade`.
- Easy revocation (env var, settings flag).
- Clear "what we collect, what we don't" doc.

### Cost model

- Free for users? Maintainer absorbs hosting cost.
- Limit volume (e.g., once per session aggregate, not every event)?

### Anti-abuse

- Rate limit per project / per machine.
- Reject unrealistic payloads.
- Public dashboard with aggregates only — no per-installation
  visibility.

## Pre-conditions before starting Phase 6b

1. **Phase 6a has been live for ≥ N months** (suggest 3+) and produced
   actual data via dogfooding. We need to know what local data looks
   like before designing the aggregation layer.
2. **A concrete question** that local can't answer has emerged. If
   nothing has come up, defer further.
3. **Maintainer commitment** to operating a service: budget, on-call
   appetite, privacy-policy authoring.

## Recommended next steps when picking this up

1. Re-read this charter.
2. Read Phase 6a's actual implementation and observed signal volumes.
3. Decide between self-hosted vs cloud-hosted vs federated.
4. Draft a privacy policy.
5. Build a minimum aggregation API.
6. Add opt-in flow to worclaude.
7. Iterate on dashboard / public report.

## What this phase does NOT include

- Real-time telemetry.
- Per-user identification (must remain anonymous).
- A SaaS pricing tier — worclaude stays open-source.
- Mandatory data collection.

## Status update protocol

Update this file (or move it to a fresh
`docs/phases/phase-6b-...md` cycle) when picking the work back up.
Until then: leave it as the charter it is.
