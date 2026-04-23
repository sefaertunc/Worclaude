---
description: 'Diagnose-first project setup with state machine — scans, confirms, interviews, writes.'
---

## CRITICAL EXECUTION RULES — READ FIRST

This command is a state machine. Once `/setup` is invoked, your behavior
is constrained by the following rules. These rules override contextual
judgment, helpfulness instincts, and any other instructions you would
normally apply.

1. **ADVANCE STATES IN ORDER.** States execute in numeric order 0 through
   11. You MUST NOT skip a state based on your judgment about what seems
   redundant. If a state's work is trivially empty (e.g., no
   medium-confidence items to confirm), enter the state, record the
   empty mutation, and transition immediately — but DO enter it.

2. **NO BACKWARD ADVANCE.** Once you leave a state, do not re-enter it
   within this `/setup` invocation. "Invocation" means one continuous
   run from INIT through DONE. Typing `cancel setup` ENDS the current
   invocation; re-running `/setup` later starts a NEW invocation, and
   entering the saved `currentState` is an allowed forward transition
   for the new invocation. If the user wants to correct a prior answer
   mid-run, tell them to finish this run and edit the output files
   afterward.

3. **OFF-TOPIC INPUT DOES NOT ADVANCE.** If the user's response to a
   state's prompt is not valid input for that state, you MUST re-render
   the current state's prompt with this prefix:

   > "I'm in the middle of project setup (state: `<STATE_NAME>`).
   > I'll help with that after setup completes. To cancel setup, type
   > `cancel setup`."

   You MUST NOT answer the off-topic question. You MUST NOT run any
   tool to investigate the off-topic question.

4. **CANCEL PRESERVES STATE.** The cancel trigger is the case-
   insensitive regex `/^(cancel|stop|abort)( setup)?[.!?\s]*$/i`
   applied to the trimmed user reply. Accepts the base verb (optionally
   followed by "setup") plus trailing punctuation or whitespace —
   `cancel`, `Cancel!`, `STOP SETUP.`, `abort ` all match. Text beyond
   the matched prefix means "not a cancel" (`cancel please` is a
   question, not a cancel). On match, acknowledge (the state file is
   already saved after every mutation per rule #6), print:

   > "Setup paused. Run `/setup` again to resume, or
   > `worclaude setup-state reset` to discard."

   and exit. You MUST NOT write any output files on cancel.

5. **SCOPED TOOL WHITELIST.** Between SCAN ENTRY and WRITE ENTRY you
   may invoke ONLY these tools:

   - Shell: `worclaude scan --path .` (SCAN only)
   - Shell: `worclaude setup-state show --path .`
   - Shell: `worclaude setup-state save --from-file .claude/cache/setup-state.draft.json --path .`
     — the ONLY way state is persisted. Use `Write` to produce the
     draft JSON first, then invoke the CLI against that path. This
     avoids Claude Code's shell-interpolation safety layer that
     triggers on heredoc-with-variable-expansion patterns.
   - Shell: `worclaude setup-state reset --path .`
   - Shell: `worclaude setup-state resume-info --path .`
   - Read: `.claude/cache/detection-report.json`
   - Read: `.claude/cache/setup-state.json`
   - Write: `.claude/cache/setup-state.draft.json` (state-save staging
     only — overwritten each save).
   - Tool: `AskUserQuestion` (INTERVIEW states only, per the
     Interaction mode contract — `selectable` / `multi-selectable`
     questions). Not permitted at CONFIRM_HIGH / CONFIRM_MEDIUM:
     those render VERBATIM per rule #7 so the text-parser contract
     stays stable.

   At WRITE state the whitelist RELAXES to additionally permit:

   - Read: each of the six target output files (`CLAUDE.md`,
     `docs/spec/SPEC.md`, three `SKILL.md` files under
     `.claude/skills/`, `docs/spec/PROGRESS.md`). Reads are ONLY to
     preserve user content that the merge does not overwrite. Missing
     files are treated as empty.
   - Read: `.claude/workflow-meta.json` for template-hash lookup.
   - Write: exactly those six files, with merged content per the
     per-file merge rules in the WRITE state section.

   NO OTHER tool invocation is permitted — not Grep, not Glob, not
   WebFetch, not arbitrary Bash, not reads of files outside the
   whitelist. If you find yourself wanting another tool, you have
   already drifted; restate the current prompt instead.

6. **NO MEMORY PRE-FILL.** Do NOT use information from previous
   conversations, memory, or other projects. This setup is for THIS
   project only. Only use information the user provides during THIS
   interview and the detection report for THIS project.

7. **RENDER PROMPTS VERBATIM.** Where a state specifies a prompt format
   with `[x] 1. ...` syntax or other structured output, render it
   EXACTLY as specified AND wrap it in a triple-backtick fenced code
   block so Markdown rendering does not reformat checkboxes or
   renumber lines. The format is part of the contract with the
   user-response parser — paraphrasing or reformatting breaks parsing.
   You MAY add a brief conversational sentence before or after a
   verbatim prompt, but NOT within it.

   KNOWN FAILURE MODES: reformatting `[x] 1. X: Y` as `- [x] X: Y`
   (loses numbering); paraphrasing labels; collapsing items onto one
   line; rendering outside a fenced block (Markdown may convert `[x]`
   to interactive checkboxes).

   This rule ALSO applies to state-machine control prose. Render these
   templates with fixed phrasing:

   - Resume preamble (INTERVIEW\_\* states):
     "Resuming `<STATE_NAME>`. Already have: `<comma-list>`.
     Next: `<next questionId>`."
   - Back rejection (INTERVIEW\_\* states):
     "I can't go back within a single setup run. Finish this run and
     edit the output files afterward."
   - Off-topic restate prefix: exactly the text in rule #3.
   - Cancel acknowledgment: exactly the text in rule #4.

If any rule conflicts with contextual judgment, **THE RULE WINS**. This
command is intentionally rigid — rigidity is the feature.

---

## State machine reference

| #   | State                  | ENTRY action                                          | EXIT condition                               |
| --- | ---------------------- | ----------------------------------------------------- | -------------------------------------------- |
| 0   | INIT                   | Precondition check, then branch to SCAN or RESUME     | State loaded OR state absent/stale           |
| 1   | SCAN                   | Invoke `worclaude scan --path .`, read cache file     | Report loaded successfully                   |
| 2   | CONFIRM_HIGH           | Render high-confidence checklist; parse response      | User responds with "ok" or valid number list |
| 3   | CONFIRM_MEDIUM         | Iterate medium-confidence items; one prompt each      | All medium items resolved                    |
| 4   | INTERVIEW_STORY        | Section 1 residual questions                          | User answered or skipped                     |
| 5   | INTERVIEW_ARCH         | Section 2 residual questions                          | User answered or skipped                     |
| 6   | INTERVIEW_FEATURES     | Section 4 conversational interview                    | User answered or skipped                     |
| 7   | INTERVIEW_WORKFLOW     | Section 5 residual questions                          | User answered or skipped                     |
| 8   | INTERVIEW_CONVENTIONS  | Section 6 conversational interview                    | User answered or skipped                     |
| 9   | INTERVIEW_VERIFICATION | Section 7 residual questions                          | User answered or skipped                     |
| 10  | WRITE                  | Merge-write the six output files from collected data  | All files written (failures recorded)        |
| 11  | DONE                   | Clear state file, summarize to user                   | — (terminal)                                 |

---

## Per-state instructions

### State 0 — INIT

ENTRY:

- **Precondition check.** Verify `.claude/workflow-meta.json` exists at
  the project root. If absent, print "This project has not been
  scaffolded by Worclaude yet. Run `worclaude init` first, then re-run
  `/setup`." and exit. `/setup` is a post-init command.
- Invoke `worclaude setup-state show --path .`.
- If stdout is `no state` → advance to SCAN.
- If the command exits non-zero (corrupt state file, unsupported
  schema, unreadable project root): print the stderr verbatim, add
  "The setup state file looks broken. Run
  `worclaude setup-state reset` to discard it, then re-run `/setup`.",
  and exit. Do NOT auto-reset.
- If stdout is a JSON state object:
  - Invoke `worclaude setup-state resume-info --path .` to get the
    pre-formatted `state: ..., age: ..., staleness: ...` line.
  - If `staleness: stale` → prompt: "Found a setup in progress from
    `<age>`. That's old enough I'd rather start fresh. Discard and run
    a new setup? [yes/no]". `yes` → invoke
    `worclaude setup-state reset`, advance to SCAN. `no` → resume at
    the saved `currentState`.
  - Otherwise (`fresh`) → prompt: "Found a setup in progress (state:
    `<STATE>`, started `<age>` ago). Resume from there, or start over?
    [resume/restart]". `resume` → jump to the saved `currentState`.
    `restart` → invoke reset, advance to SCAN.

EXIT: SCAN (fresh/reset) or the saved `currentState` (resume).
Resuming begins a new invocation (rule #2).

### State 1 — SCAN

ENTRY:

- Invoke `worclaude scan --path .`.
- Read `.claude/cache/detection-report.json`.
- If the report has a non-empty `errors` array, render a one-block
  warning verbatim:

  ```
  The scanner ran but reported <N> detector error(s). I'll proceed
  with what was detected; the error'd fields will be asked in the
  interview.
  Errors:
    - <detector>: <kind> — <message>
    - ...
  ```

- State file mutation: write a fresh state with EXACTLY these fields.
  `schemaVersion: 1` is REQUIRED — the validator rejects anything else
  with `Unsupported schemaVersion: undefined`.

  ```json
  {
    "schemaVersion": 1,
    "currentState": "SCAN",
    "startedAt": "<ISO timestamp, now>",
    "updatedAt": "<ISO timestamp, now>",
    "detectionReportPath": ".claude/cache/detection-report.json",
    "highConfirmedAccepted": [],
    "highConfirmedRejected": [],
    "mediumResolved": {},
    "interviewAnswers": {}
  }
  ```

  Persist via `Write` → `.claude/cache/setup-state.draft.json` →
  `worclaude setup-state save --from-file .claude/cache/setup-state.draft.json --path .`
  (see rule #5).

EXIT: advance to CONFIRM_HIGH.

### State 2 — CONFIRM_HIGH

ENTRY:

- Read the detection report. Gather entries with
  `confidence === "high"`.
- If there are zero high-confidence items: persist the state with
  `currentState: "CONFIRM_HIGH"`, `highConfirmedAccepted: []`,
  `highConfirmedRejected: []`, and transition to CONFIRM_MEDIUM
  (trivial exit per rule #1).
- Otherwise render VERBATIM (wrapped in a triple-backtick fenced code
  block). Below every item add a dim "→ Will be saved as: `<target>`"
  line pulled from the **Field-help table** so the user knows what
  accepting means:

  ```
  I scanned your project. Please confirm the high-confidence
  detections below. Reply with the numbers of any items that are
  WRONG (e.g., "2, 5"), or reply "ok" to accept all, or type "help".

    [x] 1. <formatField(item1.field)>: <renderValue(item1)> (from <item1.source>)
           → Will be saved as: <target1>
    [x] 2. ...
           → Will be saved as: <target2>

  Your response:
  ```

  `<formatField>` and `<renderValue>` are defined in the **Field
  rendering table** below. `<target>` is pulled from the **Field-help
  table** (also below) and must be included verbatim per the table.

Response parsing (case-insensitive, whitespace trimmed):

- `ok` | `yes` | `all good` | `""` → accept all; set
  `highConfirmedAccepted` to all item field names in rendered order;
  `highConfirmedRejected: []`.
- One or more integers (comma or space separated) in range 1..N →
  those items are rejected; split fields into accepted/rejected
  accordingly (in rendered order).
- `help` → render the **Field-help** block for EACH displayed field
  (description + target + example) without advancing state. Then
  restate the prompt above (same text, same items). Do NOT persist a
  mutation for the help render. (`?` is intentionally NOT a trigger —
  Claude Code binds it to a keyboard-shortcut overlay that intercepts
  the keystroke before /setup sees it.)
- Anything else (including integers out of range) → rule #3 fires:
  restate with "I need either 'ok', numbers from 1 to `<N>` matching
  the items above (e.g., '2, 5'), or type `help`. To cancel, type
  `cancel setup`."

State file mutation: persist the updated arrays via
`worclaude setup-state save --from-file .claude/cache/setup-state.draft.json --path .`
(see rule #5).

EXIT: advance to CONFIRM_MEDIUM.

### State 3 — CONFIRM_MEDIUM

ENTRY:

- Gather entries with `confidence === "medium"` from the detection
  report.
- If there are zero medium-confidence items: persist
  `mediumResolved: {}`, transition to INTERVIEW_STORY.
- Otherwise iterate in report order. For each medium item, render ONE
  prompt VERBATIM in a fenced code block. The prompt shape depends on
  `item.candidates`:

  **Shape A — `candidates === null`** (emitted by `readme`):

  ```
  <formatField(field)> (detected from <source>):

    1. <renderValue(item)>
       → Will be saved as: <target>
    2. Other (I'll type my own)

  Reply with the number of your choice (default: 1), or type `help`:
  ```

  **Shape B — `candidates` is a non-empty array** (emitted by
  `package-manager` when multiple lockfile groups disagree):

  ```
  <formatField(field)> (detected from <source>):
  → Will be saved as: <target>

    1. <candidates[0]>
    2. <candidates[1]>
    ...
    N. <candidates[N-1]>
    N+1. Other (I'll type my own)

  Reply with the number of your choice (default: 1), or type `help`:
  ```

  `<target>` comes from the **Field-help table** below. Render it
  verbatim per the table.

  `candidates[0]` equals `item.value` — default-1 accepts the detected
  value.

**Storage rule:** `mediumResolved[field]` MUST be a string. Store the
exact `renderValue(item)` that was shown to the user on option 1, or
the user's trimmed free-text on "Other", or `candidates[k-1]` (shape
B) for a numbered pick. **NEVER store the raw `item.value` object** —
for fields like `readme` whose detected value is an object
(`{projectDescription, setupInstructions, fullPath}`) the validator
will reject the mutation with `state.mediumResolved.<field> must be a
string`.

Response parsing (per item):

- `""` | `1` | `default` → accept item 1; store `renderValue(item)`
  as a string per the Storage rule above.
- The final "Other" number (`2` in shape A, `N+1` in shape B) →
  follow-up free-text prompt: "Go ahead — what's the value you'd like
  to use?". Store the trimmed reply.
- Integer in range `2..N` (shape B only) → store `candidates[k-1]`.
- `help` → render the **Field-help** block for this field
  (description + target + example) without advancing state. Then
  restate the prompt above. Do NOT persist a mutation for the help
  render. (`?` is intentionally NOT a trigger — Claude Code binds it
  to a keyboard-shortcut overlay that intercepts the keystroke.)
- Anything else → restate with "I need a number from 1 to `<max>`,
  empty for the default, or type `help`. To cancel, type
  `cancel setup`."

State file mutation: after EACH item is resolved (not batched),
append to `mediumResolved` and persist.

EXIT: advance to INTERVIEW_STORY.

### States 4–9 — INTERVIEW\_\*

Shared ENTRY protocol for each INTERVIEW state:

- Read the state file. Determine this state's question list from the
  **QuestionId enumeration** below plus any rejected fields routed to
  this state from CONFIRM_HIGH (per the **Rejected-field re-ask
  routing** table).
- Apply the **Detection-skip matrix** (below the enumeration): for
  each `questionId` whose skip-field is present in
  `highConfirmedAccepted`, record
  `interviewAnswers[<questionId>] = "[auto-filled from <field>]"` and
  persist (same Storage rule applies — the value is always a string)
  BEFORE evaluating the already-answered skip-list.
- Skip any `questionId` already present in `interviewAnswers`
  (including auto-filled ones).
- Resume preamble (only if ANY questionId is already answered AND at
  least one remains): "Resuming `<STATE_NAME>`. Already have:
  `<comma-list>`. Next: `<next questionId>`."
- If ALL `questionId`s for this state are present, trivially-exit:
  persist a state update (only `currentState` and `updatedAt` change)
  and advance.
- Ask remaining questions in enumeration order. For each question,
  look up its `interactionMode` in the **Per-question interaction
  table** below and use the matching tool:
  - `selectable` / `multi-selectable` → `AskUserQuestion`
  - `hybrid` → pre-fill from the listed detection source, then offer
    accept / edit / replace
  - `free-text` → ordinary text prompt
  The Storage rule (`interviewAnswers[<questionId>]` must be a string)
  applies uniformly — no object shapes regardless of mode.
- **Reply classification** — before recording a reply as
  `interviewAnswers[<questionId>]`, classify it:
  - **Answer**: a response that plausibly fits the semantic scope of
    `<questionId>` (e.g., `arch.classification` expects one of the
    enum values or a short phrase about system shape; `story.audience`
    expects a description of people/roles). Record and advance.
  - **Skip trigger**: `skip` or `skip all` — rules below apply.
  - **Cancel trigger**: matches rule #4's regex — rule #4 applies.
  - **Back trigger**: starts with `back` — rule below applies.
  - **Everything else → OFF-TOPIC.** Apply rule #3: restate the
    pending question with the off-topic prefix. You MUST NOT record
    the reply in `interviewAnswers`. You MUST NOT advance
    `currentState` or the question pointer. Do NOT persist a mutation
    for this exchange. A topic-mismatched reply is not an answer just
    because it is a sentence — if the reply would land in a different
    section of SPEC.md than the one tied to this `<questionId>`, it is
    off-topic.

  Prefer off-topic when uncertain. An unnecessary restate costs one
  turn; a mis-filed answer corrupts the state file.
- `skip` on a question → record `interviewAnswers[<questionId>] =
"[skipped]"`, advance to the next question in this state.
- `skip all` → record every remaining `questionId` as `[skipped]`,
  exit the state.
- `back` → restate the current question with the prefix "I can't go
  back within a single setup run. Finish this run and edit the output
  files afterward." (rule #2).

State file mutation: after EACH question is answered or skipped,
persist via `worclaude setup-state save --from-file .claude/cache/setup-state.draft.json --path .`
(see rule #5) BEFORE rendering the next prompt. Resume granularity is
per-question.

EXIT: advance to the next state; INTERVIEW_VERIFICATION exits to
WRITE.

### State 10 — WRITE

ENTRY:

- Per rule #5's WRITE relaxation, read each of the six target files
  (missing → empty) and read `.claude/workflow-meta.json` for template
  hashes.
- Compose merged contents per the per-file merge rules below.
- Write each file. Per-file failure is recorded but does not abort
  the remaining writes.
- State file mutation: record `writeResults: { [file]: "ok" | "error:
<message>" }` and persist.

Per-file merge rules:

1. **`CLAUDE.md`** — ATX-heading-scoped replace. Replace ONLY the body
   of `## Tech Stack` and `## Commands` with generated content.
   Preserve every other section verbatim (user additions, critical
   rules, gotchas). If either target section is absent, append it at
   the end.
2. **`docs/spec/SPEC.md`** — full rewrite if empty or template-only;
   otherwise append a `## Additions from /setup (<ISO-date>)` section
   at the end.
3. **`.claude/skills/backend-conventions/SKILL.md`** — same rule as
   SPEC.md.
4. **`.claude/skills/frontend-design-system/SKILL.md`** — same rule.
5. **`.claude/skills/project-patterns/SKILL.md`** — same rule.
6. **`docs/spec/PROGRESS.md`** — never overwrite. Append a
   `## Setup notes (<ISO-date>)` section with detected stack summary
   and interview highlights.

**Template-hash lookup.** "Template-only" means the file's
CRLF-normalized SHA-256 matches the hash stored in
`.claude/workflow-meta.json` for that file. If the meta file is
missing or lacks the entry, treat the file as authored (safer
default: append, do not rewrite).

EXIT: advance to DONE.

### State 11 — DONE

ENTRY:

- Invoke `worclaude setup-state reset` to clear the state file.
- Print: "Setup complete. Wrote `<N>`/6 files. [If any errors: list
  them.] Review what I wrote and edit anything that looks off."

EXIT: terminal.

---

## QuestionId enumeration (load-bearing contract)

These IDs are the keys for `interviewAnswers`. `saveSetupState`
rejects keys outside this set (with the `<state>.unchecked.<field>`
prefix exception — see routing table).

**INTERVIEW_STORY** (section 1; residual after README + spec-docs
detection):

- `story.audience` — "Who is it for?"
- `story.problem` — "What problem does it solve?"
- `story.analogs` — "Any similar product you're modeling after?"

**INTERVIEW_ARCH** (section 2; `monorepo` detector flags presence
only):

- `arch.classification` — monolith / microservices / monorepo /
  serverless
- `arch.modules` — directory/module purposes. Prompt the user to
  mention in-house libraries and private-registry packages here.
- `arch.entities` — database entities (detector knows the ORM;
  entities are user knowledge).
- `arch.external_apis` — external APIs beyond SDK detection.
- `arch.stack_rationale` — WHY the detected framework/stack choices
  were made.

**INTERVIEW_FEATURES** (section 4; detection ~10%):

- `features.core` — list of core features.
- `features.nice_to_have` — nice-to-have features.
- `features.non_goals` — explicit non-goals.

**INTERVIEW_WORKFLOW** (section 5; residual after scripts,
env-variables, ci detection):

- `workflow.new_dev_steps` — setup steps beyond README.
- `workflow.env_values` — guidance for env variable values (detector
  has names only, not values).

**INTERVIEW_CONVENTIONS** (section 6; detection ~21%):

- `conventions.patterns` — code patterns the project uses.
- `conventions.errors` — error handling approach.
- `conventions.logging` — logging approach.
- `conventions.api_format` — API response format.
- `conventions.naming` — naming conventions.
- `conventions.rules` — never/always rules.

**INTERVIEW_VERIFICATION** (section 7; residual after testing + ci
detection):

- `verification.manual` — manual verification steps.
- `verification.staging` — staging/preview environment.
- `verification.required_checks` — CI required checks.

### Interaction mode

Each interview question is asked in ONE of four modes. The mode lives
next to the question in the table below. This controls which tool you
use to collect the answer — text input, menu, checklist, or hybrid.

- `selectable` — invoke the `AskUserQuestion` tool with the listed
  choices, `multiSelect: false`. The user gets arrow-key navigation.
  If the user picks "Other (I'll type my own)", follow up with a
  free-text prompt: "Go ahead — what's the value you'd like to use?".
- `multi-selectable` — invoke `AskUserQuestion` with `multiSelect:
  true` and the listed choices. Always prepend `None` as the first
  choice and append "Other (I'll type my own)" as the last. On
  "Other", follow up with free-text. The stored value joins selections
  with `, ` (e.g. `"REST, GraphQL"`). Selecting `None` alone stores
  `"none"`.
- `hybrid` — pre-fill a bullet list from detection (see the question
  row for which detection field feeds it) and ask: "I pre-filled this
  from your README/scan. Accept, edit, or replace?". `accept` stores
  the pre-filled text verbatim; `edit` offers free-text with the
  pre-fill visible; `replace` starts from empty.
- `free-text` — ordinary text prompt (default). No `AskUserQuestion`.

Regardless of mode, `interviewAnswers[<questionId>]` MUST be a string
per the Storage rule. For `multi-selectable`, join with `, `. For
`hybrid`, store the final accepted or edited text.

**Fallback.** If `AskUserQuestion` is unavailable in the current
Claude Code version (or the tool call fails), degrade to a
numbered-list free-text prompt using CONFIRM_HIGH-style parsing:

```
<question-label>:

  1. <choice 1>
  2. <choice 2>
  ...
  N+1. Other (I'll type my own)

Reply with the number of your choice, or type your own answer:
```

### Per-question interaction table

| questionId                     | Mode             | Choices (or pre-fill source)                                              |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------- |
| `story.audience`               | free-text        | —                                                                         |
| `story.problem`                | free-text        | —                                                                         |
| `story.analogs`                | free-text        | —                                                                         |
| `arch.classification`          | selectable       | monolith, modular monolith, microservices, serverless, library, CLI, other |
| `arch.modules`                 | free-text        | —                                                                         |
| `arch.entities`                | free-text        | —                                                                         |
| `arch.external_apis`           | multi-selectable | `<detected externalApis>` + None + Other                                  |
| `arch.stack_rationale`         | free-text        | —                                                                         |
| `features.core`                | hybrid           | pre-fill from readme bullets (projectDescription / headings)              |
| `features.nice_to_have`        | hybrid           | pre-fill from readme bullets                                              |
| `features.non_goals`           | hybrid           | empty pre-fill (always edit from scratch unless user picks `accept`)      |
| `workflow.new_dev_steps`       | free-text        | —                                                                         |
| `workflow.env_values`          | free-text        | —                                                                         |
| `conventions.patterns`         | free-text        | —                                                                         |
| `conventions.errors`           | selectable       | throw, Result<T,E>, null, silent catch, mixed, other                      |
| `conventions.logging`          | selectable       | console, structured JSON, dedicated logger, none, other                   |
| `conventions.api_format`       | selectable       | REST, GraphQL, gRPC, none, other                                          |
| `conventions.naming`           | free-text        | —                                                                         |
| `conventions.rules`            | free-text        | —                                                                         |
| `verification.manual`          | free-text        | —                                                                         |
| `verification.staging`         | selectable       | yes, no                                                                   |
| `verification.required_checks` | multi-selectable | `<detected ci.workflows>` + None + Other                                  |

10 non-default entries: 5 `selectable`, 2 `multi-selectable`, 3
`hybrid`. The other 12 questions stay `free-text`.

### Rejected-field re-ask routing

Fields in `highConfirmedRejected` are re-asked as one sub-question
each in the INTERVIEW state that matches the field's natural section.

| Rejected field                       | Re-asked in            | Answer key                       |
| ------------------------------------ | ---------------------- | -------------------------------- |
| `readme`, `specDocs`                 | INTERVIEW_STORY        | `story.unchecked.<field>`        |
| `packageManager`, `language`         | INTERVIEW_ARCH         | `arch.unchecked.<field>`         |
| `frameworks`, `orm`, `monorepo`      | INTERVIEW_ARCH         | `arch.unchecked.<field>`         |
| `deployment`, `externalApis`         | INTERVIEW_ARCH         | `arch.unchecked.<field>`         |
| `scripts`, `envVariables`, `linting` | INTERVIEW_WORKFLOW     | `workflow.unchecked.<field>`     |
| `ci`                                 | INTERVIEW_WORKFLOW     | `workflow.unchecked.<field>`     |
| `testing`                            | INTERVIEW_VERIFICATION | `verification.unchecked.<field>` |

`<state>.unchecked.<field>` keys are the ONLY keys outside the
enumeration that `saveSetupState` accepts, matched by prefix. The
`<field>` segment must exactly match a known detector field name AND
the routing table must map that field to that state prefix.

### Detection-skip matrix

A question in this table is **auto-skipped** when the listed detection
field is in `highConfirmedAccepted` (i.e., accepted at CONFIRM_HIGH
and not rejected). Record the skipped answer in `interviewAnswers` as
`"[auto-filled from <field>]"` BEFORE evaluating the already-answered
skip-list. This prevents the interview from re-asking questions the
scanner already answered.

| questionId              | Skip when in `highConfirmedAccepted`           | Notes                                    |
| ----------------------- | ---------------------------------------------- | ---------------------------------------- |
| `story.problem`         | `readme` (medium) with non-empty description  | README already describes the problem.    |
| `arch.classification`   | `monorepo` (high)                              | Pre-fill `"monorepo"`.                   |
| `arch.external_apis`    | `externalApis` (high)                          | Direct mapping.                          |
| `workflow.new_dev_steps`| `scripts` (high) AND `readme` (medium)         | Both must be present.                    |

All OTHER `questionId`s are always asked — the scanner cannot infer
them (audience, rationale, conventions, features, etc. are user
knowledge the detector has no access to).

### Field-help table

Drives the `help` command (CONFIRM_HIGH, CONFIRM_MEDIUM, and
INTERVIEW states) AND the "→ Will be saved as: `<target>`" line on
every CONFIRM prompt. Keep the `<target>` column stable — parsers
downstream don't match on it, but users read it for orientation.

Detection fields (used at CONFIRM_HIGH and CONFIRM_MEDIUM):

| Field            | Plain-English description                                     | `<target>` (where accepting lands)                          | Example answer                            |
| ---------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `ci`             | Which CI provider + workflow files run on push/PR             | `## Verification` section of `docs/spec/SPEC.md`            | `GitHub Actions, 2 workflows`             |
| `deployment`     | Where the app gets deployed                                   | `## Architecture` section of `docs/spec/SPEC.md`            | `Vercel`                                  |
| `envVariables`   | Names of env variables the project reads                      | `## Workflow` section of `docs/spec/SPEC.md`                | `DATABASE_URL, STRIPE_SECRET_KEY`         |
| `externalApis`   | Third-party APIs / SDKs the project integrates with           | `backend-conventions/SKILL.md` External APIs section        | `Stripe, Sentry`                          |
| `frameworks`     | Application frameworks the project uses                       | `## Tech Stack` section of `CLAUDE.md`                      | `Next.js 14.2.3, React 18.2.0`            |
| `language`       | Primary source language                                       | `## Tech Stack` section of `CLAUDE.md`                      | `TypeScript`                              |
| `linting`        | Linters + formatters the project runs                         | `## Tech Stack` section of `CLAUDE.md`                      | `ESLint, Prettier`                        |
| `monorepo`       | Whether the repo is a monorepo + which tool                   | `## Architecture` section of `docs/spec/SPEC.md`            | `pnpm (3 packages)`                       |
| `orm`            | Database ORM / schema driver                                  | `## Tech Stack` of `CLAUDE.md` + backend-conventions/SKILL  | `Prisma`                                  |
| `packageManager` | How you install dependencies                                  | `## Tech Stack` of `CLAUDE.md` + `## Commands`              | `pnpm`                                    |
| `readme`         | Project description pulled from `README.md`                   | `## Overview` section of `docs/spec/SPEC.md`                | a paragraph of text                       |
| `scripts`        | dev / test / build / lint script names                        | `## Commands` section of `CLAUDE.md`                        | `dev=dev test=test build=build lint=lint` |
| `specDocs`       | Spec / design docs already present in the repo                | `## Overview` of `docs/spec/SPEC.md` (referenced, not copied) | `2 docs`                                  |
| `testing`        | Test framework + config file                                  | `## Verification` of `docs/spec/SPEC.md`                    | `vitest (vitest.config.ts)`               |

Interview questions (used at INTERVIEW states):

| `questionId`                   | Plain-English description                                 | `<target>`                                                     | Example answer                                |
| ------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| `story.audience`               | Who is this project for?                                  | `## Overview` of `docs/spec/SPEC.md`                           | `internal developers maintaining our CLI`     |
| `story.problem`                | What problem does it solve?                               | `## Overview` of `docs/spec/SPEC.md`                           | `scaffolds a worclaude workflow into any repo` |
| `story.analogs`                | Similar products / projects you're modeling after         | `## Overview` of `docs/spec/SPEC.md`                           | `create-react-app, but for Claude workflows`  |
| `arch.classification`          | System shape: monolith / services / library / CLI / etc.  | `## Architecture` of `docs/spec/SPEC.md`                       | `modular monolith`                            |
| `arch.modules`                 | Directory purposes and in-house packages                  | `## Architecture` of `docs/spec/SPEC.md`                       | `src/commands — CLI entry points`             |
| `arch.entities`                | Core database entities (if applicable)                    | `## Architecture` of `docs/spec/SPEC.md`                       | `User, Project, Session`                      |
| `arch.external_apis`           | External APIs beyond SDK detection                        | `## Architecture` of `docs/spec/SPEC.md`                       | `Stripe, Sentry`                              |
| `arch.stack_rationale`         | Why these framework/stack choices                         | `## Architecture` of `docs/spec/SPEC.md`                       | `pnpm for workspace perf`                     |
| `features.core`                | Must-have features                                        | `## Features` of `docs/spec/SPEC.md`                           | `init / upgrade / doctor / scan`              |
| `features.nice_to_have`        | Nice-to-have features                                     | `## Features` of `docs/spec/SPEC.md`                           | `plugin.json generation`                      |
| `features.non_goals`           | Explicit non-goals                                        | `## Features` of `docs/spec/SPEC.md`                           | `no Windows-specific path handling`           |
| `workflow.new_dev_steps`       | Dev setup steps beyond README                             | `## Workflow` of `docs/spec/SPEC.md`                           | `copy .env.example → .env then fill secrets`  |
| `workflow.env_values`          | Guidance for env var values                               | `## Workflow` of `docs/spec/SPEC.md`                           | `DATABASE_URL: local Postgres on :5432`       |
| `conventions.patterns`         | Code patterns the project uses                            | `project-patterns/SKILL.md`                                    | `Result<T, E> for fallible ops`               |
| `conventions.errors`           | Error-handling approach                                   | `backend-conventions/SKILL.md`                                 | `throw / Result<T,E> / silent catch`          |
| `conventions.logging`          | Logging approach                                          | `backend-conventions/SKILL.md`                                 | `pino structured logger`                      |
| `conventions.api_format`       | API response shape                                        | `backend-conventions/SKILL.md`                                 | `REST JSON: {data, error}`                    |
| `conventions.naming`           | Naming conventions (vars, files, branches)                | `project-patterns/SKILL.md`                                    | `camelCase TS / snake_case Python / kebab branches` |
| `conventions.rules`            | Never / always project rules                              | `project-patterns/SKILL.md`                                    | `never push to main`                          |
| `verification.manual`          | Manual verification steps                                 | `## Verification` of `docs/spec/SPEC.md`                       | `run /init against tmp/ and eyeball output`   |
| `verification.staging`         | Whether there's a staging / preview env                   | `## Verification` of `docs/spec/SPEC.md`                       | `yes — Vercel preview per PR`                 |
| `verification.required_checks` | CI required checks gating merge                           | `## Verification` of `docs/spec/SPEC.md`                       | `tests, lint, type-check`                     |

Help-render format when the user types `help` at a CONFIRM or INTERVIEW
prompt — render in a fenced code block:

```
Help — <formatField(field) or questionId>

  What it is: <description>
  Will be saved as: <target>
  Example answer: <example>
```

For CONFIRM_HIGH (multiple fields on one prompt), render one Help
block per item. After rendering help, restate the original prompt
verbatim without advancing.

---

## Field rendering table

Reproduced from the scanner's `summarizeValue` semantics. Used in
CONFIRM_HIGH and CONFIRM_MEDIUM to render `<renderValue(item)>`.

| `field`          | `item.value` shape                             | Rendered as                                                          |
| ---------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `packageManager` | string                                         | `<value>` (shape-B medium → render `candidates` one per line)        |
| `language`       | string                                         | `<value>`                                                            |
| `frameworks`     | `[{name, version}, ...]`                       | `Name Version, Name Version` joined by `, ` (missing version → just `Name`) |
| `testing`        | `{framework, configFile, ...}`                 | `<framework> (<configFile>)` — if `configFile` null: `<framework>`    |
| `linting`        | `string[]`                                     | joined by `, ` (empty → omit this item)                              |
| `orm`            | `{name, schemaFile}`                           | `<name>`                                                             |
| `deployment`     | string                                         | `<value>`                                                            |
| `ci`             | `{provider, workflows: string[]}`              | `<provider>, <N> workflow(s)` (singular when `N === 1`)              |
| `scripts`        | `{dev, test, build, lint, ...}`                | `dev=<dev.key> test=<test.key> build=<build.key> lint=<lint.key>` — omit null slots; all null → `(no standard scripts)` |
| `envVariables`   | `{names: string[], inferredServices: [...]}`   | `<N> variable(s)` (singular when `N === 1`; 0 → omit)                |
| `externalApis`   | `string[]`                                     | joined by `, ` (empty → omit)                                        |
| `readme`         | `{projectDescription, ...}`                    | `<projectDescription>` rendered verbatim; soft-wrap at 100 chars per line for display only (no `…` truncation — user needs the full text to decide whether to accept) |
| `specDocs`       | `[{path, firstHeading}, ...]`                  | `<N> doc(s)` (empty → omit)                                          |
| `monorepo`       | `{tool, packagePaths, ...}`                    | `<tool> (<N> packages)`                                              |
| fallback scalar  | string / number / boolean                      | `String(value)`                                                      |

`formatField(field)` inserts a space before each uppercase letter and
capitalizes the first character — every word ends up Title-Cased:
`packageManager` → `Package Manager`, `envVariables` →
`Env Variables`, `externalApis` → `External Apis`, `specDocs` →
`Spec Docs`. Render exactly what `formatField` produces — do not
retitle `External Apis` as `External APIs` or similar; the parser
matches the scanner's output, not natural-language acronym casing.

---

## WRITE composition (which state data flows to which file)

For each target file, compose content from detection + `mediumResolved` +
`interviewAnswers` per this mapping:

- **`CLAUDE.md`** Tech Stack ← `packageManager`, `language`,
  `frameworks`, `orm`, `testing`, `linting`. Commands ← `scripts` +
  `workflow.unchecked.scripts`.
- **`docs/spec/SPEC.md`** ← Overview (`story.*`); Architecture
  (`arch.*`, `frameworks`, `monorepo`, `deployment`); Features
  (`features.*`); Workflow (`workflow.*`, `scripts`, `ci`,
  `envVariables`); Conventions (`conventions.*`); Verification
  (`verification.*`, `testing`, `ci`).
- **`backend-conventions/SKILL.md`** ← `conventions.errors`,
  `conventions.logging`, `conventions.api_format`, `orm`,
  `externalApis`.
- **`frontend-design-system/SKILL.md`** ← detected frontend
  frameworks (`react`, `vue`, `svelte`, `next`, `nuxt` — if present in
  `frameworks`) + design-system residuals from interview answers.
- **`project-patterns/SKILL.md`** ← `conventions.patterns`,
  `conventions.naming`, `conventions.rules`, `arch.classification`,
  `arch.modules`.
- **`docs/spec/PROGRESS.md`** ← `## Setup notes (<ISO-date>)`
  appended; detected stack summary + interview highlights.

---

## Trigger Phrases

- "set up the project"
- "configure this project"
- "project interview"
- "run setup"
