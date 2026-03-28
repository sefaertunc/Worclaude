You are resolving merge conflicts. ONLY resolve conflicts — do not
update PROGRESS.md, SPEC.md, or bump versions. That is /sync's job.

## Step 1: Detect

Run: git status
Identify all files with merge conflicts (listed as "both modified").
If no conflicts found, report "No conflicts detected" and stop.

## Step 2: Understand

For each conflicted file:
- Read the file and find all <<<<<<< / ======= / >>>>>>> markers
- Understand what EACH side was trying to do
- Check git log for both branches to understand the intent

## Step 3: Resolve

For each conflict:
- Changes in DIFFERENT parts of the code → keep both
- Changes modify the SAME lines → combine intelligently based on intent
- Changes truly contradict → ask the user which to keep
- NEVER silently drop changes from either side

## Step 4: Verify clean

Search ALL tracked files for remaining conflict markers
(<<<<<<, =======, >>>>>>>). If any remain, resolve them.

## Step 5: Test

Run /verify (or the project's test and lint commands).
If anything fails, fix it.

## Step 6: Commit resolution only

- git add -A
- git commit -m "merge: resolve conflicts on develop"

Do NOT push. Do NOT create a PR. The user will run /sync next.
