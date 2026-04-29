#!/usr/bin/env bash
# Resolve the last release tag and its commit date (YYYY-MM-DD) for /sync.
# Invoke as a single command:
#   bash .claude/scripts/sync-release-scope.sh
# Output: two key=value lines suitable for downstream parsing.
#   last_tag=v1.2.3
#   since=2026-04-01
# When no tag exists, both values are empty and /sync should bootstrap one.
set -eu

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
SINCE=""
if [ -n "$LAST_TAG" ]; then
  SINCE=$(git log -1 --format=%as "$LAST_TAG" 2>/dev/null || echo "")
fi

printf 'last_tag=%s\nsince=%s\n' "$LAST_TAG" "$SINCE"
