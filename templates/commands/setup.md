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
   - Shell: `worclaude setup-state save --stdin --path .` (pipe the
     updated state JSON via stdin — the ONLY way state is persisted)
   - Shell: `worclaude setup-state reset --path .`
   - Shell: `worclaude setup-state resume-info --path .`
   - Read: `.claude/cache/detection-report.json`
   - Read: `.claude/cache/setup-state.json`

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

- State file mutation: write a fresh state with `currentState: "SCAN"`,
  `startedAt` and `updatedAt` set to now, `detectionReportPath:
".claude/cache/detection-report.json"`, empty arrays/objects for the
  remaining fields. Persist via `worclaude setup-state save --stdin`.

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
  block):

  ```
  I scanned your project. Please confirm the high-confidence
  detections below. Reply with the numbers of any items that are
  WRONG (e.g., "2, 5"), or reply "ok" to accept all.

    [x] 1. <formatField(item1.field)>: <renderValue(item1)> (from <item1.source>)
    [x] 2. ...

  Your response:
  ```

  `<formatField>` and `<renderValue>` are defined in the **Field
  rendering table** below.

Response parsing (case-insensitive, whitespace trimmed):

- `ok` | `yes` | `all good` | `""` → accept all; set
  `highConfirmedAccepted` to all item field names in rendered order;
  `highConfirmedRejected: []`.
- One or more integers (comma or space separated) in range 1..N →
  those items are rejected; split fields into accepted/rejected
  accordingly (in rendered order).
- Anything else (including integers out of range) → rule #3 fires:
  restate with "I need either 'ok' or numbers from 1 to `<N>` matching
  the items above (e.g., '2, 5'). To cancel, type `cancel setup`."

State file mutation: persist the updated arrays via
`worclaude setup-state save --stdin`.

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
    2. Other (I'll type my own)

  Reply with the number of your choice (default: 1):
  ```

  **Shape B — `candidates` is a non-empty array** (emitted by
  `package-manager` when multiple lockfile groups disagree):

  ```
  <formatField(field)> (detected from <source>):

    1. <candidates[0]>
    2. <candidates[1]>
    ...
    N. <candidates[N-1]>
    N+1. Other (I'll type my own)

  Reply with the number of your choice (default: 1):
  ```

  `candidates[0]` equals `item.value` — default-1 accepts the detected
  value.

Response parsing (per item):

- `""` | `1` | `default` → accept item 1 (the detected value).
- The final "Other" number (`2` in shape A, `N+1` in shape B) →
  follow-up free-text prompt: "Go ahead — what's the value you'd like
  to use?". Record the trimmed reply as the answer.
- Integer in range `2..N` (shape B only) → accept `candidates[k-1]`.
- Anything else → restate with "I need a number from 1 to `<max>`, or
  empty for the default. To cancel, type `cancel setup`."

State file mutation: after EACH item is resolved (not batched),
append to `mediumResolved` and persist.

EXIT: advance to INTERVIEW_STORY.

### States 4–9 — INTERVIEW\_\*

Shared ENTRY protocol for each INTERVIEW state:

- Read the state file. Determine this state's question list from the
  **QuestionId enumeration** below plus any rejected fields routed to
  this state from CONFIRM_HIGH (per the **Rejected-field re-ask
  routing** table).
- Skip any `questionId` already present in `interviewAnswers`.
- Resume preamble (only if ANY questionId is already answered AND at
  least one remains): "Resuming `<STATE_NAME>`. Already have:
  `<comma-list>`. Next: `<next questionId>`."
- If ALL `questionId`s for this state are present, trivially-exit:
  persist a state update (only `currentState` and `updatedAt` change)
  and advance.
- Ask remaining questions conversationally, in enumeration order.
- `skip` on a question → record `interviewAnswers[<questionId>] =
"[skipped]"`, advance to the next question in this state.
- `skip all` → record every remaining `questionId` as `[skipped]`,
  exit the state.
- `back` → restate the current question with the prefix "I can't go
  back within a single setup run. Finish this run and edit the output
  files afterward." (rule #2).
- Rule #3 applies within interview states: off-topic replies trigger
  a restatement of the pending question, not an answer to the
  off-topic question.

State file mutation: after EACH question is answered or skipped,
persist via `worclaude setup-state save --stdin` BEFORE rendering the
next prompt. Resume granularity is per-question.

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
| `readme`         | `{projectDescription, ...}`                    | `<projectDescription>` truncated to 80 chars with `…` suffix          |
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
