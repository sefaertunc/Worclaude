---
description: "Update PROGRESS.md, SPEC.md, and version after merging PRs on develop"
---

Update shared-state files after merging feature PRs into develop.
Run this on the develop branch AFTER all PRs are merged and any
conflicts are resolved.

ONLY update shared-state files — do not resolve conflicts. That is
/conflict-resolver's job. If you detect unresolved conflicts, stop
and tell the user to run /conflict-resolver first.

## Pre-check

1. Confirm you are on the develop branch. If not, stop and warn.
2. Check for unresolved conflict markers in tracked files.
   If found, stop: "Run /conflict-resolver first."
3. Read git log to understand what was merged since the last sync
   or version tag. If nothing was merged, report "Nothing to sync"
   and stop.

## Update PROGRESS.md

4. Update docs/spec/PROGRESS.md:
   - Mark completed items based on merged work
   - Update "Last Updated" date to today
   - Update Stats section by checking actual project values
     (run the test suite, count source files, etc.)
   - Move "In Progress" items to "Completed" if their PRs merged
   - Update "Next Steps" if needed

## Update SPEC.md

5. If any merged PRs added features or changed behavior, update
   docs/spec/SPEC.md to reflect the current state.
   If nothing changed spec-wise, leave it alone.

## Bootstrap: ensure a version tag exists

6. Check for a version tag:

   ```bash
   LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
   ```

   If no tag exists, prompt the user. Do NOT silently auto-tag:

   ```
   No version tag found. /sync needs a starting tag to compute release scope.

   Proposed: tag current HEAD as v0.1.0

   - yes      → create v0.1.0 tag at HEAD and continue
   - custom   → specify your own starting version (e.g., v1.0.0 if this
                project had releases before adopting this workflow)
   - cancel   → stop; tag manually before re-running

   Choose (yes / custom / cancel):
   ```

   On "yes": `git tag v0.1.0 && git push origin v0.1.0`, then set
   `LAST_TAG="v0.1.0"`.

   On "custom": prompt for the version string. Accept any string matching
   `^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$` (semver with
   optional pre-release and build metadata, e.g. `v1.0.0-rc.1`, `v2.0.0+build.5`).
   Reject non-matching input with a clear message and re-prompt. Then tag
   and push as above.

   On "cancel": exit cleanly with "Tag the current state manually before
   re-running /sync."

   If `git push origin {tag}` fails (fork clone, expired credentials,
   network): the local tag is already created and valid. Report:
   "Local tag created but push failed — retry with `git push origin {tag}`
   manually before opening a release PR." Then exit cleanly.

   After bootstrap, proceed to step 7. Expect "Nothing publishable since
   {tag}" if no PRs have been merged yet — that is correct behavior for
   a first-release bootstrap, not an error.

## Aggregate version bumps from merged PRs

7. Collect `Version bump:` declarations from all PRs merged into develop
   since the last version tag. Use `%as` for the date format (strict
   YYYY-MM-DD; `%ai` breaks GitHub search due to space separator and
   timezone offset). Pass `--limit 500` to avoid the `gh pr list` default
   cap of 30, which would silently truncate on repos with infrequent
   tagging:

   ```bash
   SINCE=$(git log -1 --format=%as "$LAST_TAG")
   gh pr list --state merged --base develop \
     --limit 500 \
     --search "merged:>=$SINCE" \
     --json number,title,body,headRefName,baseRefName
   ```

   Filter out release PRs — any PR with `headRefName: develop` AND
   `baseRefName: main` is a release PR from a prior `/sync` run, not an
   input. Skip those.

   For each remaining PR, extract the `Version bump:` line from the body.
   Valid values: `major`, `minor`, `patch`, `none`.

   Missing declarations: treat as `none` and add to a warning list
   (carried through to step 9's summary and step 10's CHANGELOG entry).
   Do NOT guess a higher value. Do NOT stop.

8. Compute the release bump using precedence: `major > minor > patch > none`.
   - If the highest is `none`: update PROGRESS.md and SPEC.md if needed,
     commit those, push, and stop. Do NOT bump the version. Do NOT open
     a PR to main. Report:

     ```
     Nothing publishable since {last-tag}. Shared state updated.
     ```

   - If the highest is `patch`, `minor`, or `major`: proceed to step 9.

9. Summarize the release group for the user and ask for confirmation.
   Always prompt, including for `major` — that's exactly when the human
   sanity-check is most valuable.

   If the warnings list from step 7 is empty, omit the warnings section
   entirely — do NOT render an empty block or a "no warnings" line.

   Summary format (warnings section included only when warnings exist):

   ```
   Release group since {last-tag}:
   - #{num} {title} — {bump}
   - #{num} {title} — {bump}
   - ...

   ⚠ PRs without Version bump: declaration (treated as none):
   - #{num} {title}
   - ...

   Proposed version: {old} → {new} ({highest-bump})

   Ship now, or wait for more work to land? (ship/wait)
   ```

   If the user says "wait", stop without bumping. They will re-run `/sync`
   later when more PRs have merged.

10. On "ship":

    a. Update the `version` field in `package.json` to the new version.

    b. Append to `CHANGELOG.md` at the top of the entries list (after the
       `# Changelog` header and the `## [Unreleased]` marker if present).
       If `CHANGELOG.md` does not exist, create it with this header:

       ```markdown
       # Changelog

       All notable changes to this project are documented in this file.
       Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
       versions follow [semver](https://semver.org/).

       ## [Unreleased]
       ```

       The new entry format:

       ```markdown
       ## [{new-version}] — {YYYY-MM-DD}

       {one-paragraph prose summary of what this release does — synthesize
       from the merged PR titles and bodies; no bullet list in the summary}

       ### {Section}

       - {bullet per PR mapped to its section, including PR number}
       ```

       Section mapping — the declared bump determines the MINIMUM section,
       but each PR's content governs its actual placement. PRs may be filed
       under any of `### Added` / `### Changed` / `### Fixed` / `### Tests` /
       `### Docs` as content warrants. Do not force a mapping that fights
       the content.

       Defaults when content is ambiguous:
       - `major`, `minor` → default `### Added` (or `### Changed` for
         breaking changes)
       - `patch` → default `### Fixed` (but `### Added` is fine for
         patch-level additive surface like new optional flags)
       - `none` with warning → `### Changed` with ⚠ prefix noting
         "no Version bump declaration — under-documented"

       If a release mixes levels, each PR goes under its own section.
       Multiple sections per release entry are standard.

       The warning list from step 9 MUST appear in the CHANGELOG entry as
       ⚠-prefixed bullets under `### Changed` — not just in the transient
       prompt. This is how under-documentation becomes permanent record.

    c. Refresh tech-stack metrics in CLAUDE.md and AGENTS.md.

       Both files commonly include a line like `Vitest (804 tests, 58 files)`
       or `npm test    # Run tests (804 tests, 58 files)`. These drift
       silently as tests are added or moved.

       - Run the project's test runner with a JSON-capable reporter and
         capture the totals. Examples:
         - Node/Vitest: `npx vitest run --reporter=json --outputFile=/tmp/_vitest.json && jq '.numTotalTests, (.testResults | length)' /tmp/_vitest.json`
         - Node/Jest: `npx jest --json --outputFile=/tmp/_jest.json && jq '.numTotalTests, (.testResults | length)' /tmp/_jest.json`
         - Python/pytest: `pytest --json-report --json-report-file=/tmp/_pytest.json -q && jq '.summary.total, (.tests | map(.nodeid | split("::")[0]) | unique | length)' /tmp/_pytest.json`
         - Cargo test: count lines from `cargo test --no-run --message-format=json | jq -s '[.[] | select(.profile.test == true)] | length'`

       - Search CLAUDE.md and AGENTS.md for any line matching the pattern
         `\d+ tests?, \d+ files?`. Update each match with the captured
         counts. If neither file contains such a line, skip silently — not
         every project surfaces these metrics.

       - Do NOT add the metrics line if it isn't already there. This step
         only refreshes existing claims; introducing new ones is a project
         decision, not a `/sync` decision.

## Verify

11. Run /verify to confirm tests and lint pass.
    If anything fails, fix it before proceeding.

## Commit, push, and PR

12. git add -A
13. git commit -m "chore: sync progress, spec, and version to [new version]"
    Use exactly this message format — no trailers or Co-Authored-By lines.
14. git push origin develop
15. Create the PR to main. Use the release group summary from step 9 as the
    PR body verbatim (including any warnings block) — that becomes the
    release notes:

    ```bash
    gh pr create --base main --title "release: v{new-version}" --body "{step-9-summary}"
    ```

    The maintainer then manually creates a GitHub Release against main
    with tag vX.Y.Z — that triggers the release.yml workflow which
    publishes to npm with provenance. /sync does not publish.

## Trigger Phrases
- "sync progress"
- "update shared files"
- "post-merge sync"
