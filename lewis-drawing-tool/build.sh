#!/usr/bin/env bash
# Package src/ as a SCORM 1.2 zip. imsmanifest.xml must sit at the zip root,
# so everything is zipped from inside a staging copy of src/ rather than from
# the project root.
#
# The release number in VERSION is stamped into the copy of index.html that
# goes in the zip: the "version N" label in the top bar, and ?v=N on every
# script and stylesheet link. A new number means new URLs, so neither the LMS
# nor the browser can keep serving the files of an earlier upload. Bump
# VERSION for every zip you hand out.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
version="$(tr -d '[:space:]' < "$here/VERSION")"
name="${1:-lewis-drawing-tool-v$version}"
out="$here/dist/$name.zip"

command -v zip >/dev/null || { echo "zip is not installed" >&2; exit 1; }
grep -q '?v=dev' "$here/src/index.html" || { echo "index.html has no ?v=dev links to stamp" >&2; exit 1; }

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
cp -R "$here/src/." "$stage/"
# -i.bak works with both GNU and BSD (macOS) sed
sed -i.bak -e "s/?v=dev/?v=$version/g" -e "s/version dev/version $version/" "$stage/index.html"
rm -f "$stage/index.html.bak"

mkdir -p "$here/dist"
rm -f "$out"
( cd "$stage" && zip -rq "$out" . -x '.*' -x '*/.*' -x '*.DS_Store' )

echo "built $out (version $version)"
unzip -l "$out" | tail -n +4 | head -n -2
