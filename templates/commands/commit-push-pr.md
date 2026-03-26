1. Update docs/spec/PROGRESS.md with what was completed this session
2. Stage all changes: git add -A
3. Write a clear, conventional commit message
4. Push to the current branch
5. Create a PR with:
   - Clear title matching conventional commit format
   - Description of changes
   - Testing done
   - Any notes for reviewers

Branch targeting rules:

- Feature/bugfix branches → PR targets `develop` (`gh pr create --base develop`)
- When on `develop` → PR targets `main` (`gh pr create --base main`) — release merges only

Use `gh pr create` for PR creation.
