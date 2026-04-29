#!/usr/bin/env bash
# Drift detection for /start. Invoke as a single command:
#   bash .claude/scripts/start-drift.sh
# Bundling this in a script avoids per-line permission prompts that fire on
# multi-line bash with X=$(...) patterns (env-var-prefixed substitution
# is not covered by Bash(cmd:*) allow rules).
set -eu

LAST_SESSION=$(ls -t .claude/sessions/*.md 2>/dev/null | head -1 || true)
LAST_SHA=""
if [ -n "$LAST_SESSION" ]; then
  LAST_SHA=$(awk '/^sha:/ {print $2; exit}' "$LAST_SESSION" 2>/dev/null || true)
fi

if [ -n "$LAST_SHA" ] && git rev-parse --verify --quiet "$LAST_SHA" >/dev/null 2>&1; then
  echo "Commits since last session SHA ($LAST_SHA):"
  git log --oneline "$LAST_SHA"..HEAD 2>/dev/null | head -15
elif [ -n "$LAST_SESSION" ]; then
  SESSION_DATE=$(echo "$LAST_SESSION" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
  echo "Commits since last session ($SESSION_DATE):"
  git log --oneline --since="$SESSION_DATE" 2>/dev/null | head -15
else
  echo "No previous session found. Recent commits:"
  git log --oneline -10 2>/dev/null
fi

echo ""
echo "Current branch:"
git branch --show-current 2>/dev/null
