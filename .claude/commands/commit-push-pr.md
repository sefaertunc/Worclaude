1. Stage all changes: git add -A
2. Write a clear, conventional commit message
3. Push to the current branch
4. Create a PR with:
   - Clear title matching conventional commit format
   - Description of changes
   - Testing done
   - Any notes for reviewers

Branch targeting rules:

- Feature/bugfix branches → PR targets `develop` (`gh pr create --base develop`)
- When on `develop` → PR targets `main` (`gh pr create --base main`) — release merges only

Use `gh pr create` for PR creation.
