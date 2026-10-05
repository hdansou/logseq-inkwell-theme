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
# The marketplace requires an image: no release without a light and a dark screenshot.
ls assets/screenshots/*light* >/dev/null 2>&1 && ls assets/screenshots/*dark* >/dev/null 2>&1 \
  || { echo "no light and dark screenshots in assets/screenshots (shown by the README); add them before a release" >&2; exit 1; }
FILES="package.json index.html README.md LICENSE CHANGELOG.md themes assets/icon.png assets/screenshots"
# shellcheck disable=SC2086
zip -q -r "$OUT" $FILES -x '*.DS_Store'
echo "$OUT"
