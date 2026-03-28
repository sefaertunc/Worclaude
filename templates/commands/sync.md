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

## Version bump

6. Determine version bump using the Versioning Policy in
   git-conventions.md. If bump needed: update version in package.json.

## Verify

7. Run /verify to confirm tests and lint pass.
   If anything fails, fix it before proceeding.

## Commit, push, and PR

8. git add -A
9. git commit -m "chore: sync progress, spec, and version to [new version]"
10. git push origin develop
11. gh pr create --base main with description of what was merged
