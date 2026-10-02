#!/bin/sh
# Build the Theme-Lab graph (test content + themes/inkwell-<variant>.css as custom.css) and open it in Logseq.
#
#   npm run lab                          # create Theme-Lab with the slate variant if it doesn't exist
#   npm run lab -- --variant blue        # use another variant
#   npm run lab -- --rebuild             # remove and recreate it (DESTROYS feedback — run lab:feedback first)
#
# Env: LAB_GRAPH (default Theme-Lab), LOGSEQ_APP (default /Applications/Logseq-DB.app)
set -eu

GRAPH="${LAB_GRAPH:-Theme-Lab}"
APP="${LOGSEQ_APP:-/Applications/Logseq-DB.app}"
DIR="$(cd "$(dirname "$0")" && pwd)"
EDN="$DIR/theme-lab.edn"
LOG="$HOME/logseq/graphs/$GRAPH/db-worker-node-$(date +%Y%m%d).log"
REBUILD=0
VARIANT=slate
while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild) REBUILD=1 ;;
    --variant) VARIANT="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

# Guards: --rebuild runs `logseq graph remove`, so only ever touch a dedicated test graph,
# and the variant name becomes a file path, so keep it to plain slug characters.
case "$GRAPH" in
  Theme-Lab|Theme-Lab-*|Inkwell-*) ;;
  *) echo "refusing graph '$GRAPH': lab graphs must be named Theme-Lab, Theme-Lab-* or Inkwell-*" >&2; exit 2 ;;
esac
case "$GRAPH" in *[![:alnum:]-]*) echo "refusing graph '$GRAPH': letters, digits and '-' only" >&2; exit 2 ;; esac
case "$VARIANT" in ''|*[![:lower:][:digit:]-]*) echo "invalid variant '$VARIANT': use a palette id like slate" >&2; exit 2 ;; esac

LAB_VARIANT="$VARIANT" python3 "$DIR/build_theme_lab.py"

if logseq graph list | grep -qx "[* ] $GRAPH"; then
  if [ "$REBUILD" != 1 ]; then
    echo "Graph '$GRAPH' exists. Use 'npm run lab -- --rebuild' to recreate it (feedback in it will be lost)."
    exit 1
  fi
  logseq graph remove --graph "$GRAPH"
fi

logseq graph create --graph "$GRAPH"
before=$( [ -f "$LOG" ] && wc -l < "$LOG" || echo 0 )
logseq graph import --graph "$GRAPH" --type edn --input "$EDN" --timeout-ms 60000

# The import exits 0 even when the worker rejects the EDN: check the log and the result.
if [ -f "$LOG" ] && tail -n +"$((before + 1))" "$LOG" | grep -q "EDN validation error"; then
  tail -n +"$((before + 1))" "$LOG" | grep "EDN validation error" >&2
  exit 1
fi
logseq graph validate --graph "$GRAPH"
logseq query --graph "$GRAPH" --query '[:find ?n . :where [?f :file/path "logseq/custom.css"] [?f :file/content ?c] [(count ?c) ?n]]' \
  | grep -q '[1-9]' || { echo "custom.css was not imported" >&2; exit 1; }
logseq server stop --graph "$GRAPH" >/dev/null 2>&1 || true

PAGE=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("Theme Lab — Start Here"))')
open -a "$APP" "logseq://graph/$GRAPH?page=$PAGE"
echo "Opened $GRAPH ($VARIANT) in $APP"
