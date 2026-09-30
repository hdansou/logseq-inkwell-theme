#!/bin/sh
# Build the marketplace release zip: dist/logseq-inkwell-theme-<version>.zip.
# Files sit at the zip root (package.json next to themes/), as the Logseq installer expects.
# Only what a user needs ships: no src/, tests/, tools/ or docs/.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME=$(node -p 'require("./package.json").name')
VERSION=$(node -p 'require("./package.json").version')
OUT="dist/$NAME-$VERSION.zip"

# The generated themes must match src/ (npm test checks this among the rest).
npm test --silent >/dev/null

mkdir -p dist
rm -f "$OUT"
FILES="package.json README.md LICENSE CHANGELOG.md themes assets/icon.png"
[ -d assets/screenshots ] && FILES="$FILES assets/screenshots"  # shown by the README
# shellcheck disable=SC2086
zip -q -r "$OUT" $FILES -x '*.DS_Store'
echo "$OUT"
