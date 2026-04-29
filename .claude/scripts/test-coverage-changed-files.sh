#!/usr/bin/env bash
# List files changed since the last release tag (or last 10 commits if no tag).
# Invoke as a single command:
#   bash .claude/scripts/test-coverage-changed-files.sh
# Output is one filename per line, sorted and de-duplicated.
set -eu

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$LAST_TAG" ]; then
  git log "$LAST_TAG"..HEAD --name-only --pretty=format: 2>/dev/null | sort -u | grep -v '^$' || true
else
  git diff --name-only HEAD~10 2>/dev/null || true
fi
