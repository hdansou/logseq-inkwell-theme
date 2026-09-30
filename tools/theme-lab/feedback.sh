#!/bin/sh
# Snapshot the Theme-Lab feedback page into feedback/<date>.md (safe while the app has the graph open:
# the CLI reuses the app's worker).
set -eu

GRAPH="${LAB_GRAPH:-Theme-Lab}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/feedback/$(date +%Y-%m-%d).md"
mkdir -p "$ROOT/feedback"

{
  echo "# Theme-Lab feedback — $(date +%Y-%m-%d)"
  echo
  echo '```'
  logseq show --graph "$GRAPH" --page "Theme Lab — Feedback" --level 6
  echo '```'
} > "$OUT"
echo "Wrote $OUT"
